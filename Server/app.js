require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
app.use(express.static(path.join(__dirname)));

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
});

const { socketAuth } = require("./middlewares/authMiddleware");
const authRoutes = require("./routes/auth");
const pool = require("./pool");

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Empire Dice Server Running");
});

io.use(socketAuth);

io.on("connection", (socket) => {
    console.log("socket connected id:", socket.id, "user:", socket.user);

    socket.on("createRoom", async () => {
        try {
            const [result] = await pool.query(
                "INSERT INTO game_sessions (status, created_at) VALUES ('waiting', NOW())"
            );
            const sessionId = result.insertId.toString();
            socket.join(sessionId);
            socket.emit("roomCreated", sessionId);
        } catch (err) {
            socket.emit("roomError", "방 생성 실패");
        }
    });

    socket.on("joinRoom", async ({ sessionId }) => {
        try {
            const userId = socket.user.user_id;

            const [rows] = await pool.query(
                "SELECT * FROM game_sessions WHERE session_id = ?",
                [sessionId]
            );

            if (rows.length === 0) {
                return socket.emit("joinError", "존재하지 않는 방");
            }

            const room = rows[0];

            if (!room.player1_id) {
                await pool.query(
                    "UPDATE game_sessions SET player1_id = ? WHERE session_id = ?",
                    [userId, sessionId]
                );
            } else if (!room.player2_id && room.player1_id !== userId) {
                await pool.query(
                    "UPDATE game_sessions SET player2_id = ? WHERE session_id = ?",
                    [userId, sessionId]
                );
            } else {
                return socket.emit("joinError", "방 입장 실패");
            }

            socket.join(sessionId);
            socket.emit("joinedRoom", sessionId);

            const [players] = await pool.query(
                "SELECT player1_id, player2_id FROM game_sessions WHERE session_id = ?",
                [sessionId]
            );

            console.log("players now:", players[0]);
            io.to(sessionId).emit("players", players[0]);

            if (players[0].player1_id != null && players[0].player2_id != null) {
                await pool.query(
                    "UPDATE game_sessions SET current_turn = ?, status='in_progress' WHERE session_id = ?",
                    [players[0].player1_id, sessionId]
                );

                console.log("GAME START EMIT");
                io.to(sessionId).emit("gameStart");
            }

        } catch (err) {
            socket.emit("joinError", "방 입장 실패");
        }
    });

    socket.on("rollDice", async ({ sessionId }) => {
        try {
            const userId = socket.user.user_id;

            const [rows] = await pool.query(
                "SELECT player1_id, player2_id, current_turn FROM game_sessions WHERE session_id = ?",
                [sessionId]
            );

            const game = rows[0];

            if (game.current_turn !== userId) {
                return socket.emit("notYourTurn", "너 턴 아님");
            }

            const dice = Math.floor(Math.random() * 6) + 1;
            io.to(sessionId).emit("dice", dice);

            await pool.query(
                "UPDATE player_states SET board_position = board_position + ? WHERE session_id = ? AND user_id = ?",
                [dice, sessionId, userId]
            );

            const [states] = await pool.query(
                "SELECT user_id, board_position, coin, empire_hp FROM player_states WHERE session_id = ?",
                [sessionId]
            );

            io.to(sessionId).emit("stateUpdate", states);

            const nextTurn = game.current_turn === game.player1_id ? game.player2_id : game.player1_id;
            await pool.query(
                "UPDATE game_sessions SET current_turn = ? WHERE session_id = ?",
                [nextTurn, sessionId]
            );

            io.to(sessionId).emit("turnChange", nextTurn);

        } catch (err) {
            socket.emit("diceError", "주사위 에러");
        }
    });
});

server.listen(3000, () => {
    console.log("Socket.io 서버 실행중 (3000)");
});
