const pool = require("../config/db");

class EventError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// 화면의 일정 종류 → DB의 event_type / assessment_type
const TYPE_TO_DB = {
    exam: { eventType: "ACADEMIC", assessmentType: "EXAM" },
    assessment: { eventType: "ACADEMIC", assessmentType: "PERFORMANCE" },
    assignment: { eventType: "ACADEMIC", assessmentType: "ASSIGNMENT" },
    school: { eventType: "SCHOOL", assessmentType: null },
    other: { eventType: "PERSONAL", assessmentType: null }
};

// DB 값 → 화면의 일정 종류
function toClientType(eventType, assessmentType) {
    if (eventType === "SCHOOL") return "school";
    if (eventType === "PERSONAL") return "other";
    if (assessmentType === "EXAM") return "exam";
    if (assessmentType === "PERFORMANCE") return "assessment";
    return "assignment"; // ASSIGNMENT 등은 '개인 과제'로 표시
}

const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RULE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 90;
const UPCOMING_LIMIT = 10;
const MAX_DESCRIPTION_LENGTH = 500;

// 일정 조회에 공통으로 쓰는 컬럼 (날짜/시간은 문자열로 바로 만들어서 시간대 문제를 피함)
const SELECT_COLUMNS = `
    id, title, event_type, assessment_type, description, is_done,
    DATE_FORMAT(start_at, '%Y-%m-%d') AS date,
    DATE_FORMAT(start_at, '%H:%i') AS time,
    DATE_FORMAT(end_at, '%H:%i') AS end_time`;

function toClientEvent(row) {
    return {
        id: row.id,
        title: row.title,
        type: toClientType(row.event_type, row.assessment_type),
        date: row.date,
        time: row.time,
        endTime: row.end_time || null,
        content: row.description || "",
        isDone: Boolean(row.is_done)
    };
}

// 'YYYY-MM-DD'가 실제로 존재하는 날짜인지 확인 (예: 2026-02-31은 null)
function parseDate(value) {
    if (typeof value !== "string" || !DATE_RULE.test(value)) return null;

    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    const valid =
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d;

    return valid ? date : null;
}

// 기간(from ~ to, 날짜 포함) 안의 내 일정 조회
async function listEvents(userId, from, to) {
    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (!fromDate || !toDate) {
        throw new EventError(400, "조회할 날짜 범위가 올바르지 않습니다.");
    }

    const days = (toDate - fromDate) / 86400000;
    if (days < 0 || days > MAX_RANGE_DAYS) {
        throw new EventError(400, "조회 기간이 올바르지 않습니다.");
    }

    const [rows] = await pool.query(
        `SELECT ${SELECT_COLUMNS}
           FROM calendar_events
          WHERE user_id = ?
            AND start_at >= ?
            AND start_at < DATE_ADD(?, INTERVAL 1 DAY)
          ORDER BY start_at, id`,
        [userId, `${from} 00:00:00`, `${to} 00:00:00`]
    );

    return rows.map(toClientEvent);
}

// 기준 날짜(after) 다음 날부터 가장 가까운 날의 미완료 일정들
async function listUpcoming(userId, after) {
    if (!parseDate(after)) {
        throw new EventError(400, "기준 날짜가 올바르지 않습니다.");
    }

    const [[next]] = await pool.query(
        `SELECT DATE_FORMAT(MIN(start_at), '%Y-%m-%d') AS next_date
           FROM calendar_events
          WHERE user_id = ?
            AND is_done = 0
            AND start_at >= DATE_ADD(?, INTERVAL 1 DAY)`,
        [userId, `${after} 00:00:00`]
    );

    if (!next || !next.next_date) {
        return [];
    }

    const dayStart = `${next.next_date} 00:00:00`;

    const [rows] = await pool.query(
        `SELECT ${SELECT_COLUMNS}
           FROM calendar_events
          WHERE user_id = ?
            AND is_done = 0
            AND start_at >= ?
            AND start_at < DATE_ADD(?, INTERVAL 1 DAY)
          ORDER BY start_at, id
          LIMIT ${UPCOMING_LIMIT}`,
        [userId, dayStart, dayStart]
    );

    return rows.map(toClientEvent);
}

// 일정 추가 (endTime, description은 선택)
async function createEvent(userId, { title, type, description, date, time, endTime }) {
    const cleanTitle = typeof title === "string" ? title.trim() : "";

    if (cleanTitle.length === 0 || cleanTitle.length > 100) {
        throw new EventError(400, "일정 이름은 1~100자로 입력해주세요.");
    }

    const mapped = TYPE_TO_DB[type];
    if (!mapped) {
        throw new EventError(400, "올바른 일정 종류가 아닙니다.");
    }

    const cleanDescription = typeof description === "string" ? description.trim() : "";
    if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
        throw new EventError(400, `세부내용은 ${MAX_DESCRIPTION_LENGTH}자 이내로 입력해주세요.`);
    }

    if (!parseDate(date)) {
        throw new EventError(400, "날짜가 올바르지 않습니다.");
    }

    if (typeof time !== "string" || !TIME_RULE.test(time)) {
        throw new EventError(400, "시간은 09:00 형식으로 입력해주세요.");
    }

    // 종료 시간은 없어도 되고, 있으면 시작 시간보다 늦어야 함 (같은 날 기준)
    let endAt = null;
    let cleanEndTime = null;

    if (endTime !== undefined && endTime !== null && endTime !== "") {
        if (typeof endTime !== "string" || !TIME_RULE.test(endTime)) {
            throw new EventError(400, "종료 시간은 10:30 형식으로 입력해주세요.");
        }
        if (endTime <= time) {
            throw new EventError(400, "종료 시간은 시작 시간보다 늦어야 합니다.");
        }
        cleanEndTime = endTime;
        endAt = `${date} ${endTime}:00`;
    }

    const [result] = await pool.query(
        `INSERT INTO calendar_events
                (user_id, title, event_type, assessment_type, description, start_at, end_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            cleanTitle,
            mapped.eventType,
            mapped.assessmentType,
            cleanDescription || null,
            `${date} ${time}:00`,
            endAt
        ]
    );

    return {
        id: result.insertId,
        title: cleanTitle,
        type,
        date,
        time,
        endTime: cleanEndTime,
        content: cleanDescription,
        isDone: false
    };
}

// 완료 여부 변경 (내 일정만 가능)
async function setDone(userId, id, done) {
    const eventId = Number(id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
        throw new EventError(400, "올바른 일정이 아닙니다.");
    }
    if (typeof done !== "boolean") {
        throw new EventError(400, "완료 여부가 올바르지 않습니다.");
    }

    const [rows] = await pool.query(
        "SELECT id FROM calendar_events WHERE id = ? AND user_id = ?",
        [eventId, userId]
    );
    if (rows.length === 0) {
        throw new EventError(404, "일정을 찾을 수 없습니다.");
    }

    await pool.query(
        "UPDATE calendar_events SET is_done = ? WHERE id = ? AND user_id = ?",
        [done ? 1 : 0, eventId, userId]
    );
}

const ALL_EVENTS_LIMIT = 500;

// 일정 관리 페이지용: 내 모든 일정을 날짜순으로 (최대 500개)
async function listAllEvents(userId) {
    const [rows] = await pool.query(
        `SELECT ${SELECT_COLUMNS}
           FROM calendar_events
          WHERE user_id = ?
          ORDER BY start_at, id
          LIMIT ${ALL_EVENTS_LIMIT}`,
        [userId]
    );

    return rows.map(toClientEvent);
}

// 일정 삭제 (내 일정만 가능)
async function deleteEvent(userId, id) {
    const eventId = Number(id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
        throw new EventError(400, "올바른 일정이 아닙니다.");
    }

    const [result] = await pool.query(
        "DELETE FROM calendar_events WHERE id = ? AND user_id = ?",
        [eventId, userId]
    );

    if (result.affectedRows === 0) {
        throw new EventError(404, "일정을 찾을 수 없습니다.");
    }
}

module.exports = {
    listEvents,
    listUpcoming,
    listAllEvents,
    createEvent,
    setDone,
    deleteEvent,
    EventError
};
