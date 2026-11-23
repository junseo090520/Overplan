const authService = require("../services/authService");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 1000, // 1시간 (토큰 만료와 동일)
};

function handleError(res, err) {
  if (err instanceof authService.AuthError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: "서버 오류" });
}

exports.signup = async (req, res) => {
  try {
    await authService.signup(req.body);
    res.status(201).json({ message: "회원가입 완료" });
  } catch (err) {
    handleError(res, err);
  }
};

exports.login = async (req, res) => {
  try {
    const { token, name, schoolName } = await authService.login(req.body);
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ message: "로그인 성공", name, schoolName });
  } catch (err) {
    handleError(res, err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "로그아웃 완료" });
};

exports.me = (req, res) => {
  const { id, name, officeCode, schoolCode, schoolName } = req.user;
  res.json({ id, name, officeCode, schoolCode, schoolName });
};

// PATCH /api/auth/school  body: { officeCode, schoolCode, schoolName }
exports.changeSchool = async (req, res) => {
  try {
    const { token, schoolName } = await authService.changeSchool(req.user.id, req.body);

    // 학사일정이 새 학교 기준으로 조회되도록 토큰을 새로 발급
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ message: "학교가 변경되었습니다.", schoolName });
  } catch (err) {
    handleError(res, err);
  }
};

// DELETE /api/auth/me  body: { password }
exports.withdraw = async (req, res) => {
  try {
    await authService.withdraw(req.user.id, req.body.password);

    res.clearCookie("token");
    res.json({ message: "회원 탈퇴가 완료되었습니다." });
  } catch (err) {
    handleError(res, err);
  }
};
