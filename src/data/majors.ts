// 희망 전공 카테고리 (UI 한국어 + 영어 병기, track: 이과=stem / 문과=liberal)
export type MajorTrack = 'stem' | 'liberal'

export interface MajorCategory {
  value: string
  label: string
  track: MajorTrack
}

export const majorCategories: MajorCategory[] = [
  { value: 'cs', label: '컴퓨터과학 (CS)', track: 'stem' },
  { value: 'engineering', label: '공학 (Engineering)', track: 'stem' },
  { value: 'math_data', label: '수학·통계·데이터 (Math·Stats·Data)', track: 'stem' },
  { value: 'natural_sci', label: '자연과학 (Natural Sciences)', track: 'stem' },
  { value: 'premed', label: '보건·프리메드 (Health·Pre-med)', track: 'stem' },
  { value: 'business', label: '비즈니스·경제 (Business·Economics)', track: 'liberal' },
  { value: 'social_sci', label: '사회과학 (Social Sciences)', track: 'liberal' },
  { value: 'humanities', label: '인문 (Humanities)', track: 'liberal' },
  { value: 'arts', label: '예술·디자인 (Art·Design)', track: 'liberal' },
]

export function majorsByTrack(track: MajorTrack): MajorCategory[] {
  return majorCategories.filter((m) => m.track === track)
}

export function majorLabel(value: string | null): string {
  if (!value) return '-'
  if (value === 'undecided') return '미정 (Undecided)'
  return majorCategories.find((m) => m.value === value)?.label ?? value
}
