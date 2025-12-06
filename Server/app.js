require("dotenv").config()
const express = require("express")
const http = require("http")
const cors = require("cors")
const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")

const authRouter = require("./routes/auth")

const app = express()
app.use(cors())
app.use(express.json())
app.use("/auth", authRouter)

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "empire_dice"
})

io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error("no token"))
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        socket.user = decoded
        next()
    } catch (err) {
        return next(new Error("auth fail"))
    }
})

io.on("connection", (socket) => {

    socket.on("createRoom", async () => {
        try {
            const userId = socket.user.user_id
            const [result] = await pool.query(
                "INSERT INTO game_sessions (player1_id, status, created_at) VALUES (?, 'waiting', NOW())",
                [userId]
            )
            const sessionId = result.insertId.toString()
            socket.join(sessionId)
            socket.emit("roomCreated", sessionId)
        } catch (err) {
            socket.emit("roomError", "fail")
        }
    })

    socket.on("joinRoom", async ({ sessionId }) => {
        const userId = socket.user.user_id
        socket.join(sessionId)

        const [rows] = await pool.query(
            "SELECT * FROM game_sessions WHERE session_id=?",
            [sessionId]
        )
        const session = rows[0]

        if (!session.player1_id) {
            await pool.query("UPDATE game_sessions SET player1_id=? WHERE session_id=?", [userId, sessionId])
        } else if (!session.player2_id) {
            await pool.query("UPDATE game_sessions SET player2_id=? WHERE session_id=?", [userId, sessionId])
        }

        const [updated] = await pool.query(
            "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
            [sessionId]
        )
        io.to(sessionId).emit("players", updated[0])
        socket.emit("joinedRoom", sessionId)

        if (updated[0].player1_id && updated[0].player2_id) {
            await pool.query("INSERT INTO player_states (session_id, user_id) VALUES (?, ?)", [sessionId, updated[0].player1_id])
            await pool.query("INSERT INTO player_states (session_id, user_id) VALUES (?, ?)", [sessionId, updated[0].player2_id])
            io.to(sessionId).emit("gameStart")
            await pool.query("UPDATE game_sessions SET status='in_progress', current_turn=? WHERE session_id=?", [updated[0].player1_id, sessionId])
            io.to(sessionId).emit("turnChange", updated[0].player1_id)
        }
    })

    socket.on("rollDice", async ({ sessionId }) => {

        const [rows] = await pool.query("SELECT player1_id, player2_id, current_turn FROM game_sessions WHERE session_id=?", [sessionId])
        const session = rows[0]
        if (!session) return

        const [playerRows] = await pool.query("SELECT * FROM player_states WHERE session_id=? AND user_id=?", [sessionId, socket.user.user_id])
        const player = playerRows[0]

        if (player.turn_skip_count > 0) {
            await pool.query("UPDATE player_states SET turn_skip_count = turn_skip_count - 1 WHERE state_id=?", [player.state_id])
            const nextTurn = session.current_turn === session.player1_id ? session.player2_id : session.player1_id
            await pool.query("UPDATE game_sessions SET current_turn=? WHERE session_id=?", [nextTurn, sessionId])
            io.to(sessionId).emit("turnChange", nextTurn)
            return
        }

        if (session.current_turn !== socket.user.user_id) return

        const dice = Math.floor(Math.random() * 6) + 1
        io.to(sessionId).emit("dice", dice)

        const newPos = (player.board_position + dice) % 20
        await pool.query("UPDATE player_states SET board_position=? WHERE state_id=?", [newPos, player.state_id])

        const [tileRows] = await pool.query("SELECT tile_type, value FROM board_tiles WHERE index_pos=?", [newPos])
        const tile = tileRows[0]
        io.to(sessionId).emit("tileEvent", tile)

        let tileType = tile.tile_type
        let ownerId = tile.value
        let coinChange = 0

        if (tileType === "무인도") {
            await pool.query("UPDATE player_states SET turn_skip_count = 2 WHERE state_id=?", [player.state_id])
        }

        else if (tileType === "침묵") {
            await pool.query("UPDATE player_states SET silence_count = 2 WHERE state_id=?", [player.state_id])
        }

        else if (tileType === "출발") {
            const [owned] = await pool.query("SELECT tile_type FROM board_tiles WHERE value=?", [socket.user.user_id])
            let sum = 0
            for (const t of owned) {
                if (t.tile_type === "약소국") sum += 1
                else if (t.tile_type === "강대국") sum += 5
            }
            coinChange = sum

            const [weaponList] = await pool.query("SELECT weapon_id FROM weapons ORDER BY RAND() LIMIT 1")
            const wid = weaponList[0].weapon_id

            await pool.query("INSERT INTO player_weapons (session_id, user_id, weapon_id) VALUES (?, ?, ?)", [sessionId, socket.user.user_id, wid])
            const [inventory] = await pool.query("SELECT p.weapon_id, w.name, w.effect_type, w.value FROM player_weapons p JOIN weapons w ON p.weapon_id=w.weapon_id WHERE p.session_id=? AND p.user_id=?", [sessionId, socket.user.user_id])
            io.to(sessionId).emit("weaponUpdate", inventory)
        }

        else if (tileType === "강탈") {
            const [enemyStates] = await pool.query("SELECT user_id FROM player_states WHERE session_id=? AND user_id<>?", [sessionId, socket.user.user_id])
            if (enemyStates.length > 0) {
                const enemyId = enemyStates[0].user_id
                const [enemyTiles] = await pool.query("SELECT index_pos FROM board_tiles WHERE value=? AND tile_type IN ('약소국','강대국')", [enemyId])
                if (enemyTiles.length > 0) {
                    const r = enemyTiles[Math.floor(Math.random() * enemyTiles.length)]
                    await pool.query("UPDATE board_tiles SET value=? WHERE index_pos=?", [socket.user.user_id, r.index_pos])
                    io.to(sessionId).emit("stealLand", { stolenIndex: r.index_pos })
                }
            }
        }

        else if (tileType === "약소국" || tileType === "강대국") {
            const price = tileType === "약소국" ? 5 : 10
            const toll = tileType === "약소국" ? 2 : 5

            if (ownerId === 0) {
                if (player.coin >= price) {
                    coinChange = -price
                    await pool.query("UPDATE board_tiles SET value=? WHERE index_pos=?", [socket.user.user_id, newPos])
                }
            } else if (ownerId !== socket.user.user_id) {
                coinChange = -toll
                await pool.query("UPDATE player_states SET coin = coin + ? WHERE session_id=? AND user_id=?", [toll, sessionId, ownerId])
            }
        }

        await pool.query("UPDATE player_states SET coin = coin + ? WHERE state_id=?", [coinChange, player.state_id])

        const [updatedStates] = await pool.query("SELECT user_id, board_position, coin, empire_hp, turn_skip_count, silence_count, shield_count FROM player_states WHERE session_id=?", [sessionId])
        io.to(sessionId).emit("stateUpdate", updatedStates)

        for (const p of updatedStates) {
            if (p.coin <= 0) {
                await pool.query("UPDATE game_sessions SET status='finished', winner_id=? WHERE session_id=?", [socket.user.user_id, sessionId])
                io.to(sessionId).emit("gameEnd", { winner: socket.user.user_id })
                return
            }
        }

        const nextTurn = session.current_turn === session.player1_id ? session.player2_id : session.player1_id
        await pool.query("UPDATE game_sessions SET current_turn=? WHERE session_id=?", [nextTurn, sessionId])
        io.to(sessionId).emit("turnChange", nextTurn)
    })

    socket.on("useWeapon", async ({ sessionId, weaponId }) => {

        const userId = socket.user.user_id

        const [ownRows] = await pool.query("SELECT id FROM player_weapons WHERE session_id=? AND user_id=? AND weapon_id=? LIMIT 1", [sessionId, userId, weaponId])
        if (ownRows.length === 0) return
        const delId = ownRows[0].id

        const [weaponRows] = await pool.query("SELECT effect_type, value FROM weapons WHERE weapon_id=?", [weaponId])
        const weapon = weaponRows[0]

        const [meRows] = await pool.query("SELECT * FROM player_states WHERE session_id=? AND user_id=?", [sessionId, userId])
        const me = meRows[0]

        const [enemyRows] = await pool.query("SELECT * FROM player_states WHERE session_id=? AND user_id<>?", [sessionId, userId])
        if (enemyRows.length === 0) return
        const enemy = enemyRows[0]

        let damage = 0
        let shieldUsed = false

        if (weapon.effect_type === "shield") {
            await pool.query("UPDATE player_states SET shield_count=shield_count+1 WHERE state_id=?", [me.state_id])
        } else {
            if (weapon.effect_type === "sword") damage = 1
            if (weapon.effect_type === "bow") damage = 3
            if (weapon.effect_type === "bomb") damage = 5

            if (enemy.shield_count > 0) {
                shieldUsed = true
                await pool.query("UPDATE player_states SET shield_count=shield_count-1 WHERE state_id=?", [enemy.state_id])
            } else {
                await pool.query("UPDATE player_states SET empire_hp=empire_hp-? WHERE state_id=?", [damage, enemy.state_id])
            }
        }

        await pool.query("DELETE FROM player_weapons WHERE id=?", [delId])

        const [states] = await pool.query("SELECT user_id, board_position, coin, empire_hp, turn_skip_count, silence_count, shield_count FROM player_states WHERE session_id=?", [sessionId])
        io.to(sessionId).emit("stateUpdate", states)

        io.to(sessionId).emit("weaponUsed", { userId, weaponId, damage, shieldUsed })

        for (const p of states) {
            if (p.empire_hp <= 0) {
                await pool.query("UPDATE game_sessions SET status='finished', winner_id=? WHERE session_id=?", [userId, sessionId])
                io.to(sessionId).emit("gameEnd", { winner: userId })
                return
            }
        }
    })

    socket.on("disconnect", () => {})
})

app.get("/test", (req, res) => {
    res.sendFile(__dirname + "/test.html")
})

server.listen(3000, () => {
    console.log("server 3000")
})
