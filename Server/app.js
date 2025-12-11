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

console.log("MySQL Pool Connected!")

// ------------------------------------------------------
// WebSocket 연결
// ------------------------------------------------------
wss.on("connection", (ws) => {
    console.log(">> WebSocket Client Connected")

    ws.on("close", () => {
        console.log(">> WebSocket Client Disconnected")
    })

    ws.on("message", async (raw) => {
        let msg
        try { msg = JSON.parse(raw) }
        catch (e) { console.log("JSON ERR:", e); return }

        const type = msg.type
        console.log(">> MESSAGE:", msg)

        // ------------------------------------------------------
        // AUTH
        // ------------------------------------------------------
        if (type === "auth") {
            try {
                const decoded = jwt.verify(msg.token, process.env.JWT_SECRET)
                ws.user = decoded

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

            return
        }

        // ------------------------------------------------------
        // JOIN ROOM
        // ------------------------------------------------------
        // JOIN ROOM
if (type === "joinRoom") {
    const sessionId = msg.sessionId;
    const userId = ws.user.user_id;

    console.log(">> JOIN ROOM 요청:", sessionId, "user:", userId);

    // 1) 방 정보 조회
    const [rows] = await pool.query(
        "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
        [sessionId]
    );

    if (rows.length === 0) {
        ws.send(JSON.stringify({ type: "joinFail", reason: "RoomNotFound" }));
        return;
    }

    const room = rows[0];

    // 2) 방이 꽉 찼는지 검사
    const count =
        (room.player1_id ? 1 : 0) +
        (room.player2_id ? 1 : 0);

    if (count >= 2) {
        ws.send(JSON.stringify({ type: "joinFail", reason: "RoomFull" }));
        return;
    }

    // 3) player2 자리 배정
    await pool.query(
        "UPDATE game_sessions SET player2_id=?, status='ready' WHERE session_id=?",
        [userId, sessionId]
    );

    ws.sessionId = sessionId;

    ws.send(JSON.stringify({
        type: "joinSuccess",
        sessionId
    }));

    console.log(`USER ${userId} JOINED ROOM ${sessionId}`);

    // 4) 두 명이 모두 입장했는지 다시 확인
    const [updated] = await pool.query(
        "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
        [sessionId]
    );

    const newCount =
        (updated[0].player1_id ? 1 : 0) +
        (updated[0].player2_id ? 1 : 0);

    // 5) 두 명이 되면 게임 시작
    if (newCount === 2) {
        console.log(`>> ROOM ${sessionId} 게임 시작!`);

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.sessionId == sessionId) {
                client.send(JSON.stringify({
                    type: "gameStart",
                    sessionId
                }));
            }
        });
    }

    return;
}


        // ------------------------------------------------------
        // GAME READY (Unity가 dice 씬 로드 후 보내는 메시지)
        // ------------------------------------------------------
        if (type === "gameReady") {
            const sessionId = msg.sessionId

            const [rows] = await pool.query(
                "SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?",
                [sessionId]
            )

            if (rows.length === 0) return

            const room = rows[0]

            // 각 클라이언트에게 playerId 전달
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client.sessionId == sessionId) {

                    const isP1 = (client.user.user_id == room.player1_id)

                    client.send(JSON.stringify({
                        type: "gameInit",
                        playerId: isP1 ? 1 : 2,
                        turn: 1 // 턴은 player1 시작
                    }))
                }
            })

            return
        }

        // ------------------------------------------------------
        // DELETE ROOM
        // ------------------------------------------------------
        if (type === "deleteRoom") {
            const sessionId = msg.sessionId

            await pool.query("DELETE FROM game_sessions WHERE session_id=?", [sessionId])

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
// 방 목록 API
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

server.listen(3000, () => console.log("SERVER STARTED 3000"))
