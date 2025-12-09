require("dotenv").config()
const express = require("express")
const http = require("http")
const cors = require("cors")
const WebSocket = require("ws")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")
const path = require("path")
const authRouter = require("./routes/auth")

const app = express()
app.use(cors())
app.use(express.json())
app.use("/auth", authRouter)

app.get("/test", (req, res) => {
    res.sendFile(path.join(__dirname, "test.html"))
})

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "empiredice"
})

wss.on("connection", (ws) => {
    console.log(">> WebSocket Client Connected")
    console.log(">> Connected Clients:", wss.clients.size)

    ws.on("close", () => {
        console.log(">> WebSocket Client Disconnected")
    })

    ws.on("message", async (raw) => {
        console.log(">> Message Received:", raw.toString())

        const msg = JSON.parse(raw)
        const t = msg.type

        if (t === "auth") {
            try {
                const decoded = jwt.verify(msg.token, process.env.JWT_SECRET)
                ws.user = decoded
                console.log(">> AUTH SUCCESS:", decoded.user_id)
                ws.send(JSON.stringify({ type:"auth_ok", userId:decoded.user_id }))
            } catch (e) {
                console.log(">> AUTH FAILED")
                ws.send(JSON.stringify({ type:"auth_fail" }))
            }
        }

        if (t === "reconnect") {
            const sessionId = msg.sessionId
            ws.sessionId = sessionId
            console.log(">> RECONNECT:", sessionId)

            const [states] = await pool.query(
                "SELECT user_id,board_position,coin,empire_hp,shield_count,turn_skip_count,silence_count FROM player_states WHERE session_id=?",
                [sessionId]
            )
            ws.send(JSON.stringify({ type:"stateUpdate", states }))

            const [updatedTiles] = await pool.query(
                "SELECT index_pos,tile_type,value FROM board_tiles WHERE session_id=?",
                [sessionId]
            )
            ws.send(JSON.stringify({ type:"boardSync", tiles:updatedTiles }))

            const [inv] = await pool.query(
                "SELECT p.id,p.weapon_id,w.name,w.effect_type,w.value FROM player_weapons p JOIN weapons w ON p.weapon_id=w.weapon_id WHERE p.session_id=? AND p.user_id=?",
                [sessionId,ws.user.user_id]
            )
            ws.send(JSON.stringify({ type:"weaponUpdate", inventory:inv }))

            const [turn] = await pool.query(
                "SELECT current_turn FROM game_sessions WHERE session_id=?",
                [sessionId]
            )
            ws.send(JSON.stringify({ type:"turnChange", nextTurn:turn[0].current_turn }))
        }

        if (t === "createRoom") {
            const userId = ws.user.user_id
            console.log(">> CREATE ROOM by", userId)

            const [result] = await pool.query(
                "INSERT INTO game_sessions (player1_id,status,created_at) VALUES (?,'waiting',NOW())",
                [userId]
            )
            ws.sessionId = result.insertId.toString()
            ws.send(JSON.stringify({ type:"roomCreated", sessionId:ws.sessionId }))
        }
    })
})

function broadcast(sessionId,payload){
    wss.clients.forEach((c)=>{
        if (c.readyState === WebSocket.OPEN && c.sessionId === sessionId) {
            c.send(JSON.stringify(payload))
        }
    })
}

server.listen(3000,()=>console.log("server 3000"))
