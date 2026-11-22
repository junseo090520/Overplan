const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const eventRoutes = require("./routes/eventRoutes");

// 프로젝트 최상위의 .env 불러오기
dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const app = express();
const PORT = 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// 학사일정 라우터
app.use("/api/school", schoolRoutes);

// 로그인
app.use("/api/auth", authRoutes);

app.use("/api/events", eventRoutes);     

// 서버 실행
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
