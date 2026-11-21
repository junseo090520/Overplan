const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

// app.js에서 라우트를 먼저 불러오기 때문에, 이 파일이 dotenv.config()보다
// 먼저 실행될 수 있어요. 그래서 여기서도 최상위 .env를 직접 읽어요.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
});

module.exports = pool;