
const express = require("express");
const router = express.Router();

const schoolController = require("../controllers/schoolController");
const { requireAuth } = require("../middleware/authMiddleware");

// 학교 검색 (회원가입 화면에서 쓰므로 로그인 없이 허용)
router.get("/search", schoolController.searchSchools);

// 월별 학사일정 조회 (로그인한 사용자의 학교 기준)
router.get("/schedule", requireAuth, schoolController.getSchedule);

module.exports = router;
