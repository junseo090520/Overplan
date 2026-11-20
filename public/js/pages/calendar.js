
/* =========================
   기본 설정
========================= */

const calendarGrid = document.getElementById("calendar-grid");
const monthTitle = document.getElementById("month-title");
const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");
const todayButton = document.getElementById("today-btn");
const addScheduleButton = document.getElementById("add-schedule-btn");
const detailAddButton = document.getElementById("detail-add-button");
const detailList = document.getElementById("detail-list");

const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let selectedDate = new Date(today);

const eventTypes = {
    exam: {
        name: "시험",
        className: "pink"
    },
    school: {
        name: "학교 일정",
        className: "blue"
    },
    assessment: {
        name: "수행평가",
        className: "green"
    },
    assignment: {
        name: "개인 과제",
        className: "purple"
    }
};

/* =========================
   개인 일정 데이터
========================= */

const storageKey = "overplan-calendar-events";

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function loadEvents() {
    const savedEvents = localStorage.getItem(storageKey);

    if (savedEvents) {
        try {
            return JSON.parse(savedEvents);
        } catch (error) {
            console.error("일정 데이터를 불러오지 못했습니다.", error);
        }
    }

    return [];
}

let events = loadEvents();

// NEIS에서 가져온 학교 일정
let schoolEvents = [];

function saveEvents() {
    localStorage.setItem(storageKey, JSON.stringify(events));
}

/* =========================
   날짜 관련 함수
========================= */

function isSameDate(date1, date2) {
    return getDateKey(date1) === getDateKey(date2);
}

function formatDate(date) {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getEventsByDate(date) {
    const dateKey = getDateKey(date);

    return [...events, ...schoolEvents]
        .filter(event => event.date === dateKey)
        .sort((a, b) => a.time.localeCompare(b.time));
}

/* =========================
   달력 생성
========================= */

function renderCalendar() {
    monthTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;

    calendarGrid.innerHTML = "";

    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    weekdays.forEach((weekday, index) => {
        const weekdayElement = document.createElement("div");

        weekdayElement.className = "weekday";

        if (index === 0) {
            weekdayElement.classList.add("sunday");
        }

        if (index === 6) {
            weekdayElement.classList.add("saturday");
        }

        weekdayElement.textContent = weekday;
        calendarGrid.appendChild(weekdayElement);
    });

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const totalDays = Math.ceil((startDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalDays; i++) {
        const date = new Date(currentYear, currentMonth, 1 - startDay + i);

        const dayElement = document.createElement("div");
        dayElement.className = "day";

        if (date.getMonth() !== currentMonth) {
            dayElement.classList.add("outside");
        }

        if (isSameDate(date, today)) {
            dayElement.classList.add("today");
        }

        if (isSameDate(date, selectedDate)) {
            dayElement.classList.add("selected");
        }

        const dayNumber = document.createElement("span");
        dayNumber.textContent = date.getDate();

        dayElement.appendChild(dayNumber);

        const dailyEvents = getEventsByDate(date);

        dailyEvents.forEach(event => {
            const eventElement = document.createElement("small");

            const eventType = eventTypes[event.type];

            eventElement.className = `event ${eventType.className}`;
            eventElement.textContent = event.title;

            dayElement.appendChild(eventElement);
        });

        dayElement.addEventListener("click", () => {
            const monthChanged = date.getMonth() !== currentMonth ||
                                date.getFullYear() !== currentYear;

            selectedDate = new Date(date);

            if (monthChanged) {
                currentYear = date.getFullYear();
                currentMonth = date.getMonth();
            }

            renderCalendar();
            renderSelectedDate();

            if (monthChanged) {
                loadSchoolEvents();
            }
        });

        calendarGrid.appendChild(dayElement);
    }
}

/* =========================
   선택 날짜 일정 표시
========================= */

function renderSelectedDate() {
    detailList.innerHTML = "";

    const dailyEvents = getEventsByDate(selectedDate);

    const dateTitle = document.querySelector(".sidebar-title h2");

    dateTitle.innerHTML = `
        ${formatDate(selectedDate)}
        <span>${["일", "월", "화", "수", "목", "금", "토"][selectedDate.getDay()]}요일</span>
    `;

    const dateIcon = document.querySelector(".date-icon");
    dateIcon.textContent = selectedDate.getDate();

    if (dailyEvents.length === 0) {
        detailList.innerHTML = `
            <p class="empty-message">
                등록된 일정이 없습니다.
            </p>
        `;

        return;
    }

    dailyEvents.forEach(event => {
        const eventType = eventTypes[event.type];

        const item = document.createElement("div");
        item.className = `detail-item ${eventType.className}`;

        item.innerHTML = `
            <div class="detail-time">${event.time}</div>
            <div class="detail-content">
                <h3></h3>
                <p>${eventType.name}</p>
            </div>
        `;

        item.querySelector("h3").textContent = event.title;

        detailList.appendChild(item);
    });
}

/* =========================
   NEIS 학사일정 조회
========================= */

async function loadSchoolEvents() {
    try {
        const month = String(currentMonth + 1).padStart(2, "0");

        const response = await fetch(
            `http://localhost:3000/api/school/schedule?year=${currentYear}&month=${month}`
        );

        if (!response.ok) {
            throw new Error("학사일정 조회에 실패했습니다.");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        schoolEvents = data.schedules.map((event, index) => ({
            id: `school-${currentYear}-${currentMonth}-${index}`,
            date: event.date,
            title: event.title,
            type: "school",
            time: "00:00",
            content: event.content
        }));

        renderCalendar();
        renderSelectedDate();

    } catch (error) {
        console.error("학교 학사일정 조회 오류:", error);
    }
}


/* =========================
   일정 추가
========================= */

function addSchedule() {
    const title = prompt("일정 이름을 입력하세요.");

    if (!title || !title.trim()) {
        return;
    }

    const typeInput = prompt(
        "일정 종류를 선택하세요.\n" +
        "1. 시험\n" +
        "2. 학교 일정\n" +
        "3. 수행평가\n" +
        "4. 개인 과제"
    );

    const typeMap = {
        "1": "exam",
        "2": "school",
        "3": "assessment",
        "4": "assignment"
    };

    const type = typeMap[typeInput];

    if (!type) {
        alert("올바른 일정 종류를 입력하세요.");
        return;
    }

    const timeInput = prompt(
        "일정 시간을 입력하세요. (예: 09:00)",
        "09:00"
    );

    if (!timeInput || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeInput)) {
        alert("시간은 09:00 형식으로 입력하세요.");
        return;
    }

    events.push({
        id: Date.now(),
        date: getDateKey(selectedDate),
        title: title.trim(),
        type: type,
        time: timeInput
    });

    saveEvents();

    renderCalendar();
    renderSelectedDate();

    alert("일정이 추가되었습니다.");
}

/* =========================
   버튼 이벤트
========================= */

// 이전 달
prevMonthButton.addEventListener("click", () => {
    currentMonth--;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    renderCalendar();
    loadSchoolEvents();
});

// 다음 달
nextMonthButton.addEventListener("click", () => {
    currentMonth++;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderCalendar();
    loadSchoolEvents();
});

// 오늘 날짜로 이동
todayButton.addEventListener("click", () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDate = new Date(today);

    renderCalendar();
    renderSelectedDate();
    loadSchoolEvents();
});

// 일정 추가 버튼
addScheduleButton.addEventListener("click", addSchedule);
detailAddButton.addEventListener("click", addSchedule);

/* =========================
   초기 실행
========================= */

renderCalendar();
renderSelectedDate();
loadSchoolEvents();