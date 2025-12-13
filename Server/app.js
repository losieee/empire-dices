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

wss.on("connection", (ws) => {

    ws.on("message", async (raw) => {
        let msg
        try {
            msg = JSON.parse(raw)
        } catch {
            return
        }

        const type = msg.type

        if (type === "auth") {
            try {
                const decoded = jwt.verify(msg.token, process.env.JWT_SECRET)
                ws.user = decoded
                ws.send(JSON.stringify({ type: "auth_ok", userId: decoded.user_id }))
            } catch {
                ws.send(JSON.stringify({ type: "auth_fail" }))
            }
            return
        }

        if (type === "createRoom") {
            const userId = ws.user.user_id

            const [result] = await pool.query(
                "INSERT INTO game_sessions (player1_id, status, created_at) VALUES (?, 'waiting', NOW())",
                [userId]
            )

            ws.sessionId = result.insertId.toString()

            ws.send(JSON.stringify({
                type: "roomCreated",
                sessionId: ws.sessionId
            }))
            return
        }

        if (type === "joinRoom") {
            const sessionId = msg.sessionId
            const userId = ws.user.user_id

            const [rows] = await pool.query(
                "SELECT player1_id, player2_id, status FROM game_sessions WHERE session_id=?",
                [sessionId]
            )

            if (rows.length === 0) {
                ws.send(JSON.stringify({ type: "joinFail" }))
                return
            }

            const room = rows[0]
            if (room.status !== "waiting" || room.player2_id) {
                ws.send(JSON.stringify({ type: "joinFail" }))
                return
            }

            await pool.query(
                "UPDATE game_sessions SET player2_id=?, status='ready' WHERE session_id=?",
                [userId, sessionId]
            )

            ws.sessionId = sessionId

            ws.send(JSON.stringify({ type: "joinSuccess", sessionId }))

            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
                    c.send(JSON.stringify({ type: "gameStart", sessionId }))
                }
            })
            return
        }

        if (type === "gameReady") {
            const sessionId = msg.sessionId
            if (games.has(sessionId)) return

            const [rows] = await pool.query(
                "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
                [sessionId]
            )
            if (rows.length === 0) return

            const room = rows[0]
            if (!room.player1_id || !room.player2_id) return

            games.set(sessionId, {
                turn: 1,
                players: {
                    1: { pos: 0 },
                    2: { pos: 0 }
                }
            })

            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
                    c.playerId = (c.user.user_id === room.player1_id) ? 1 : 2
                    c.send(JSON.stringify({
                        type: "gameInit",
                        playerId: c.playerId
                    }))
                }
            })

            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
                    c.send(JSON.stringify({
                        type: "turnStart",
                        playerId: 1
                    }))
                }
            })
            return
        }

if (type === "rollDice") {
    const sessionId = msg.sessionId
    const playerId = msg.playerId
    const game = games.get(sessionId)

    if (!game || !playerId) {
        console.log("[ROLL] invalid payload", msg)
        return
    }

    if (playerId !== game.turn) {
        console.log("[ROLL] not your turn", playerId, game.turn)
        return
    }

    const dice = Math.floor(Math.random() * 6) + 1
    console.log("[ROLL]", playerId, dice)

    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(JSON.stringify({
                type: "diceResult",
                playerId,
                dice
            }))
        }
    })
}


if (type === "moveEnd") {
    const sessionId = msg.sessionId
    const playerId = msg.playerId
    const game = games.get(sessionId)

    if (!game || !playerId) return

    console.log("[MOVE END]", playerId, msg.tileIndex)

    game.players[playerId].pos = msg.tileIndex
    game.turn = playerId === 1 ? 2 : 1

    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN && c.sessionId == sessionId) {
            c.send(JSON.stringify({
                type: "turnStart",
                playerId: game.turn
            }))
        }
    })
}


    })
})

app.get("/rooms", async (req, res) => {
    const [rows] = await pool.query(
        "SELECT session_id, player1_id, player2_id FROM game_sessions WHERE status='waiting'"
    )

    res.json(rows.map(r => ({
        session_id: r.session_id,
        player_count:
            (r.player1_id ? 1 : 0) +
            (r.player2_id ? 1 : 0)
    })))
})

server.listen(3000, () => console.log("SERVER START 3000"))
