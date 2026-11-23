// 공통 요청 함수: 실패하면 서버 메시지와 상태 코드(status)를 담은 에러를 던짐
async function request(method, url, body) {
    const options = { method, headers: {} };

    if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data.message || "요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
        error.status = res.status;
        throw error;
    }
    return data;
}

// school = { officeCode, schoolCode, schoolName }
export function signup(name, password, school) {
    return request("POST", "/api/auth/signup", {
        name,
        password,
        officeCode: school.officeCode,
        schoolCode: school.schoolCode,
        schoolName: school.schoolName,
    });
}

export function login(name, password) {
    return request("POST", "/api/auth/login", { name, password });
}

export function logout() {
    return request("POST", "/api/auth/logout", {});
}

// 로그인한 내 정보 (아이디, 학교)
export function getMe() {
    return request("GET", "/api/auth/me");
}

export function changeSchool(school) {
    return request("PATCH", "/api/auth/school", {
        officeCode: school.officeCode,
        schoolCode: school.schoolCode,
        schoolName: school.schoolName,
    });
}

export function withdraw(password) {
    return request("DELETE", "/api/auth/me", { password });
}
