const jwt = require("jsonwebtoken");

// 로그인이 필요한 라우트 앞에 붙여서 사용: router.get("/x", requireAuth, handler)
function requireAuth(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "로그인이 필요합니다." });
  }
}

module.exports = { requireAuth };
