import { signup } from "../api/auth.js";
import { searchSchools } from "../api/school.js";

const form = document.getElementById("signupForm");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");

const schoolKeyword = document.getElementById("schoolKeyword");
const schoolSearchButton = document.getElementById("schoolSearchButton");
const schoolResults = document.getElementById("schoolResults");
const selectedSchoolText = document.getElementById("selectedSchool");

// 서버(authService.js)와 같은 규칙: 영문/숫자/_ 4~30자
const ID_RULE = /^[a-zA-Z0-9_]{4,30}$/;

let selectedSchool = null;

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

/* =========================
   학교 검색 / 선택
========================= */

function selectSchool(school) {
    selectedSchool = school;
    schoolResults.hidden = true;
    selectedSchoolText.textContent = `선택한 학교: ${school.schoolName} (${school.officeName})`;
    selectedSchoolText.hidden = false;
    showMessage("");
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
        showMessage("학교 이름을 2글자 이상 입력해주세요.");
        return;
    }

    schoolSearchButton.disabled = true;
    showMessage("");

    try {
        const schools = await searchSchools(keyword);
        renderSchoolResults(schools);
    } catch (err) {
        showMessage(err.message);
    } finally {
        schoolSearchButton.disabled = false;
    }
}

schoolSearchButton.addEventListener("click", handleSchoolSearch);

// 검색창에서 Enter를 누르면 가입이 아니라 학교 검색이 되도록
schoolKeyword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleSchoolSearch();
    }
});

/* =========================
   회원가입
========================= */

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const password = form.password.value;
    const passwordConfirm = form.passwordConfirm.value;

    if (!ID_RULE.test(name)) {
        showMessage("아이디는 영문, 숫자, _ 로 4~30자여야 합니다.");
        return;
    }
    if (password.length < 8) {
        showMessage("비밀번호는 8자 이상이어야 합니다.");
        return;
    }
    if (password !== passwordConfirm) {
        showMessage("비밀번호가 서로 일치하지 않습니다.");
        return;
    }
    if (!selectedSchool) {
        showMessage("학교를 검색해서 선택해주세요.");
        return;
    }

    submitButton.disabled = true;
    showMessage("");

    try {
        await signup(name, password, selectedSchool);
        showMessage("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.", "success");
        setTimeout(() => {
            window.location.href = "/login.html";
        }, 1000);
    } catch (err) {
        showMessage(err.message);
        submitButton.disabled = false;
    }
});
