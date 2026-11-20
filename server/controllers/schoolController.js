
const schoolService = require("../services/schoolService");

exports.getSchedule = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (
            !/^\d{4}$/.test(year || "") ||
            !/^(0?[1-9]|1[0-2])$/.test(month || "")
        ) {
            return res.status(400).json({
                message: "올바른 연도와 월을 입력하세요."
            });
        }

        const schedules = await schoolService.getMonthlySchedule(
            Number(year),
            Number(month)
        );

        res.json({
            success: true,
            schedules
        });

    } catch (error) {
        console.error("학사일정 조회 오류:", error);

        res.status(500).json({
            success: false,
            message: "학사일정을 불러오지 못했습니다."
        });
    }
};
