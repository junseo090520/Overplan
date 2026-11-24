/* =========================
   기본 설정
========================= */

const manageList = document.getElementById("manage-list");
const filterButtons = document.querySelectorAll(".filter-button");

// 수정 팝업
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editTitle = document.getElementById("edit-title");
const editType = document.getElementById("edit-type");
const editDate = document.getElementById("edit-date");
const editTime = document.getElementById("edit-time");
const editEndTime = document.getElementById("edit-end-time");
const editDescription = document.getElementById("edit-description");
const editMessage = document.getElementById("edit-message");
const editSaveButton = document.getElementById("edit-save-button");
const editCancelButton = document.getElementById("edit-cancel-button");

const today = new Date();
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_DESCRIPTION_LENGTH = 500;

const eventTypes = {
    exam: { name: "시험", className: "pink" },
    school: { name: "학교 일정", className: "blue" },
    assessment: { name: "수행평가", className: "green" },
    assignment: { name: "개인 과제", className: "purple" },
    other: { name: "기타", className: "gray" }
};

const emptyMessages = {
    all: "등록된 일정이 없습니다.",
    todo: "미완료 일정이 없습니다.",
    done: "완료한 일정이 없습니다."
};

// 서버에서 받아온 내 모든 일정 (날짜순)
let allEvents = [];

// 현재 선택된 필터: all | todo | done
let currentFilter = "all";

// 지금 수정 팝업에서 편집 중인 일정
let editingEvent = null;

/* =========================
   공통 함수
========================= */

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// '2026-11-25' → '11월 25일 (수)' (올해가 아니면 연도도 표시)
function formatDateLabel(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
    const yearText = year === today.getFullYear() ? "" : `${year}년 `;

    return `${yearText}${month}월 ${day}일 (${weekday})`;
}

function formatTimeRange(event) {
    return event.endTime ? `${event.time} ~ ${event.endTime}` : event.time;
}

// 날짜 → 시간 → id 순으로 정렬 (서버의 정렬 기준과 같음)
function sortEvents() {
    allEvents.sort((a, b) =>
        a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time) ||
        a.id - b.id
    );
}

// 서버 요청 공통 처리: 로그인이 풀렸으면 로그인 페이지로, 실패하면 에러를 던짐
async function request(url, options) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        window.location.href = "/login.html";
        throw new Error("로그인이 필요합니다.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
        throw new Error(data.message || "요청에 실패했습니다.");
    }

    return data;
}

/* =========================
   화면 그리기
========================= */

function getFilteredEvents() {
    if (currentFilter === "done") {
        return allEvents.filter(event => event.isDone);
    }

    if (currentFilter === "todo") {
        return allEvents.filter(event => !event.isDone);
    }

    return allEvents;
}

function renderCounts() {
    const counts = {
        all: allEvents.length,
        todo: allEvents.filter(event => !event.isDone).length,
        done: allEvents.filter(event => event.isDone).length
    };

    document.querySelectorAll("[data-count]").forEach(element => {
        element.textContent = counts[element.dataset.count];
    });
}

function createGroup(dateKey) {
    const todayKey = getDateKey(today);

    const group = document.createElement("section");
    group.className = "manage-group";

    // 지난 날짜는 흐리게 표시
    if (dateKey < todayKey) {
        group.classList.add("past");
    }

    group.innerHTML = `
        <h2 class="manage-date">
            <span class="manage-date-text"></span>
        </h2>
        <div class="manage-items"></div>
    `;

    group.querySelector(".manage-date-text").textContent = formatDateLabel(dateKey);

    if (dateKey === todayKey) {
        const badge = document.createElement("span");

        badge.className = "today-badge";
        badge.textContent = "오늘";
        group.querySelector(".manage-date").appendChild(badge);
    }

    return group;
}

function createItem(event) {
    const eventType = eventTypes[event.type];

    const item = document.createElement("article");
    item.className = "manage-item";

    if (event.isDone) {
        item.classList.add("done");
    }

    item.innerHTML = `
        <input type="checkbox" class="manage-check" aria-label="완료 표시">
        <div class="manage-main">
            <div class="manage-title-row">
                <span class="type-chip ${eventType.className}">${eventType.name}</span>
                <h3></h3>
            </div>
        </div>
        <div class="manage-time"></div>
        <div class="manage-actions">
            <button type="button" class="edit-button" aria-label="일정 수정">수정</button>
            <button type="button" class="delete-button" aria-label="일정 삭제">삭제</button>
        </div>
    `;

    const title = item.querySelector("h3");
    title.textContent = event.title;
    title.title = event.title;

    item.querySelector(".manage-time").textContent = formatTimeRange(event);

    // 세부내용이 있으면 제목 아래에 표시
    if (event.content) {
        const description = document.createElement("p");

        description.className = "manage-desc";
        description.textContent = event.content;
        item.querySelector(".manage-main").appendChild(description);
    }

    const checkbox = item.querySelector(".manage-check");
    checkbox.checked = Boolean(event.isDone);
    checkbox.addEventListener("change", () => {
        toggleDone(event, checkbox.checked);
    });

    item.querySelector(".edit-button").addEventListener("click", () => {
        openEditDialog(event);
    });

    const deleteButton = item.querySelector(".delete-button");
    deleteButton.addEventListener("click", () => {
        deleteEvent(event, deleteButton);
    });

    return item;
}

function renderList() {
    renderCounts();

    manageList.innerHTML = "";

    const events = getFilteredEvents();

    if (events.length === 0) {
        const empty = document.createElement("p");

        empty.className = "empty-message";
        empty.textContent = emptyMessages[currentFilter];
        manageList.appendChild(empty);

        return;
    }

    // 날짜순으로 정렬돼 있으므로 날짜가 바뀔 때마다 새 그룹을 만듦
    let lastDate = null;
    let itemsBox = null;

    events.forEach(event => {
        if (event.date !== lastDate) {
            const group = createGroup(event.date);

            manageList.appendChild(group);
            itemsBox = group.querySelector(".manage-items");
            lastDate = event.date;
        }

        itemsBox.appendChild(createItem(event));
    });
}

/* =========================
   서버 연동
========================= */

async function loadEvents() {
    try {
        const data = await request("/api/events/all");

        allEvents = data.events;
        renderList();

    } catch (error) {
        console.error("일정 조회 오류:", error);

        manageList.innerHTML = "";

        const message = document.createElement("p");

        message.className = "empty-message";
        message.textContent = "일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
        manageList.appendChild(message);
    }
}

async function toggleDone(event, checked) {
    // 먼저 화면에 반영하고(빠른 반응), 서버 저장에 실패하면 되돌림
    event.isDone = checked;
    renderList();

    try {
        await request(`/api/events/${event.id}/done`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: checked })
        });

    } catch (error) {
        console.error("완료 상태 저장 오류:", error);

        event.isDone = !checked;
        renderList();

        alert(error.message);
    }
}

async function deleteEvent(event, button) {
    if (!confirm(`'${event.title}' 일정을 삭제할까요?\n삭제한 일정은 되돌릴 수 없어요.`)) {
        return;
    }

    button.disabled = true;

    try {
        await request(`/api/events/${event.id}`, { method: "DELETE" });

        allEvents = allEvents.filter(item => item.id !== event.id);
        renderList();

    } catch (error) {
        console.error("일정 삭제 오류:", error);

        button.disabled = false;
        alert(error.message);
    }
}

/* =========================
   일정 수정 팝업
========================= */

function showEditMessage(text) {
    editMessage.textContent = text;
    editMessage.className = "form-message error";
}

function openEditDialog(event) {
    editingEvent = event;

    editTitle.value = event.title;
    editType.value = event.type;
    editDate.value = event.date;
    editTime.value = event.time;
    editEndTime.value = event.endTime || "";
    editDescription.value = event.content || "";

    showEditMessage("");
    editSaveButton.disabled = false;

    editDialog.showModal();
    editTitle.focus();
}

function closeEditDialog() {
    editDialog.close();
    editingEvent = null;
}

editCancelButton.addEventListener("click", closeEditDialog);

// 팝업 바깥(어두운 배경)을 누르면 닫기
editDialog.addEventListener("click", (e) => {
    if (e.target === editDialog) {
        closeEditDialog();
    }
});

editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!editingEvent) {
        return;
    }

    const title = editTitle.value.trim();
    const type = editType.value;
    const date = editDate.value;
    const time = editTime.value;
    const endTime = editEndTime.value;
    const description = editDescription.value.trim();

    if (!title) {
        showEditMessage("일정 이름을 입력해주세요.");
        return;
    }

    if (title.length > 100) {
        showEditMessage("일정 이름은 100자 이내로 입력해주세요.");
        return;
    }

    if (!date) {
        showEditMessage("날짜를 선택해주세요.");
        return;
    }

    if (!time) {
        showEditMessage("시작 시간을 입력해주세요.");
        return;
    }

    if (endTime && endTime <= time) {
        showEditMessage("종료 시간은 시작 시간보다 늦어야 합니다.");
        return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
        showEditMessage(`세부내용은 ${MAX_DESCRIPTION_LENGTH}자 이내로 입력해주세요.`);
        return;
    }

    editSaveButton.disabled = true;
    showEditMessage("");

    try {
        const data = await request(`/api/events/${editingEvent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                type,
                description,
                date,
                time,
                endTime: endTime || null
            })
        });

        // 서버가 돌려준 최신 일정으로 바꾸고, 날짜가 바뀌었을 수 있으니 다시 정렬
        const index = allEvents.findIndex(item => item.id === editingEvent.id);

        if (index !== -1) {
            allEvents[index] = data.event;
        }

        sortEvents();
        renderList();
        closeEditDialog();

    } catch (error) {
        console.error("일정 수정 오류:", error);

        showEditMessage(error.message);
        editSaveButton.disabled = false;
    }
});

/* =========================
   필터 버튼
========================= */

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach(other => {
            const active = other === button;

            other.classList.toggle("active", active);
            other.setAttribute("aria-pressed", String(active));
        });

        renderList();
    });
});

/* =========================
   초기 실행
========================= */

loadEvents();
