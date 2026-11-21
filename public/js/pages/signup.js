import { signup } from "../api/auth.js";

const form = document.getElementById("signupForm");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");

// 서버(authService.js)와 같은 규칙: 영문/숫자/_ 4~30자
const ID_RULE = /^[a-zA-Z0-9_]{4,30}$/;

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

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

    submitButton.disabled = true;
    showMessage("");

    try {
        await signup(name, password);
        showMessage("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.", "success");
        setTimeout(() => {
            window.location.href = "/login.html";
        }, 1000);
    } catch (err) {
        showMessage(err.message);
        submitButton.disabled = false;
    }
});
