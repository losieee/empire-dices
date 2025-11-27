const jwt = require("jsonwebtoken");

function httpAuth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "토큰 없음" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "토큰 검증 실패" });
    }
}

function socketAuth(socket, next) {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error("토큰 없음"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("토큰 검증 실패"));
    }
}

module.exports = { httpAuth, socketAuth };
