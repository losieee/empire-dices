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

const WEAPON_TILES = [3, 8, 13, 18];
const WEAPON_ID = 1;

function send(ws, obj) {
  ws.send(JSON.stringify(obj));
}

function broadcast(sessionId, obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) c.send(msg);
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

async function getWeaponCount(sessionId, userId) {
  const [rows] = await pool.query(
    "SELECT count FROM player_weapons WHERE session_id=? AND user_id=? AND weapon_id=?",
    [sessionId, userId, WEAPON_ID]
  );
  if (!rows || rows.length === 0) return 0;
  return rows[0].count ?? 0;
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
    `INSERT INTO player_weapons (session_id, user_id, weapon_id, count)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE count=?`,
    [sessionId, userId, WEAPON_ID, count, count]
  );
  return count;
}

async function syncSessionWeapon(sessionId, playerId, weaponCount) {
  const col = playerId === 1 ? "player1_weapon" : "player2_weapon";
  await pool.query(`UPDATE game_sessions SET ${col}=? WHERE session_id=?`, [
    weaponCount,
    sessionId,
  ]);
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

  if (row.winner_id != null) {
    if (game) game.ended = true;
    return true;
  }

  const p1hp = Number(row.player1_hp ?? 0);
  const p2hp = Number(row.player2_hp ?? 0);

  if (p1hp > 0 && p2hp > 0) return false;

  const winnerId = p1hp <= 0 ? 2 : 1;
  const winnerUserId = winnerId === 1 ? row.player1_id : row.player2_id;

  try {
    await pool.query(
      "UPDATE game_sessions SET winner_id=?, status='finished' WHERE session_id=?",
      [winnerUserId, sessionId]
    );
  } catch {
    await pool.query(
      "UPDATE game_sessions SET winner_id=? WHERE session_id=?",
      [winnerUserId, sessionId]
    );
  }

  if (game) game.ended = true;

  broadcast(sessionId, { type: "gameOver", winnerId });
  return true;
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
          "INSERT INTO game_sessions (player1_id, status, created_at) VALUES (?, 'waiting', NOW())",
          [userId]
        );

        ws.sessionId = result.insertId.toString();
        send(ws, { type: "roomCreated", sessionId: ws.sessionId });
        return;
      }

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

        await pool.query(
          "UPDATE game_sessions SET player2_id=?, status='in_progress' WHERE session_id=?",
          [userId, sessionId]
        );

        ws.sessionId = sessionId.toString();
        send(ws, { type: "joinSuccess", sessionId });

        broadcast(sessionId, { type: "gameStart" });
        return;
      }

      if (type === "deleteRoom") {
        const { sessionId } = msg;
        if (!sessionId) return;

        await pool.query(
          "DELETE FROM game_sessions WHERE session_id=? AND status='waiting'",
          [sessionId]
        );

        broadcast(sessionId, { type: "roomDeleted", sessionId });
        return;
      }

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

        games.set(sessionId, {
          turn: 1,
          players: { 1: { pos: 0 }, 2: { pos: 0 } },
          territories: {},
          playerUserIds: { 1: room.player1_id, 2: room.player2_id },
          ended: false,
        });

        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.playerId = c.user.user_id === room.player1_id ? 1 : 2;
            c.send(JSON.stringify({ type: "gameInit", playerId: c.playerId }));
          }
        });

        const p1hp = room.player1_hp ?? 5;
        const p2hp = room.player2_hp ?? 5;
        broadcast(sessionId, { type: "hpUpdate", playerId: 1, hp: p1hp });
        broadcast(sessionId, { type: "hpUpdate", playerId: 2, hp: p2hp });

        await endGameIfNeeded(sessionId, games.get(sessionId));

        const game = games.get(sessionId);
        if (!game || game.ended) return;

        broadcast(sessionId, { type: "turnStart", playerId: 1 });
        return;
      }

      if (type === "rollDice") {
        const { sessionId, playerId } = msg;
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
        const { sessionId, playerId, tileIndex } = msg;
        const game = games.get(sessionId);
        if (!game || game.ended) return;

        const row0 = await getSessionRow(sessionId);
        if (!row0) return;
        if (row0.winner_id != null) {
          game.ended = true;
          return;
        }

        await ensurePlayerUserIds(game, sessionId);

        game.players[playerId].pos = tileIndex;

        if (WEAPON_TILES.includes(tileIndex)) {
          try {
            const userId = game.playerUserIds[playerId];

            await pool.query(
              `INSERT INTO player_weapons (session_id, user_id, weapon_id, count)
               VALUES (?, ?, ?, 1)
               ON DUPLICATE KEY UPDATE count = LEAST(count + 1, 2)`,
              [sessionId, userId, WEAPON_ID]
            );

            const weaponCount = await getWeaponCount(sessionId, userId);
            await syncSessionWeapon(sessionId, playerId, weaponCount);

            broadcast(sessionId, { type: "weaponUpdate", playerId, weaponCount });
          } catch (err) {
            console.error("[MOVEEND] weapon gain failed:", err.message);
          }
        }

        const ownerId = game.territories[tileIndex];
        if (ownerId && ownerId !== playerId) {
          const attackerId = playerId;
          const defenderId = ownerId;
          const attackerUserId = game.playerUserIds[attackerId];

          let attackerWeapon = 0;
          try {
            attackerWeapon = await getWeaponCount(sessionId, attackerUserId);
          } catch {
            attackerWeapon = 0;
          }

          if (attackerWeapon >= 1) {
            const newCount = await setWeaponCount(
              sessionId,
              attackerUserId,
              attackerWeapon - 1
            );
            await syncSessionWeapon(sessionId, attackerId, newCount);

            broadcast(sessionId, {
              type: "weaponUpdate",
              playerId: attackerId,
              weaponCount: newCount,
            });

            const newHp = await decHp(sessionId, defenderId, 1);
            if (newHp !== null) {
              broadcast(sessionId, { type: "hpUpdate", playerId: defenderId, hp: newHp });
            }

            broadcast(sessionId, { type: "battleResult", winnerId: attackerId });
          } else {
            const newHp = await decHp(sessionId, attackerId, 1);
            if (newHp !== null) {
              broadcast(sessionId, { type: "hpUpdate", playerId: attackerId, hp: newHp });
            }

            broadcast(sessionId, { type: "battleResult", winnerId: defenderId });
          }

          const ended = await endGameIfNeeded(sessionId, game);
          if (ended) return;
        } else {
          const ended = await endGameIfNeeded(sessionId, game);
          if (ended) return;
        }

        game.turn = playerId === 1 ? 2 : 1;
        broadcast(sessionId, { type: "turnStart", playerId: game.turn });
        return;
      }

      if (type === "buyTerritory") {
        const { sessionId, playerId, tileIndex } = msg;
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
