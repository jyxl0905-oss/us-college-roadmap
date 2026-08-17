// F2 비교 담기 — 리스트↔상세를 오가도 선택이 유지되도록 sessionStorage에 보관 (최대 3개)
const KEY = 'compare_ids'
export const COMPARE_MAX = 3

export function readCompareIds(): number[] {
  try {
    const arr = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)).slice(0, COMPARE_MAX) : []
  } catch {
    return []
  }
}

export function writeCompareIds(ids: number[]): void {
  sessionStorage.setItem(KEY, JSON.stringify(ids.slice(0, COMPARE_MAX)))
}

export function toggleCompareId(ids: number[], id: number): number[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  return ids.length >= COMPARE_MAX ? ids : [...ids, id]
}
