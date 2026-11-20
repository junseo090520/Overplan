
const API_URL = "https://open.neis.go.kr/hub/SchoolSchedule";

// 미림마이스터고등학교
const SCHOOL_INFO = {
    educationCode: "B10",
    // schoolCode: "7011569" //미림마고
    schoolCode: "7010072" //금천고
};

exports.getMonthlySchedule = async (year, month) => {
    const apiKey = process.env.SCHOOL_SCHEDULE_API_KEY;

    if (!apiKey) {
        throw new Error("NEIS API 키가 설정되지 않았습니다.");
    }

    const startDate = `${year}${String(month).padStart(2, "0")}01`;

    const lastDay = new Date(year, month, 0).getDate();

    const endDate =
        `${year}${String(month).padStart(2, "0")}${lastDay}`;

    const params = new URLSearchParams({
        KEY: apiKey,
        Type: "json",
        pIndex: "1",
        pSize: "100",
        ATPT_OFCDC_SC_CODE: SCHOOL_INFO.educationCode,
        SD_SCHUL_CODE: SCHOOL_INFO.schoolCode,
        AA_FROM_YMD: startDate,
        AA_TO_YMD: endDate
    });

    const response = await fetch(`${API_URL}?${params}`);

    if (!response.ok) {
        throw new Error(`NEIS API HTTP 오류: ${response.status}`);
    }

    const data = await response.json();

    const result = data.SchoolSchedule;

    if (!result) {
        const errorInfo = data.RESULT;

        if (errorInfo?.CODE === "INFO-200") {
            return [];
        }

        throw new Error(
            errorInfo?.MESSAGE || "NEIS API 응답 오류"
        );
    }

    const rows = result.find(item => item.row)?.row || [];

    return rows.map(item => ({
        date: `${item.AA_YMD.slice(0, 4)}-${item.AA_YMD.slice(4, 6)}-${item.AA_YMD.slice(6, 8)}`,
        title: item.EVENT_NM,
        content: item.EVENT_CNTNT || "",
        type: "school"
    }));
};
