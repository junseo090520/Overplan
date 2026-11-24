const eventService = require("../services/eventService");

function handleError(res, err) {
    if (err instanceof eventService.EventError) {
        return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "서버 오류" });
}

// GET /api/events?from=2026-11-01&to=2026-12-05
exports.getEvents = async (req, res) => {
    try {
        const events = await eventService.listEvents(
            req.user.id,
            req.query.from,
            req.query.to
        );
        res.json({ success: true, events });
    } catch (err) {
        handleError(res, err);
    }
};

// GET /api/events/all  (일정 관리 페이지: 내 모든 일정, 날짜순)
exports.getAllEvents = async (req, res) => {
    try {
        const events = await eventService.listAllEvents(req.user.id);
        res.json({ success: true, events });
    } catch (err) {
        handleError(res, err);
    }
};

// GET /api/events/upcoming?after=2026-11-22
exports.getUpcoming = async (req, res) => {
    try {
        const events = await eventService.listUpcoming(req.user.id, req.query.after);
        res.json({ success: true, events });
    } catch (err) {
        handleError(res, err);
    }
};

// POST /api/events
exports.createEvent = async (req, res) => {
    try {
        const event = await eventService.createEvent(req.user.id, req.body);
        res.status(201).json({ success: true, event });
    } catch (err) {
        handleError(res, err);
    }
};

// PATCH /api/events/:id   body: { title, type, description, date, time, endTime }
exports.updateEvent = async (req, res) => {
    try {
        const event = await eventService.updateEvent(req.user.id, req.params.id, req.body);
        res.json({ success: true, event });
    } catch (err) {
        handleError(res, err);
    }
};

// PATCH /api/events/:id/done   body: { done: true | false }
exports.setDone = async (req, res) => {
    try {
        await eventService.setDone(req.user.id, req.params.id, req.body.done);
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
    try {
        await eventService.deleteEvent(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
};
