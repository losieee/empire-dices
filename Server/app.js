require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const authRouter = require("./routes/auth");  

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);             


const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "empire_dice"
});


io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("토큰 없음"));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        return next(new Error("JWT 인증 실패"));
    }
});

io.on("connection", (socket) => {
    console.log("socket connected id:", socket.id, "user:", socket.user);

    socket.on("createRoom", async () => {
        console.log("createRoom 요청 받음");
        try {
            const userId = socket.user.user_id;

            const [result] = await pool.query(
                "INSERT INTO game_sessions (player1_id, status, created_at) VALUES (?, 'waiting', NOW())",
                [userId]
            );

            const sessionId = result.insertId.toString();
            socket.join(sessionId);
            socket.emit("roomCreated", sessionId);
        } catch (err) {
            socket.emit("roomError", "방 생성 실패");
        }
    });

    socket.on("joinRoom", async ({ sessionId }) => {
        console.log("joinRoom 요청:", sessionId);
        const userId = socket.user.user_id;
        socket.join(sessionId);

        const [rows] = await pool.query("SELECT * FROM game_sessions WHERE session_id=?", [sessionId]);
        const session = rows[0];

        if (!session.player1_id) {
            await pool.query("UPDATE game_sessions SET player1_id=? WHERE session_id=?", [userId, sessionId]);
        } else if (!session.player2_id) {
            await pool.query("UPDATE game_sessions SET player2_id=? WHERE session_id=?", [userId, sessionId]);
        }

        const [updatedRows] = await pool.query("SELECT player1_id, player2_id FROM game_sessions WHERE session_id=?", [sessionId]);
        io.to(sessionId).emit("players", updatedRows[0]);
        socket.emit("joinedRoom", sessionId);

        if (updatedRows[0].player1_id && updatedRows[0].player2_id) {

    await pool.query(
        "INSERT INTO player_states (session_id, user_id) VALUES (?, ?)",
        [sessionId, updatedRows[0].player1_id]
    );
    await pool.query(
        "INSERT INTO player_states (session_id, user_id) VALUES (?, ?)",
        [sessionId, updatedRows[0].player2_id]
    );

    console.log("게임 시작!");
    io.to(sessionId).emit("gameStart");

    await pool.query(
        "UPDATE game_sessions SET status='in_progress', current_turn=? WHERE session_id=?",
        [updatedRows[0].player1_id, sessionId]
    );

    io.to(sessionId).emit("turnChange", updatedRows[0].player1_id);
}

    });

    socket.on("rollDice", async ({ sessionId }) => {
    console.log("rollDice 요청 session:", sessionId);

    const [rows] = await pool.query(
        "SELECT player1_id, player2_id, current_turn FROM game_sessions WHERE session_id=?",
        [sessionId]
    );
    const session = rows[0];

    if (!session) {
        console.log("세션 없음");
        return socket.emit("roomError", "세션 없음");
    }

    if (session.current_turn !== socket.user.user_id) {
        console.log("내 턴 아님");
        return socket.emit("notYourTurn");
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    console.log("dice:", dice);
    io.to(sessionId).emit("dice", dice);

    const [players] = await pool.query(
        "SELECT * FROM player_states WHERE session_id = ? AND user_id = ?",
        [sessionId, socket.user.user_id]
    );
    const player = players[0];

    const newPos = (player.board_position + dice) % 20;
    await pool.query(
        "UPDATE player_states SET board_position=? WHERE state_id=?",
        [newPos, player.state_id]
    );

    const [allStates] = await pool.query(
        "SELECT user_id, board_position, coin, empire_hp FROM player_states WHERE session_id = ?",
        [sessionId]
    );
    io.to(sessionId).emit("stateUpdate", allStates);

    const [tileRows] = await pool.query(
        "SELECT tile_type, value FROM board_tiles WHERE index_pos=?",
        [newPos]
    );
    const tile = tileRows[0];

    io.to(sessionId).emit("tileEvent", tile);
    console.log("타일 이벤트:", tile);

    const nextTurn =
        session.current_turn === session.player1_id ? session.player2_id : session.player1_id;

    await pool.query(
        "UPDATE game_sessions SET current_turn=? WHERE session_id=?",
        [nextTurn, sessionId]
    );

    io.to(sessionId).emit("turnChange", nextTurn);
});


    socket.on("disconnect", () => {
        console.log("disconnect:", socket.id);
    });
});

app.get("/test", (req, res) => {
    res.sendFile(__dirname + "/test.html");
});


server.listen(3000, () => {
    console.log("Socket.io 서버 실행중 3000");
});
