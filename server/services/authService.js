const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// 로그인 ID 규칙: 영문/숫자/_ 4~30자
const ID_RULE = /^[a-zA-Z0-9_]{4,30}$/;

// NEIS 코드 형식: 교육청 코드(예: B10), 학교 코드(7자리 숫자)
const OFFICE_CODE_RULE = /^[A-Z]\d{2}$/;
const SCHOOL_CODE_RULE = /^\d{7}$/;

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 학교 정보 검증 (회원가입, 학교 수정에서 공통 사용)
function validateSchool({ officeCode, schoolCode, schoolName }) {
  if (
    !OFFICE_CODE_RULE.test(officeCode || "") ||
    !SCHOOL_CODE_RULE.test(schoolCode || "") ||
    typeof schoolName !== "string" ||
    schoolName.length === 0 ||
    schoolName.length > 100
  ) {
    throw new AuthError(400, "학교를 선택해주세요.");
  }
}

// 토큰에 학교 정보를 같이 담아두면 매 요청마다 DB를 조회하지 않아도 됨
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      officeCode: user.office_code,
      schoolCode: user.school_code,
      schoolName: user.school_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function signup({ name, password, officeCode, schoolCode, schoolName }) {
  if (!ID_RULE.test(name || "")) {
    throw new AuthError(400, "아이디는 영문/숫자/_ 4~30자여야 합니다.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new AuthError(400, "비밀번호는 8자 이상이어야 합니다.");
  }
  validateSchool({ officeCode, schoolCode, schoolName });

  const hash = await bcrypt.hash(password, 12);
  try {
    await pool.query(
      "INSERT INTO users (name, password, office_code, school_code, school_name) VALUES (?, ?, ?, ?, ?)",
      [name, hash, officeCode, schoolCode, schoolName]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      throw new AuthError(409, "이미 사용 중인 아이디입니다.");
    }
    throw err;
  }
}

async function login({ name, password }) {
  // 아이디/비밀번호 중 무엇이 틀렸는지 알려주지 않기 위해 같은 에러를 사용
  const invalid = () => new AuthError(401, "아이디 또는 비밀번호가 올바르지 않습니다.");

  if (typeof name !== "string" || typeof password !== "string") throw invalid();

  const [rows] = await pool.query(
    "SELECT id, name, password, office_code, school_code, school_name FROM users WHERE name = ?",
    [name]
  );
  const user = rows[0];
  if (!user) throw invalid();

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw invalid();

  return { token: createToken(user), name: user.name, schoolName: user.school_name };
}

// 학교 수정: DB를 바꾸고, 토큰에 담긴 학교 정보도 새로 발급
async function changeSchool(userId, school) {
  validateSchool(school || {});

  const { officeCode, schoolCode, schoolName } = school;

  await pool.query(
    "UPDATE users SET office_code = ?, school_code = ?, school_name = ? WHERE id = ?",
    [officeCode, schoolCode, schoolName, userId]
  );

  const [rows] = await pool.query(
    "SELECT id, name, office_code, school_code, school_name FROM users WHERE id = ?",
    [userId]
  );
  const user = rows[0];
  if (!user) {
    throw new AuthError(404, "사용자를 찾을 수 없습니다.");
  }

  return { token: createToken(user), schoolName: user.school_name };
}

// 회원 탈퇴: 비밀번호를 다시 확인한 뒤, 내 데이터와 계정을 모두 삭제
async function withdraw(userId, password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new AuthError(400, "비밀번호를 입력해주세요.");
  }

  const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
  const user = rows[0];
  if (!user) {
    throw new AuthError(404, "사용자를 찾을 수 없습니다.");
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new AuthError(403, "비밀번호가 올바르지 않습니다.");
  }

  // 외래키 설정(ON DELETE)과 상관없이 동작하도록, 참조하는 테이블부터 순서대로 삭제
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query("DELETE FROM study_tasks WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM daily_study_capacity WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM calendar_events WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM subjects WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM users WHERE id = ?", [userId]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { signup, login, changeSchool, withdraw, AuthError };
