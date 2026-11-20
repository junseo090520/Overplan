
const express = require("express");
const router = express.Router();

const schoolController = require("../controllers/schoolController");

// 월별 학사일정 조회
router.get("/schedule", schoolController.getSchedule);

module.exports = router;
