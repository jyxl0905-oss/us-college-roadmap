// 비로그인 상세 CTA → 온보딩 Q6(목표 학교) 프리필 전달용
const PREFILL_KEY = 'prefill_school_id'

export function setPrefillSchoolId(id: number): void {
  localStorage.setItem(PREFILL_KEY, String(id))
}

export function readPrefillSchoolId(): number | null {
  const raw = localStorage.getItem(PREFILL_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function clearPrefill(): void {
  localStorage.removeItem(PREFILL_KEY)
}
