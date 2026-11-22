/* =========================
   기본 설정
========================= */

const calendarGrid = document.getElementById("calendar-grid");
const monthTitle = document.getElementById("month-title");
const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");
const todayButton = document.getElementById("today-btn");
const detailAddButton = document.getElementById("detail-add-button");
const detailList = document.getElementById("detail-list");
const upcomingCard = document.querySelector(".upcoming-card");

const progressCard = document.querySelector(".progress-card");
const progressTitle = document.getElementById("progress-title");
const progressPercent = document.getElementById("today-progress-percent");
const progressBar = document.getElementById("today-progress-bar");
const progressInfo = document.getElementById("today-progress-info");

const today = new Date();

let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let selectedDate = new Date(today);

const TIME_RULE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_DESCRIPTION_LENGTH = 500;

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
    },
    other: {
        name: "기타",
        className: "gray"
    }
};

/* =========================
   일정 데이터
========================= */

// DB에서 가져온 내 일정 (현재 달력에 보이는 기간만)
let events = [];

// NEIS에서 가져온 학교 일정
let schoolEvents = [];

// 다가오는 일정 (오늘 이후 가장 가까운 날의 미완료 일정)
let upcomingEvents = [];

// 달을 빠르게 넘길 때 늦게 도착한 이전 응답이 덮어쓰지 않도록 요청 번호를 기록
let eventsRequestId = 0;
let schoolRequestId = 0;

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// 로그인이 풀렸거나 안 된 경우 로그인 페이지로 이동
function redirectToLogin() {
    window.location.href = "/login.html";
}

// DB에 저장된 내 일정인지 (NEIS 학사일정은 id가 문자열이라 구분됨)
function isMyEvent(event) {
    return typeof event.id === "number";
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

function formatTimeRange(event) {
    return event.endTime ? `${event.time} ~ ${event.endTime}` : event.time;
}

function getEventsByDate(date) {
    const dateKey = getDateKey(date);

    return [...events, ...schoolEvents]
        .filter(event => event.date === dateKey)
        .sort((a, b) => a.time.localeCompare(b.time));
}

// 달력 화면에 보이는 첫날 ~ 마지막날 (앞뒤 달의 날짜 포함)
function getVisibleRange() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const startDay = firstDay.getDay();
    const totalDays = Math.ceil((startDay + lastDay.getDate()) / 7) * 7;

    const from = new Date(currentYear, currentMonth, 1 - startDay);
    const to = new Date(currentYear, currentMonth, 1 - startDay + totalDays - 1);

    return { from: getDateKey(from), to: getDateKey(to) };
}

// 달을 넘기면 선택 날짜도 그 달 안으로 옮김 (이번 달이면 오늘, 아니면 1일)
// → 선택한 날짜의 일정이 항상 불러온 기간 안에 있도록 하기 위함
function moveSelectedDateToCurrentMonth() {
    const isThisMonth =
        currentYear === today.getFullYear() && currentMonth === today.getMonth();

    selectedDate = isThisMonth
        ? new Date(today)
        : new Date(currentYear, currentMonth, 1);
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

            // 완료된 일정은 줄을 그어서 표시
            if (event.isDone) {
                eventElement.classList.add("done");
            }

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
                loadCalendarData();
            }
        });

        calendarGrid.appendChild(dayElement);
    }
}

/* =========================
   선택 날짜 일정 완료율
========================= */

// 선택한 날짜의 내 일정 중 완료한 일정의 비율 (학사일정은 완료 처리가 없어 제외)
function renderProgress() {
    if (!progressCard || !progressPercent || !progressBar || !progressInfo) {
        return;
    }

    const myEvents = getEventsByDate(selectedDate).filter(isMyEvent);

    const total = myEvents.length;
    const doneCount = myEvents.filter(event => event.isDone).length;
    const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

    const label = isSameDate(selectedDate, today) ? "오늘" : formatDate(selectedDate);

    if (progressTitle) {
        progressTitle.textContent = `${label} 일정 완료율`;
    }

    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    progressCard.classList.toggle("complete", total > 0 && doneCount === total);

    progressInfo.textContent = total === 0
        ? `${label}에는 등록된 일정이 없습니다.`
        : `${label} 일정 ${total}개 중 ${doneCount}개 완료`;
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

    // 선택 날짜가 바뀌거나 일정/완료 상태가 바뀔 때마다 완료율도 함께 갱신
    renderProgress();

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
        const mine = isMyEvent(event);

        const item = document.createElement("div");
        item.className = `detail-item ${eventType.className}`;

        if (event.isDone) {
            item.classList.add("done");
        }

        // 체크박스는 내 일정에만 표시 (학사일정은 완료 처리 대상이 아님)
        item.innerHTML = `
            <div class="detail-row">
                ${mine ? '<input type="checkbox" class="detail-check" aria-label="완료 표시">' : ""}
                <div class="detail-body">
                    <div class="detail-time"></div>
                    <div class="detail-content">
                        <h3></h3>
                        <p>${eventType.name}</p>
                    </div>
                </div>
            </div>
        `;

        item.querySelector(".detail-time").textContent = formatTimeRange(event);
        item.querySelector("h3").textContent = event.title;

        // 내가 입력한 세부내용이 있으면 표시
        if (mine && event.content) {
            const description = document.createElement("p");

            description.className = "detail-desc";
            description.textContent = event.content;

            item.querySelector(".detail-body").appendChild(description);
        }

        if (mine) {
            const checkbox = item.querySelector(".detail-check");

            checkbox.checked = Boolean(event.isDone);
            checkbox.addEventListener("change", () => {
                toggleDone(event, checkbox.checked);
            });
        }

        detailList.appendChild(item);
    });
}

/* =========================
   다가오는 일정 표시
========================= */

function renderUpcoming() {
    if (!upcomingCard) {
        return;
    }

    upcomingCard
        .querySelectorAll(".upcoming-item, .upcoming-empty")
        .forEach(element => element.remove());

    if (upcomingEvents.length === 0) {
        const empty = document.createElement("p");

        empty.className = "empty-message upcoming-empty";
        empty.textContent = "다가오는 일정이 없습니다.";
        upcomingCard.appendChild(empty);

        return;
    }

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    upcomingEvents.forEach(event => {
        const [year, month, day] = event.date.split("-").map(Number);
        const diffDays = Math.round((new Date(year, month - 1, day) - todayStart) / 86400000);

        const eventType = eventTypes[event.type];

        const item = document.createElement("div");
        item.className = "upcoming-item";

        item.innerHTML = `
            <div class="upcoming-date ${eventType.className}-bg">
                <strong></strong>
                <span></span>
            </div>
            <div>
                <h3></h3>
                <p></p>
            </div>
            <div class="dday${diffDays <= 3 ? " urgent" : ""}"></div>
        `;

        item.querySelector("strong").textContent = day;
        item.querySelector(".upcoming-date span").textContent = `${month}월`;
        item.querySelector("h3").textContent = event.title;
        item.querySelector("p").textContent = `${eventType.name} · ${formatTimeRange(event)}`;
        item.querySelector(".dday").textContent = `D-${diffDays}`;

        upcomingCard.appendChild(item);
    });
}

/* =========================
   내 일정 조회 (DB)
========================= */

async function loadMyEvents() {
    const requestId = ++eventsRequestId;

    try {
        const { from, to } = getVisibleRange();

        const response = await fetch(`/api/events?from=${from}&to=${to}`);

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "일정 조회에 실패했습니다.");
        }

        // 더 최근에 보낸 요청이 있으면 이 응답은 버림
        if (requestId !== eventsRequestId) {
            return;
        }

        events = data.events;

        renderCalendar();
        renderSelectedDate();

    } catch (error) {
        console.error("내 일정 조회 오류:", error);
    }
}

/* =========================
   다가오는 일정 조회 (DB)
========================= */

async function loadUpcoming() {
    try {
        const response = await fetch(`/api/events/upcoming?after=${getDateKey(today)}`);

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "다가오는 일정 조회에 실패했습니다.");
        }

        upcomingEvents = data.events;
        renderUpcoming();

    } catch (error) {
        console.error("다가오는 일정 조회 오류:", error);
    }
}

/* =========================
   NEIS 학사일정 조회
========================= */

async function loadSchoolEvents() {
    const requestId = ++schoolRequestId;

    try {
        const month = String(currentMonth + 1).padStart(2, "0");

        // 로그인한 사용자의 학교 기준으로 서버가 조회함
        const response = await fetch(
            `/api/school/schedule?year=${currentYear}&month=${month}`
        );

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error("학사일정 조회에 실패했습니다.");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        if (requestId !== schoolRequestId) {
            return;
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

// 내 일정 + 학사일정을 함께 불러오기
function loadCalendarData() {
    loadMyEvents();
    loadSchoolEvents();
}

/* =========================
   완료 체크
========================= */

async function toggleDone(event, checked) {
    // 먼저 화면에 반영하고(빠른 반응), 서버 저장에 실패하면 되돌림
    // (renderSelectedDate 안에서 완료율도 함께 갱신됨)
    event.isDone = checked;

    renderCalendar();
    renderSelectedDate();

    try {
        const response = await fetch(`/api/events/${event.id}/done`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: checked })
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(data.message || "완료 상태 저장에 실패했습니다.");
        }

        // 완료/미완료에 따라 다가오는 일정이 달라지므로 다시 조회
        loadUpcoming();

    } catch (error) {
        console.error("완료 상태 저장 오류:", error);

        event.isDone = !checked;

        renderCalendar();
        renderSelectedDate();

        alert(error.message);
    }
}

/* =========================
   일정 추가
========================= */

async function addSchedule() {
    const title = prompt("일정 이름을 입력하세요.");

    if (!title || !title.trim()) {
        return;
    }

    const typeInput = prompt(
        "일정 종류를 선택하세요.\n" +
        "1. 시험\n" +
        "2. 학교 일정\n" +
        "3. 수행평가\n" +
        "4. 개인 과제\n" +
        "5. 기타"
    );

    const typeMap = {
        "1": "exam",
        "2": "school",
        "3": "assessment",
        "4": "assignment",
        "5": "other"
    };

    const type = typeMap[typeInput];

    if (!type) {
        alert("올바른 일정 종류를 입력하세요.");
        return;
    }

    const descriptionInput = prompt(
        "일정 세부내용을 입력하세요.\n" +
        "세부내용이 없으면 비워두세요.",
        ""
    );

    // 취소를 누르면 추가하지 않고 끝냄
    if (descriptionInput === null) {
        return;
    }

    const description = descriptionInput.trim();

    if (description.length > MAX_DESCRIPTION_LENGTH) {
        alert(`세부내용은 ${MAX_DESCRIPTION_LENGTH}자 이내로 입력하세요.`);
        return;
    }

    const timeInput = prompt(
        "일정 시작 시간을 입력하세요. (예: 09:00)",
        "09:00"
    );

    if (!timeInput || !TIME_RULE.test(timeInput)) {
        alert("시간은 09:00 형식으로 입력하세요.");
        return;
    }

    const endInput = prompt(
        "일정 종료 시간을 입력하세요. (예: 10:30)\n" +
        "종료 시간이 없으면 비워두세요.",
        ""
    );

    // 취소를 누르면 추가하지 않고 끝냄
    if (endInput === null) {
        return;
    }

    const endTime = endInput.trim();

    if (endTime && !TIME_RULE.test(endTime)) {
        alert("종료 시간은 10:30 형식으로 입력하세요.");
        return;
    }

    if (endTime && endTime <= timeInput) {
        alert("종료 시간은 시작 시간보다 늦어야 합니다.");
        return;
    }

    try {
        const response = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title.trim(),
                type: type,
                description: description,
                date: getDateKey(selectedDate),
                time: timeInput,
                endTime: endTime || null
            })
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(data.message || "일정 추가에 실패했습니다.");
        }

        // 서버가 저장한 일정(id 포함)을 화면 데이터에 바로 반영
        events.push(data.event);

        renderCalendar();
        renderSelectedDate();
        loadUpcoming();

        alert("일정이 추가되었습니다.");

    } catch (error) {
        console.error("일정 추가 오류:", error);
        alert(error.message);
    }
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

    moveSelectedDateToCurrentMonth();

    renderCalendar();
    renderSelectedDate();
    loadCalendarData();
});

// 다음 달
nextMonthButton.addEventListener("click", () => {
    currentMonth++;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    moveSelectedDateToCurrentMonth();

    renderCalendar();
    renderSelectedDate();
    loadCalendarData();
});

// 오늘 날짜로 이동
todayButton.addEventListener("click", () => {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDate = new Date(today);

    renderCalendar();
    renderSelectedDate();
    loadCalendarData();
});

// 일정 추가 버튼
detailAddButton.addEventListener("click", addSchedule);

/* =========================
   초기 실행
========================= */

renderCalendar();
renderSelectedDate();
renderUpcoming();
loadCalendarData();
loadUpcoming();
