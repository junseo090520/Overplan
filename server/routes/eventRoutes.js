const express = require("express");
const router = express.Router();

const eventController = require("../controllers/eventController");
const { requireAuth } = require("../middleware/authMiddleware");

// 이 라우터의 모든 요청은 로그인이 필요함
router.use(requireAuth);

router.get("/", eventController.getEvents);
router.get("/all", eventController.getAllEvents);
router.get("/upcoming", eventController.getUpcoming);
router.post("/", eventController.createEvent);
router.patch("/:id/done", eventController.setDone);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
