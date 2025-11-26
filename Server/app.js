const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const jwt = require("jsonwebtoken");

app.get('/', (req, res) => {
    res.send("Empire Dice Server Running");
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        socket.user = { guest: true };
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("토큰 인증 실패"));
    }
});

io.on("connection", (socket) => {
    console.log("소켓 연결됨:", socket.id);
    console.log("유저 정보:", socket.user);

    socket.on("hello", (msg) => {
        console.log("클라이언트가 보낸 메시지:", msg);

        socket.emit("helloResponse", "서버에서 받은 메시지: " + msg);
    });

    socket.on("disconnect", () => {
        console.log("클라이언트 연결 해제:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Socket.io 서버 실행중 (3000)");
});
