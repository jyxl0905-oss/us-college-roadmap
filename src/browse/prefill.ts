// 비로그인 둘러보기·비교 CTA → 온보딩 Q6(목표 학교) 프리필 전달용
const PREFILL_KEY = 'prefill_school_id'

export function setPrefillSchoolIds(ids: number[]): void {
  localStorage.setItem(PREFILL_KEY, ids.join(','))
}

export function readPrefillSchoolIds(): number[] {
  const raw = localStorage.getItem(PREFILL_KEY)
  if (!raw) return []
  return raw
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
}

export function clearPrefill(): void {
  localStorage.removeItem(PREFILL_KEY)
}
