require("dotenv").config()
const express = require("express")
const http = require("http")
const cors = require("cors")
const WebSocket = require("ws")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")

const authRouter = require("./routes/auth")

const app = express()
app.use(cors())
app.use(express.json())
app.use("/auth", authRouter)

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "empiredice"
})

const games = new Map()

// 무기 카드 타일
const WEAPON_TILES = [2, 7, 12, 17]

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    // 1) JSON 파싱
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // 2) 전체 핸들러 안전망
    try {
      const { type } = msg;

      // auth 외 모든 요청은 인증 필요
      if (type !== "auth" && !ws.user) {
        ws.send(JSON.stringify({ type: "need_auth" }));
        return;
      }

      // ================= AUTH =================
      if (type === "auth") {
        try {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          ws.user = decoded;
          ws.send(JSON.stringify({ type: "auth_ok", userId: decoded.user_id }));
        } catch {
          ws.send(JSON.stringify({ type: "auth_fail" }));
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

        ws.send(
          JSON.stringify({
            type: "roomCreated",
            sessionId: ws.sessionId,
          })
        );
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

        // ✅ DB enum에 맞게 in_progress 사용
        await pool.query(
          "UPDATE game_sessions SET player2_id=?, status='in_progress' WHERE session_id=?",
          [userId, sessionId]
        );

        ws.sessionId = sessionId;
        ws.send(JSON.stringify({ type: "joinSuccess", sessionId }));

        // 같은 sessionId의 클라이언트들에게 gameStart 브로드캐스트
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(JSON.stringify({ type: "gameStart" }));
          }
        });
        return;
      }

      // ================= GAME READY =================
      if (type === "gameReady") {
        const { sessionId } = msg;
        if (games.has(sessionId)) return;

        const [rows] = await pool.query(
          "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
          [sessionId]
        );
        if (rows.length === 0) return;

        const room = rows[0];

        games.set(sessionId, {
          turn: 1,
          players: {
            1: { pos: 0 },
            2: { pos: 0 },
          },
          territories: {},
        });

        // 각 클라이언트에 playerId 지정 + gameInit
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.playerId = c.user.user_id === room.player1_id ? 1 : 2;
            c.send(
              JSON.stringify({
                type: "gameInit",
                playerId: c.playerId,
              })
            );
          }
        });

        // 첫 턴 시작
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(
              JSON.stringify({
                type: "turnStart",
                playerId: 1,
              })
            );
          }
        });
        return;
      }

      // ================= DICE =================
      if (type === "rollDice") {
        const { sessionId, playerId } = msg;
        const game = games.get(sessionId);
        if (!game || game.turn !== playerId) return;

        const dice = Math.floor(Math.random() * 6) + 1;

        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(
              JSON.stringify({
                type: "diceResult",
                playerId,
                dice,
              })
            );
          }
        });
        return;
      }

      // ================= MOVE END =================
      if (type === "moveEnd") {
        const { sessionId, playerId, tileIndex } = msg;
        const game = games.get(sessionId);
        if (!game) return;

        game.players[playerId].pos = tileIndex;

        // 무기 처리: 에러 나도 턴은 진행되게
        if (WEAPON_TILES.includes(tileIndex)) {
            try {
            // (임시) DB컬럼 없으면 여기서 에러 날 수 있음
            const column = playerId === 1 ? "player1_weapon" : "player2_weapon";

            await pool.query(
                `UPDATE game_sessions
                SET ${column} = LEAST(${column} + 1, 2)
                WHERE session_id=?`,
                [sessionId]
            );

            const [[row]] = await pool.query(
                "SELECT player1_weapon, player2_weapon FROM game_sessions WHERE session_id=?",
                [sessionId]
            );

            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
                c.send(JSON.stringify({
                    type: "weaponUpdate",
                    playerId,
                    weaponCount: playerId === 1 ? row.player1_weapon : row.player2_weapon
                }));
                }
            });
            } catch (err) {
            console.error("[MOVEEND] weapon update failed:", err.message);
            // 여기서 그냥 넘어감 (턴은 계속 진행)
            }
        }

        // 턴 교대는 무조건 실행
        game.turn = playerId === 1 ? 2 : 1;

        wss.clients.forEach(c => {
            if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(JSON.stringify({ type: "turnStart", playerId: game.turn }));
            }
        });

        return;
    }

      // ================= BUY TERRITORY =================
      if (type === "buyTerritory") {
        const { sessionId, playerId, tileIndex } = msg;
        const game = games.get(sessionId);
        if (!game || game.territories[tileIndex]) return;

        game.territories[tileIndex] = playerId;

        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(
              JSON.stringify({
                type: "territoryBought",
                playerId,
                tileIndex,
              })
            );
          }
        });
        return;
      }

      // (원하면) deleteRoom 등도 여기에서 추가로 처리 가능

    } catch (err) {
      // 서버가 "꺼지지" 않고 에러를 남기게 함
      console.error("[WS] handler error:", err);
      try {
        ws.send(JSON.stringify({ type: "server_error", message: err.message }));
      } catch {}
    }
  });
});

// ================= ROOM LIST =================
app.get("/rooms", async (req, res) => {
    const [rows] = await pool.query(
        "SELECT session_id, player1_id, player2_id FROM game_sessions WHERE status='waiting'"
    )

    res.json(rows.map(r => ({
        session_id: r.session_id,
        player_count: (r.player1_id ? 1 : 0) + (r.player2_id ? 1 : 0)
    })))
})

server.listen(3000, () => console.log("SERVER START 3000"))
