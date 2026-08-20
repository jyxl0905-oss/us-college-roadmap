import { getLang, t } from '../i18n'
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
  { value: 'industrial_eng', label: '산업공학 (Industrial Engineering)', track: 'stem' },
  { value: 'math_data', label: '수학·통계·데이터 (Math·Stats·Data)', track: 'stem' },
  { value: 'data_science', label: '데이터 사이언스 (Data Science)', track: 'stem' },
  { value: 'applied_math', label: '응용수학 (Applied Math)', track: 'stem' },
  { value: 'actuarial', label: '보험계리 (Actuarial Science)', track: 'stem' },
  { value: 'natural_sci', label: '자연과학 (Natural Sciences)', track: 'stem' },
  { value: 'biology', label: '생명과학 (Biology)', track: 'stem' },
  { value: 'chemistry', label: '화학 (Chemistry)', track: 'stem' },
  { value: 'physics', label: '물리학 (Physics)', track: 'stem' },
  { value: 'environmental', label: '환경과학 (Environmental Science)', track: 'stem' },
  { value: 'premed', label: '보건·프리메드 (Health·Pre-med)', track: 'stem' },
  { value: 'nursing', label: '간호 (Nursing)', track: 'stem' },
  { value: 'public_health', label: '공중보건 (Public Health)', track: 'stem' },
  { value: 'architecture', label: '건축 (Architecture)', track: 'stem' },
  { value: 'business', label: '비즈니스·경제 (Business·Economics)', track: 'liberal' },
  { value: 'finance', label: '금융 (Finance)', track: 'liberal' },
  { value: 'social_sci', label: '사회과학 (Social Sciences)', track: 'liberal' },
  { value: 'prelaw', label: '법학·프리로 (Pre-Law)', track: 'liberal' },
  { value: 'psychology', label: '심리학 (Psychology)', track: 'liberal' },
  { value: 'cognitive_science', label: '인지과학 (Cognitive Science)', track: 'stem' },
  { value: 'humanities', label: '인문 (Humanities)', track: 'liberal' },
  { value: 'linguistics', label: '언어학 (Linguistics)', track: 'liberal' },
  { value: 'arts', label: '예술·디자인 (Art·Design)', track: 'liberal' },
  { value: 'media', label: '커뮤니케이션·미디어 (Communication·Media)', track: 'liberal' },
]

export function majorsByTrack(track: MajorTrack): MajorCategory[] {
  return majorCategories.filter((m) => m.track === track)
}

// 영어 UI에서는 괄호 안 영어 이름만 표시 (예: '컴퓨터과학 (CS)' → 'CS')
export function majorDisplay(m: MajorCategory): string {
  if (getLang() === 'ko') return m.label
  const en = m.label.match(/\(([^)]+)\)/)?.[1]
  return en ?? m.label
}

export function majorLabel(value: string | null): string {
  if (!value) return '-'
  if (value === 'undecided') return t('미정 (Undecided)', 'Undecided')
  const m = majorCategories.find((m) => m.value === value)
  return m ? majorDisplay(m) : value
}

// 세분 전공 → 체크리스트·direct-admit 판정용 상위 계열 (콘텐츠는 상위 계열 것을 그대로 사용)
export const majorAlias: Record<string, string> = {
  data_science: 'math_data',
  applied_math: 'math_data',
  biology: 'natural_sci',
  chemistry: 'natural_sci',
  physics: 'natural_sci',
  industrial_eng: 'engineering',
  finance: 'business',
  prelaw: 'social_sci',
  cognitive_science: 'psychology',
  environmental: 'natural_sci',
  actuarial: 'math_data',
  public_health: 'premed',
  linguistics: 'humanities',
}
export const majorParent = (value: string | null): string | null => (value ? (majorAlias[value] ?? value) : value)
