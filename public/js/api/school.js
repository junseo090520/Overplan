export async function searchSchools(keyword) {
    const res = await fetch(`/api/school/search?keyword=${encodeURIComponent(keyword)}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message || "학교 검색에 실패했습니다.");
    }
    return data.schools;
}
