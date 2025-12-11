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

// 테스트 페이지
app.get("/test", (req, res) => {
    res.sendFile(path.join(__dirname, "test.html"))
})

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

// DB 연결
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "empiredice"
})

console.log("MySQL Pool Connected!")

// WebSocket 연결
wss.on("connection", (ws) => {
    console.log(">> WebSocket Client Connected")
    console.log(">> Connected Clients:", wss.clients.size)

    ws.on("close", () => {
        console.log(">> WebSocket Client Disconnected")
    })

    ws.on("message", async (raw) => {

        let msg
        try {
            msg = JSON.parse(raw)
        } catch (e) {
            console.log("JSON Parse Error:", e)
            return
        }

        const type = msg.type
        console.log(">> MESSAGE:", msg)

        // ------------------------------------------------------
        // AUTH
        // ------------------------------------------------------
        if (type === "auth") {
            try {
                const decoded = jwt.verify(msg.token, process.env.JWT_SECRET)
                ws.user = decoded

                console.log(">> AUTH OK:", decoded.user_id)
                ws.send(JSON.stringify({
                    type: "auth_ok",
                    userId: decoded.user_id
                }))
            } catch (e) {
                ws.send(JSON.stringify({ type: "auth_fail" }))
            }
            return
        }

        // ------------------------------------------------------
        // CREATE ROOM
        // ------------------------------------------------------
        if (type === "createRoom") {
            const userId = ws.user.user_id

            const [result] = await pool.query(
                "INSERT INTO game_sessions (player1_id, status, created_at) VALUES (?,'waiting',NOW())",
                [userId]
            )

            ws.sessionId = result.insertId.toString()

            ws.send(JSON.stringify({
                type: "roomCreated",
                sessionId: ws.sessionId
            }))

            console.log("ROOM CREATED:", ws.sessionId)
            return
        }

        // ------------------------------------------------------
        // JOIN ROOM
        // ------------------------------------------------------
        if (type === "joinRoom") {
            const sessionId = msg.sessionId
            const userId = ws.user.user_id

            await pool.query(
                "UPDATE game_sessions SET player2_id=?, status='waiting' WHERE session_id=?",
                [userId, sessionId]
            )

            ws.sessionId = sessionId

            ws.send(JSON.stringify({
                type: "roomJoined",
                sessionId
            }))

            console.log("USER JOINED ROOM:", sessionId)
            return
        }

        // ------------------------------------------------------
        // DELETE ROOM (취소 버튼)
        // ------------------------------------------------------
        if (type === "deleteRoom") {
            const sessionId = msg.sessionId

            console.log(">> DELETE ROOM:", sessionId)

            await pool.query(
                "DELETE FROM game_sessions WHERE session_id=?",
                [sessionId]
            )

            ws.send(JSON.stringify({
                type: "roomDeleted",
                sessionId
            }))

            ws.sessionId = null
            return
        }
    })
})


// ------------------------------------------------------
// 방 리스트 API (Unity에서 GET 요청으로 사용 중)
// ------------------------------------------------------
app.get("/rooms", async (req, res) => {
    const [rows] = await pool.query(
        "SELECT session_id, player1_id, player2_id FROM game_sessions"
    )

    const roomList = rows.map(r => ({
        session_id: r.session_id,
        player_count: (r.player1_id ? 1 : 0) + (r.player2_id ? 1 : 0)
    }))

    res.json(roomList)
})


// ------------------------------------------------------
// 서버 시작
// ------------------------------------------------------
server.listen(3000, () => console.log("SERVER STARTED ON PORT 3000"))
