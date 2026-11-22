const SCHEDULE_URL = "https://open.neis.go.kr/hub/SchoolSchedule";
const SCHOOL_INFO_URL = "https://open.neis.go.kr/hub/schoolInfo";

function getApiKey() {
    const apiKey = process.env.SCHOOL_SCHEDULE_API_KEY;

    if (!apiKey) {
        throw new Error("NEIS API 키가 설정되지 않았습니다.");
    }
    return apiKey;
}

// NEIS API를 호출해서 row 배열만 꺼내 돌려줌 (데이터가 없으면 빈 배열)
async function fetchRows(url, params, resultKey) {
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
        throw new Error(`NEIS API HTTP 오류: ${response.status}`);
    }

    const data = await response.json();
    const result = data[resultKey];

    if (!result) {
        const errorInfo = data.RESULT;

        if (errorInfo?.CODE === "INFO-200") {
            return [];
        }
        throw new Error(errorInfo?.MESSAGE || "NEIS API 응답 오류");
    }

    return result.find(item => item.row)?.row || [];
}

// 학교 이름으로 검색 (회원가입 화면에서 사용)
exports.searchSchools = async (keyword) => {
    const params = new URLSearchParams({
        KEY: getApiKey(),
        Type: "json",
        pIndex: "1",
        pSize: "20",
        SCHUL_NM: keyword
    });

    const rows = await fetchRows(SCHOOL_INFO_URL, params, "schoolInfo");

    return rows.map(item => ({
        officeCode: item.ATPT_OFCDC_SC_CODE,
        officeName: item.ATPT_OFCDC_SC_NM,
        schoolCode: item.SD_SCHUL_CODE,
        schoolName: item.SCHUL_NM,
        kind: item.SCHUL_KND_SC_NM || "",
        address: item.ORG_RDNMA || ""
    }));
};

// 월별 학사일정 조회: school = { educationCode, schoolCode }
exports.getMonthlySchedule = async (year, month, school) => {
    if (!school?.educationCode || !school?.schoolCode) {
        throw new Error("선택한 학교 정보가 없습니다.");
    }

    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();

    const params = new URLSearchParams({
        KEY: getApiKey(),
        Type: "json",
        pIndex: "1",
        pSize: "100",
        ATPT_OFCDC_SC_CODE: school.educationCode,
        SD_SCHUL_CODE: school.schoolCode,
        AA_FROM_YMD: `${year}${mm}01`,
        AA_TO_YMD: `${year}${mm}${lastDay}`
    });

    const rows = await fetchRows(SCHEDULE_URL, params, "SchoolSchedule");

    return rows.map(item => ({
        date: `${item.AA_YMD.slice(0, 4)}-${item.AA_YMD.slice(4, 6)}-${item.AA_YMD.slice(6, 8)}`,
        title: item.EVENT_NM,
        content: item.EVENT_CNTNT || "",
        type: "school"
    }));
};
