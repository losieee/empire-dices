const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

app.use(cors());
app.use(express.json());   

const authRoutes = require('./routes/auth');

app.use('/auth', authRoutes);


app.listen(3000, () => {
    console.log('서버 실행 중: http://localhost:3000');
});
