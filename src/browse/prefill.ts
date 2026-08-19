// 비로그인 둘러보기·비교 CTA → 온보딩 Q6(목표 학교) 프리필 전달용
const PREFILL_KEY = 'prefill_school_id'

export function setPrefillSchoolIds(ids: number[]): void {
  try {
    localStorage.setItem(PREFILL_KEY, ids.join(','))
  } catch {
    // 스토리지 차단 시 프리필 생략
  }
}

export function readPrefillSchoolIds(): number[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PREFILL_KEY)
  } catch {
    raw = null
  }
  if (!raw) return []
  return raw
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
}

export function clearPrefill(): void {
  try {
    localStorage.removeItem(PREFILL_KEY)
  } catch {
    // ignore
  }
}
