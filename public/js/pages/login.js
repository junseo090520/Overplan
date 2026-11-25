import { login } from "../api/auth.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");

// 로그인 성공 후 이동할 페이지
const REDIRECT_URL = "/pages/calendar.html";

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const password = form.password.value;

    if (!name || !password) {
        showMessage("아이디와 비밀번호를 모두 입력해주세요.");
        return;
    }

    submitButton.disabled = true;
    showMessage("");

    try {
        await login(name, password);
        window.location.href = REDIRECT_URL;
    } catch (err) {
        showMessage(err.message);
        submitButton.disabled = false;
    }
});
