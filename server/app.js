
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const schoolRoutes = require("./routes/schoolRoutes");

// 프로젝트 최상위의 .env 불러오기
dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const app = express();
const PORT = 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// 학사일정 라우터
app.use("/api/school", schoolRoutes);

// 서버 실행
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
