import { getMe, logout, changeSchool, withdraw } from "../api/auth.js";
import { searchSchools } from "../api/school.js";

/* =========================
   기본 설정
========================= */

const profileName = document.getElementById("profile-name");
const profileSchool = document.getElementById("profile-school");
const profileMessage = document.getElementById("profile-message");
const logoutButton = document.getElementById("logout-button");

const schoolEditButton = document.getElementById("school-edit-button");
const schoolEdit = document.getElementById("school-edit");
const schoolKeyword = document.getElementById("schoolKeyword");
const schoolSearchButton = document.getElementById("schoolSearchButton");
const schoolResults = document.getElementById("schoolResults");
const selectedSchoolText = document.getElementById("selectedSchool");
const schoolMessage = document.getElementById("school-message");
const schoolSaveButton = document.getElementById("school-save-button");
const schoolCancelButton = document.getElementById("school-cancel-button");

const withdrawOpenButton = document.getElementById("withdraw-open-button");
const withdrawForm = document.getElementById("withdraw-form");
const withdrawPassword = document.getElementById("withdrawPassword");
const withdrawMessage = document.getElementById("withdraw-message");
const withdrawSubmitButton = document.getElementById("withdraw-submit-button");
const withdrawCancelButton = document.getElementById("withdraw-cancel-button");

// 새로 선택한 학교 (검색 결과에서 고른 것)
let selectedSchool = null;

function showMessage(element, text, type = "error") {
    element.textContent = text;
    element.className = `form-message ${type}`;
}

function redirectToLogin() {
    window.location.href = "/login.html";
}

// 로그인이 풀린 경우(401)는 로그인 페이지로, 그 외에는 메시지를 표시
function handleError(error, messageElement) {
    if (error.status === 401) {
        redirectToLogin();
        return;
    }

    showMessage(messageElement, error.message);
}

/* =========================
   내 정보 불러오기
========================= */

async function loadProfile() {
    try {
        const me = await getMe();

        profileName.textContent = me.name;
        profileSchool.textContent = me.schoolName || "선택된 학교가 없습니다.";

    } catch (error) {
        handleError(error, profileMessage);
    }
}

/* =========================
   로그아웃
========================= */

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        await logout();
    } catch (error) {
        console.error("로그아웃 오류:", error);
    }

    redirectToLogin();
});

/* =========================
   학교 수정
========================= */

function openSchoolEdit() {
    schoolEdit.hidden = false;
    schoolEditButton.hidden = true;

    showMessage(profileMessage, "");
    schoolKeyword.focus();
}

function closeSchoolEdit() {
    schoolEdit.hidden = true;
    schoolEditButton.hidden = false;

    selectedSchool = null;
    schoolKeyword.value = "";
    schoolResults.innerHTML = "";
    schoolResults.hidden = true;
    selectedSchoolText.hidden = true;

    showMessage(schoolMessage, "");
}

function selectSchool(school) {
    selectedSchool = school;

    schoolResults.hidden = true;
    selectedSchoolText.textContent = `선택한 학교: ${school.schoolName} (${school.officeName})`;
    selectedSchoolText.hidden = false;

    showMessage(schoolMessage, "");
}

function renderSchoolResults(schools) {
    schoolResults.innerHTML = "";

    if (schools.length === 0) {
        const empty = document.createElement("li");

        empty.className = "school-empty";
        empty.textContent = "검색 결과가 없습니다.";
        schoolResults.appendChild(empty);
    }

    schools.forEach((school) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "school-result-button";

        const title = document.createElement("strong");
        title.textContent = school.schoolName;

        const sub = document.createElement("span");
        sub.textContent = [school.officeName, school.kind, school.address]
            .filter(Boolean)
            .join(" · ");

        button.append(title, sub);
        button.addEventListener("click", () => selectSchool(school));

        li.appendChild(button);
        schoolResults.appendChild(li);
    });

    schoolResults.hidden = false;
}

async function handleSchoolSearch() {
    const keyword = schoolKeyword.value.trim();

    if (keyword.length < 2) {
        showMessage(schoolMessage, "학교 이름을 2글자 이상 입력해주세요.");
        return;
    }

    schoolSearchButton.disabled = true;
    showMessage(schoolMessage, "");

    try {
        const schools = await searchSchools(keyword);
        renderSchoolResults(schools);
    } catch (error) {
        showMessage(schoolMessage, error.message);
    } finally {
        schoolSearchButton.disabled = false;
    }
}

async function handleSchoolSave() {
    if (!selectedSchool) {
        showMessage(schoolMessage, "학교를 검색해서 선택해주세요.");
        return;
    }

    schoolSaveButton.disabled = true;
    showMessage(schoolMessage, "");

    try {
        const result = await changeSchool(selectedSchool);

        profileSchool.textContent = result.schoolName;
        closeSchoolEdit();

        showMessage(
            profileMessage,
            "학교가 변경되었습니다. 캘린더의 학사일정도 새 학교 기준으로 보여요.",
            "success"
        );

    } catch (error) {
        handleError(error, schoolMessage);
    } finally {
        schoolSaveButton.disabled = false;
    }
}

schoolEditButton.addEventListener("click", openSchoolEdit);
schoolCancelButton.addEventListener("click", closeSchoolEdit);
schoolSearchButton.addEventListener("click", handleSchoolSearch);
schoolSaveButton.addEventListener("click", handleSchoolSave);

// 검색창에서 Enter를 누르면 학교 검색
schoolKeyword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleSchoolSearch();
    }
});

/* =========================
   회원 탈퇴
========================= */

function openWithdrawForm() {
    withdrawForm.hidden = false;
    withdrawOpenButton.hidden = true;

    withdrawPassword.focus();
}

function closeWithdrawForm() {
    withdrawForm.hidden = true;
    withdrawOpenButton.hidden = false;

    withdrawPassword.value = "";
    showMessage(withdrawMessage, "");
}

withdrawOpenButton.addEventListener("click", openWithdrawForm);
withdrawCancelButton.addEventListener("click", closeWithdrawForm);

withdrawForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = withdrawPassword.value;

    if (!password) {
        showMessage(withdrawMessage, "비밀번호를 입력해주세요.");
        return;
    }

    const confirmed = confirm(
        "정말 탈퇴할까요?\n계정과 모든 일정이 삭제되고 되돌릴 수 없어요."
    );

    if (!confirmed) {
        return;
    }

    withdrawSubmitButton.disabled = true;
    showMessage(withdrawMessage, "");

    try {
        await withdraw(password);

        alert("회원 탈퇴가 완료되었습니다.");
        redirectToLogin();

    } catch (error) {
        handleError(error, withdrawMessage);
        withdrawSubmitButton.disabled = false;
    }
});

/* =========================
   초기 실행
========================= */

loadProfile();
