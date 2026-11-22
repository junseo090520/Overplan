async function post(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || "요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    return data;
}

// school = { officeCode, schoolCode, schoolName }
export function signup(name, password, school) {
    return post("/api/auth/signup", {
        name,
        password,
        officeCode: school.officeCode,
        schoolCode: school.schoolCode,
        schoolName: school.schoolName,
    });
}

export function login(name, password) {
    return post("/api/auth/login", { name, password });
}

export function logout() {
    return post("/api/auth/logout", {});
}
