const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../pool");   
const { httpAuth } = require("../middlewares/authMiddleware");

router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())",
            [username, hashed]
        );
        res.json({ message: "회원가입 완료" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "회원가입 실패" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: "유저 없음" });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(400).json({ error: "비밀번호 불일치" });
        }

        const token = jwt.sign(
            { user_id: user.user_id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({ token });

    } catch (err) {
        return res.status(500).json({ error: "서버 오류" });
    }
});

router.get("/profile", httpAuth, (req, res) => {
    res.json({ message: "인증 성공", user: req.user });
});

module.exports = router;
