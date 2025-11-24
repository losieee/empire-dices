require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./pool");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => {
    res.json({ message: "pong" });
});

app.get("/db-test", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1");
        res.json({ message: "DB OK", result: rows });
    } catch (err) {
        res.json({ message: "DB FAIL", error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
