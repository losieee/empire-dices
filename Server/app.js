require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const authRouter = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "empiredice",
});

// in-memory
const games = new Map();

// Unity 보드 기준 무기칸 인덱스
const WEAPON_TILES = [3, 8, 13, 18];
const WEAPON_ID = 1;

function send(ws, obj) {
  ws.send(JSON.stringify(obj));
}

function broadcast(sessionId, obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
      c.send(msg);
    }
  });
}

async function ensurePlayerUserIds(game, sessionId) {
  if (game.playerUserIds) return;

  const [rows] = await pool.query(
    "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
    [sessionId]
  );
  if (rows.length === 0) throw new Error("session not found: " + sessionId);

  game.playerUserIds = {
    1: rows[0].player1_id,
    2: rows[0].player2_id,
  };
}

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    try {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      const { type } = msg;

      // auth 이전 메시지 방지
      if (type !== "auth" && !ws.user) {
        send(ws, { type: "need_auth" });
        return;
      }

      // ================= AUTH =================
      if (type === "auth") {
        try {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          ws.user = decoded;
          send(ws, { type: "auth_ok", userId: decoded.user_id });
        } catch (e) {
          send(ws, { type: "auth_fail" });
        }
        return;
      }

      // ================= CREATE ROOM =================
      if (type === "createRoom") {
        const userId = ws.user.user_id;

        const [result] = await pool.query(
          "INSERT INTO game_sessions (player1_id, status, created_at) VALUES (?, 'waiting', NOW())",
          [userId]
        );

        ws.sessionId = result.insertId.toString();
        send(ws, { type: "roomCreated", sessionId: ws.sessionId });
        return;
      }

      // ================= JOIN ROOM =================
      if (type === "joinRoom") {
        const { sessionId } = msg;
        const userId = ws.user.user_id;

        const [rows] = await pool.query(
          "SELECT * FROM game_sessions WHERE session_id=?",
          [sessionId]
        );
        if (rows.length === 0) return;

        const room = rows[0];
        if (room.status !== "waiting" || room.player2_id) return;

        // ✅ enum에 맞게 in_progress
        await pool.query(
          "UPDATE game_sessions SET player2_id=?, status='in_progress' WHERE session_id=?",
          [userId, sessionId]
        );

        ws.sessionId = sessionId.toString();
        send(ws, { type: "joinSuccess", sessionId });

        // 방에 있는 클라들에게 gameStart
        broadcast(sessionId, { type: "gameStart" });
        return;
      }

      // ================= DELETE ROOM (대기방 취소) =================
      if (type === "deleteRoom") {
        const { sessionId } = msg;
        if (!sessionId) return;

        // 방장이면 waiting 방 삭제(간단 처리)
        await pool.query(
          "DELETE FROM game_sessions WHERE session_id=? AND status='waiting'",
          [sessionId]
        );

        // 세션 소켓들 정리용 메시지(원하면 클라에서 처리)
        broadcast(sessionId, { type: "roomDeleted", sessionId });
        return;
      }

      // ================= GAME READY =================
      if (type === "gameReady") {
        const { sessionId } = msg;
        if (!sessionId) return;

        if (games.has(sessionId)) return;

        const [rows] = await pool.query(
          "SELECT player1_id, player2_id, player1_hp, player2_hp FROM game_sessions WHERE session_id=?",
          [sessionId]
        );
        if (rows.length === 0) return;

        const room = rows[0];

        await pool.query(
          `INSERT INTO player_states (session_id, user_id)
          VALUES (?, ?), (?, ?)
          ON DUPLICATE KEY UPDATE session_id=session_id`,
          [sessionId, room.player1_id, sessionId, room.player2_id]
        );

        // 인메모리 게임 생성 + playerUserIds 보장
        games.set(sessionId, {
          turn: 1,
          players: { 1: { pos: 0 }, 2: { pos: 0 } },
          territories: {},
          playerUserIds: { 1: room.player1_id, 2: room.player2_id },
        });

        // 각 클라에 playerId 설정 + gameInit
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.playerId = c.user.user_id === room.player1_id ? 1 : 2;
            c.send(JSON.stringify({ type: "gameInit", playerId: c.playerId }));
          }
        });

        // ✅ 게임 시작 즉시 HP 브로드캐스트 (그래야 Unity hpUpdate 로그가 뜸)
        // DB에 hp 컬럼이 없으면 여기서 에러 -> 콘솔 확인
        const p1hp = room.player1_hp ?? 5;
        const p2hp = room.player2_hp ?? 5;
        broadcast(sessionId, { type: "hpUpdate", playerId: 1, hp: p1hp });
        broadcast(sessionId, { type: "hpUpdate", playerId: 2, hp: p2hp });

        // 턴 시작
        broadcast(sessionId, { type: "turnStart", playerId: 1 });
        return;
      }

      // ================= DICE =================
      if (type === "rollDice") {
        const { sessionId, playerId } = msg;
        const game = games.get(sessionId);
        if (!game || game.turn !== playerId) return;

        const dice = Math.floor(Math.random() * 6) + 1;
        broadcast(sessionId, { type: "diceResult", playerId, dice });
        return;
      }

      // ================= MOVE END =================
      if (type === "moveEnd") {
        const { sessionId, playerId, tileIndex } = msg;
        const game = games.get(sessionId);
        if (!game) return;

        // ✅ playerUserIds 없으면 복구
        await ensurePlayerUserIds(game, sessionId);

        game.players[playerId].pos = tileIndex;

        // ---- 무기칸이면 무기카드 +1 (DB UPSERT) + weaponUpdate 브로드캐스트
        if (WEAPON_TILES.includes(tileIndex)) {
          try {
            const userId = game.playerUserIds[playerId];

            // ✅ 이게 동작하려면 (session_id,user_id,weapon_id) 유니크키가 필요
            await pool.query(
              `INSERT INTO player_weapons (session_id, user_id, weapon_id, count)
               VALUES (?, ?, ?, 1)
               ON DUPLICATE KEY UPDATE count = LEAST(count + 1, 2)`,
              [sessionId, userId, WEAPON_ID]
            );

            const [[row]] = await pool.query(
              `SELECT count FROM player_weapons
               WHERE session_id=? AND user_id=? AND weapon_id=?`,
              [sessionId, userId, WEAPON_ID]
            );

            const weaponCount = row?.count ?? 0;
            broadcast(sessionId, { type: "weaponUpdate", playerId, weaponCount });
          } catch (err) {
            console.error("[MOVEEND] weapon gain failed:", err.message);
          }
        }

        // 턴 교대
        game.turn = playerId === 1 ? 2 : 1;
        broadcast(sessionId, { type: "turnStart", playerId: game.turn });

        return;
      }

      // ================= BUY TERRITORY =================
      if (type === "buyTerritory") {
        const { sessionId, playerId, tileIndex } = msg;
        const game = games.get(sessionId);
        if (!game) return;

        if (game.territories[tileIndex]) return;
        game.territories[tileIndex] = playerId;

        broadcast(sessionId, { type: "territoryBought", playerId, tileIndex });
        return;
      }
    } catch (err) {
      console.error("[WS] handler error:", err);
    }
  });
});

// ================= ROOM LIST =================
app.get("/rooms", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT session_id, player1_id, player2_id FROM game_sessions WHERE status='waiting'"
  );

  res.json(
    rows.map((r) => ({
      session_id: r.session_id,
      player_count: (r.player1_id ? 1 : 0) + (r.player2_id ? 1 : 0),
    }))
  );
});

server.listen(3000, () => console.log("SERVER START 3000"));
