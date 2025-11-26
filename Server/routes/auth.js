const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../pool');


router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        const hashed = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())",
            [username, hashed]
        );

        res.json({ message: "회원가입 완료" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "회원가입 실패" });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: "존재하지 않는 유저" });
        }

        const user = rows[0];

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(400).json({ error: "비밀번호 불일치" });
        }

        const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, {
            expiresIn: "1h"
        });

        res.json({ message: "로그인 성공", token });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "로그인 실패" });
    }
});


module.exports = router;

const authMiddleware = require('../middlewares/authMiddleware');

router.get('/profile', authMiddleware, (req, res) => {
    res.json({
        message: "인증 성공",
        user: req.user
    });
});
