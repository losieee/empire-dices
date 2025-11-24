const pool = require('./pool');

async function testDB() {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log("DB 연결 성공! 결과:", rows);
  } catch (err) {
    console.error("DB 연결 실패:", err);
  }
}

testDB();
