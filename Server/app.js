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

const games = new Map();

// === 룸 목록에 "현재 살아있는 waiting 방"만 보여주기 위한 set ===
const activeWaitingSessions = new Set();

// === 타일 인덱스(0=출발, 5=무인도, 10=침묵, 15=강탈 기준) ===
const WEAPON_TILES = [3, 8, 13, 18];
const WEAPON_ID = 1;
const MAX_WEAPON = 2;

const SPECIAL_TILES = {
  island: [5],   // 무인도: 밟은 플레이어 1턴 쉬기
  silence: [10], // 침묵: 상대 1턴 쉬기
  steal: [15],   // 강탈: 상대 무기카드 1개 강탈
};

// ---------------- helpers ----------------
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

function otherPlayer(pid) {
  return pid === 1 ? 2 : 1;
}

function isIn(tileIndex, arr) {
  return Array.isArray(arr) && arr.includes(tileIndex);
}

async function ensureSchema() {
  // uq_player_weapon이 없으면 만들어줌(있으면 에러 -> 무시)
  try {
    await pool.query(
      "CREATE UNIQUE INDEX uq_player_weapon ON player_weapons(session_id, user_id, weapon_id)"
    );
    console.log("[DB] created index uq_player_weapon");
  } catch (e) {
    // ER_DUP_KEYNAME / ER_CANT_DROP_FIELD_OR_KEY 등 무시
  }
}

async function hydrateActiveWaitingSessions() {
  // 서버 재시작해도 "최근 생성된 waiting 방"은 다시 목록에 보이게
  // (너무 오래된 waiting 방은 목록에 안 보이게)
  try {
    const [rows] = await pool.query(
      `SELECT session_id
       FROM game_sessions
       WHERE status='waiting'
         AND player2_id IS NULL
         AND created_at > (NOW() - INTERVAL 6 HOUR)`
    );
    rows.forEach((r) => activeWaitingSessions.add(String(r.session_id)));
    console.log(`[rooms] hydrated waiting sessions: ${activeWaitingSessions.size}`);
  } catch (e) {
    console.warn("[rooms] hydrate failed:", e.message);
  }
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

async function getWeaponCount(sessionId, userId) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(`count`),0) AS cnt FROM player_weapons WHERE session_id=? AND user_id=? AND weapon_id=?",
    [sessionId, userId, WEAPON_ID]
  );
  return Number(rows?.[0]?.cnt ?? 0);
}

async function setWeaponCount(sessionId, userId, count) {
  if (count <= 0) {
    await pool.query(
      "DELETE FROM player_weapons WHERE session_id=? AND user_id=? AND weapon_id=?",
      [sessionId, userId, WEAPON_ID]
    );
    return 0;
  }

  await pool.query(
    `INSERT INTO player_weapons (session_id, user_id, weapon_id, \`count\`)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE \`count\`=?`,
    [sessionId, userId, WEAPON_ID, count, count]
  );
  return count;
}

async function addWeaponCard(sessionId, userId) {
  const cur = await getWeaponCount(sessionId, userId);
  const next = Math.min(cur + 1, MAX_WEAPON);
  if (next !== cur) await setWeaponCount(sessionId, userId, next);
  return next;
}

async function decHp(sessionId, playerId, amount) {
  const col = playerId === 1 ? "player1_hp" : "player2_hp";
  await pool.query(
    `UPDATE game_sessions SET ${col} = GREATEST(${col} - ?, 0) WHERE session_id=?`,
    [amount, sessionId]
  );

  const [rows] = await pool.query(
    `SELECT player1_hp, player2_hp FROM game_sessions WHERE session_id=?`,
    [sessionId]
  );
  if (!rows || rows.length === 0) return null;
  return playerId === 1 ? rows[0].player1_hp : rows[0].player2_hp;
}

async function getSessionRow(sessionId) {
  const [rows] = await pool.query(
    "SELECT session_id, status, winner_id, player1_id, player2_id, player1_hp, player2_hp FROM game_sessions WHERE session_id=?",
    [sessionId]
  );
  return rows[0] || null;
}

async function endGameIfNeeded(sessionId, game) {
  const row = await getSessionRow(sessionId);
  if (!row) return false;

  const p1hp = Number(row.player1_hp ?? 0);
  const p2hp = Number(row.player2_hp ?? 0);
  if (p1hp > 0 && p2hp > 0) return false;

  const winnerPid = p1hp <= 0 ? 2 : 1;
  const winnerUserId = winnerPid === 1 ? row.player1_id : row.player2_id;

  await pool.query(
    "UPDATE game_sessions SET winner_id=?, status='finished' WHERE session_id=?",
    [winnerUserId, sessionId]
  );

  if (game) game.ended = true;
  broadcast(sessionId, { type: "gameOver", winnerId: winnerPid });
  return true;
}

async function ensurePlayerState(sessionId, userId) {
  await pool.query(
    `INSERT INTO player_states (session_id, user_id, empire_hp, coin, board_position)
     VALUES (?, ?, 5, 0, 0)
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [sessionId, userId]
  );
}


function advanceTurnWithSkip(sessionId, game, nextTurn) {
  for (let i = 0; i < 2; i++) {
    if (game.skipTurns[nextTurn] > 0) {
      game.skipTurns[nextTurn] -= 1;
      broadcast(sessionId, { type: "turnSkipped", playerId: nextTurn });
      nextTurn = otherPlayer(nextTurn);
      continue;
    }
    break;
  }

  game.turn = nextTurn;
  broadcast(sessionId, { type: "turnStart", playerId: game.turn });
}

// ---------------- websocket ----------------
wss.on("connection", (ws) => {
  ws.on("close", async () => {
    // 방 만든 사람이 나가면(대기중이면) 방 삭제
    try {
      if (ws.createdSessionId) {
        activeWaitingSessions.delete(ws.createdSessionId);
        await pool.query(
          "DELETE FROM game_sessions WHERE session_id=? AND status='waiting' AND player2_id IS NULL",
          [ws.createdSessionId]
        );
      }
    } catch {}
  });

  ws.on("message", async (raw) => {
    try {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      const { type } = msg;

      if (type !== "auth" && !ws.user) {
        send(ws, { type: "need_auth" });
        return;
      }

      if (type === "auth") {
        try {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          ws.user = decoded;
          send(ws, { type: "auth_ok", userId: decoded.user_id });
        } catch {
          send(ws, { type: "auth_fail" });
        }
        return;
      }

      if (type === "createRoom") {
        const userId = ws.user.user_id;

        const [result] = await pool.query(
          "INSERT INTO game_sessions (player1_id, status, player1_hp, player2_hp, created_at) VALUES (?, 'waiting', 5, 5, NOW())",
          [userId]
        );

        const sid = String(result.insertId);
        ws.sessionId = sid;
        ws.createdSessionId = sid;

        activeWaitingSessions.add(sid);

        send(ws, { type: "roomCreated", sessionId: sid });
        return;
      }

      if (type === "joinRoom") {
        const sessionId = String(msg.sessionId ?? "");
        const userId = ws.user.user_id;
        if (!sessionId) return;

        const [rows] = await pool.query(
          "SELECT * FROM game_sessions WHERE session_id=?",
          [sessionId]
        );
        if (rows.length === 0) return;

        const room = rows[0];
        if (room.status !== "waiting" || room.player2_id) return;

        await pool.query(
          "UPDATE game_sessions SET player2_id=?, status='in_progress' WHERE session_id=?",
          [userId, sessionId]
        );

        ws.sessionId = sessionId;
        send(ws, { type: "joinSuccess", sessionId });

        activeWaitingSessions.delete(sessionId);

        broadcast(sessionId, { type: "gameStart" });
        return;
      }

      if (type === "deleteRoom") {
        const sessionId = String(msg.sessionId ?? "");
        if (!sessionId) return;

        await pool.query(
          "DELETE FROM game_sessions WHERE session_id=? AND status='waiting' AND player2_id IS NULL",
          [sessionId]
        );

        activeWaitingSessions.delete(sessionId);
        broadcast(sessionId, { type: "roomDeleted", sessionId });
        return;
      }

      if (type === "gameReady") {
        const sessionId = String(msg.sessionId ?? "");
        if (!sessionId) return;
        if (games.has(sessionId)) return;

        const [rows] = await pool.query(
          "SELECT player1_id, player2_id, player1_hp, player2_hp FROM game_sessions WHERE session_id=?",
          [sessionId]
        );
        if (rows.length === 0) return;

        const room = rows[0];
        if (!room.player1_id || !room.player2_id) return;

        await ensurePlayerState(sessionId, room.player1_id);
await ensurePlayerState(sessionId, room.player2_id);
        games.set(sessionId, {
          turn: 1,
          players: { 1: { pos: 0 }, 2: { pos: 0 } },
          territories: {},
          playerUserIds: { 1: room.player1_id, 2: room.player2_id },
          skipTurns: { 1: 0, 2: 0 },
          ended: false,
        });

        // 각 클라에 gameInit
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.playerId = c.user.user_id === room.player1_id ? 1 : 2;
            c.send(JSON.stringify({ type: "gameInit", playerId: c.playerId }));
          }
        });

        broadcast(sessionId, { type: "hpUpdate", playerId: 1, hp: room.player1_hp ?? 5 });
        broadcast(sessionId, { type: "hpUpdate", playerId: 2, hp: room.player2_hp ?? 5 });

        broadcast(sessionId, { type: "turnStart", playerId: 1 });
        return;
      }

      if (type === "rollDice") {
        const sessionId = String(msg.sessionId ?? "");
        const playerId = Number(msg.playerId);
        const game = games.get(sessionId);
        if (!game || game.ended) return;
        if (game.turn !== playerId) return;

        const row = await getSessionRow(sessionId);
        if (!row) return;
        if (row.winner_id != null) {
          game.ended = true;
          return;
        }

        const dice = Math.floor(Math.random() * 6) + 1;
        broadcast(sessionId, { type: "diceResult", playerId, dice });
        return;
      }

      if (type === "moveEnd") {
        const sessionId = String(msg.sessionId ?? "");
        const playerId = Number(msg.playerId);
        const tileIndex = Number(msg.tileIndex);

        const game = games.get(sessionId);
        if (!game || game.ended) return;
        if (![1, 2].includes(playerId)) return;
        if (!Number.isFinite(tileIndex)) return;

        const row0 = await getSessionRow(sessionId);
        if (!row0) return;
        if (row0.winner_id != null) {
          game.ended = true;
          return;
        }

        await ensurePlayerUserIds(game, sessionId);
        game.players[playerId].pos = tileIndex;

        // ====== 무기칸 처리 (여기에서 반드시 증가 + broadcast) ======
        if (WEAPON_TILES.includes(tileIndex)) {
          try {
            const userId = game.playerUserIds[playerId];
            if (!userId) throw new Error("userId missing for playerId=" + playerId);

            const newCount = await addWeaponCard(sessionId, userId);
            broadcast(sessionId, { type: "weaponUpdate", playerId, weaponCount: newCount });
            console.log(`[weapon] session=${sessionId} p${playerId} tile=${tileIndex} -> ${newCount}`);
          } catch (e) {
            console.error("[weapon] failed:", e.message);
          }
        }

        const opp = otherPlayer(playerId);

        // ====== 특수칸: 무인도 ======
        if (isIn(tileIndex, SPECIAL_TILES.island)) {
          game.skipTurns[playerId] += 1;
          broadcast(sessionId, {
            type: "specialResult",
            effect: "island",
            targetPlayerId: playerId,
            success: true,
            fromPlayerId: playerId,
            toPlayerId: playerId,
          });
        }

        // ====== 특수칸: 침묵 ======
        if (isIn(tileIndex, SPECIAL_TILES.silence)) {
          game.skipTurns[opp] += 1;
          broadcast(sessionId, {
            type: "specialResult",
            effect: "silence",
            targetPlayerId: opp,
            success: true,
            fromPlayerId: playerId,
            toPlayerId: opp,
          });
        }

        // ====== 특수칸: 강탈 (상대 무기 1개 빼앗기) ======
        if (isIn(tileIndex, SPECIAL_TILES.steal)) {
          let success = false;
          try {
            const meUserId = game.playerUserIds[playerId];
            const oppUserId = game.playerUserIds[opp];

            const oppCount = await getWeaponCount(sessionId, oppUserId);
            const myCount = await getWeaponCount(sessionId, meUserId);

            if (oppCount > 0 && myCount < MAX_WEAPON) {
              const newOpp = await setWeaponCount(sessionId, oppUserId, oppCount - 1);
              broadcast(sessionId, { type: "weaponUpdate", playerId: opp, weaponCount: newOpp });

              const newMe = await setWeaponCount(sessionId, meUserId, Math.min(myCount + 1, MAX_WEAPON));
              broadcast(sessionId, { type: "weaponUpdate", playerId, weaponCount: newMe });

              success = true;
            }
          } catch (e) {
            console.error("[steal] failed:", e.message);
            success = false;
          }

          broadcast(sessionId, {
            type: "specialResult",
            effect: "steal",
            targetPlayerId: opp,
            success,
            fromPlayerId: opp,
            toPlayerId: playerId,
          });
        }

        // ====== 전투(영토 밟았을 때) ======
        let didBattle = false;
        const ownerId = game.territories[tileIndex];
        if (ownerId && ownerId !== playerId) {
          didBattle = true;

          const attackerId = playerId;
          const defenderId = ownerId;
          const attackerUserId = game.playerUserIds[attackerId];

          let attackerWeapon = 0;
          try {
            attackerWeapon = await getWeaponCount(sessionId, attackerUserId);
          } catch {}

          if (attackerWeapon >= 1) {
            // 무기 1개 사용 -> 상대 HP -1
            const newCount = await setWeaponCount(sessionId, attackerUserId, attackerWeapon - 1);
            broadcast(sessionId, { type: "weaponUpdate", playerId: attackerId, weaponCount: newCount });

            const newHp = await decHp(sessionId, defenderId, 1);
            if (newHp !== null) broadcast(sessionId, { type: "hpUpdate", playerId: defenderId, hp: newHp });

            broadcast(sessionId, { type: "battleResult", winnerId: attackerId });
          } else {
            // 무기 없으면 본인 HP -1
            const newHp = await decHp(sessionId, attackerId, 1);
            if (newHp !== null) broadcast(sessionId, { type: "hpUpdate", playerId: attackerId, hp: newHp });

            broadcast(sessionId, { type: "battleResult", winnerId: defenderId });
          }

          const ended = await endGameIfNeeded(sessionId, game);
          if (ended) return;
        }

        // 전투 없었어도 게임오버 체크(혹시 다른 이유로 0됐을 때)
        if (!didBattle) {
          const ended = await endGameIfNeeded(sessionId, game);
          if (ended) return;
        }

        // 다음 턴 진행(침묵/무인도 skip 반영)
        advanceTurnWithSkip(sessionId, game, otherPlayer(playerId));
        return;
      }

      if (type === "buyTerritory") {
        const sessionId = String(msg.sessionId ?? "");
        const playerId = Number(msg.playerId);
        const tileIndex = Number(msg.tileIndex);

        const game = games.get(sessionId);
        if (!game || game.ended) return;

        const row = await getSessionRow(sessionId);
        if (!row) return;
        if (row.winner_id != null) {
          game.ended = true;
          return;
        }

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

// ---------------- rooms REST ----------------
app.get("/rooms", async (req, res) => {
  try {
    
    await pool.query(`
      DELETE FROM game_sessions
      WHERE status='waiting'
        AND player2_id IS NULL
        AND created_at < (NOW() - INTERVAL 2 HOUR)
    `);

    
    const [rows] = await pool.query(`
      SELECT session_id, player1_id, player2_id
      FROM game_sessions
      WHERE status='waiting'
        AND player2_id IS NULL
      ORDER BY session_id DESC
    `);

    res.json(
      rows.map((r) => ({
        session_id: r.session_id,
        player_count: (r.player1_id ? 1 : 0) + (r.player2_id ? 1 : 0),
      }))
    );
  } catch (e) {
    console.error("[/rooms] error:", e);
    res.status(500).json([]);
  }
});


// ---------------- start ----------------
server.listen(3000, async () => {
  await ensureSchema();
  await hydrateActiveWaitingSessions();
  console.log("SERVER START 3000");
});
