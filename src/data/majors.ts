// 희망 전공 카테고리 (UI 한국어 + 영어 병기)
export interface MajorCategory {
  value: string
  label: string
}

export const majorCategories: MajorCategory[] = [
  { value: 'cs', label: '컴퓨터과학 (CS)' },
  { value: 'engineering', label: '공학 (Engineering)' },
  { value: 'business', label: '비즈니스·경제 (Business·Economics)' },
  { value: 'math_data', label: '수학·통계·데이터 (Math·Stats·Data)' },
  { value: 'natural_sci', label: '자연과학 (Natural Sciences)' },
  { value: 'premed', label: '보건·프리메드 (Health·Pre-med)' },
  { value: 'social_sci', label: '사회과학 (Social Sciences)' },
  { value: 'humanities', label: '인문 (Humanities)' },
  { value: 'arts', label: '예술·디자인 (Art·Design)' },
  { value: 'undecided', label: '미정 (Undecided)' },
]

export function majorLabel(value: string | null): string {
  if (!value) return '-'
  return majorCategories.find((m) => m.value === value)?.label ?? value
}
