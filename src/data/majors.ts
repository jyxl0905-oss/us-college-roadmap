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
  { value: 'biomedical_eng', label: '바이오메디컬공학 (Biomedical Engineering)', track: 'stem' },
  { value: 'chemical_eng', label: '화학공학 (Chemical Engineering)', track: 'stem' },
  { value: 'aerospace_eng', label: '항공우주공학 (Aerospace Engineering)', track: 'stem' },
  { value: 'math_data', label: '수학·통계·데이터 (Math·Stats·Data)', track: 'stem' },
  { value: 'data_science', label: '데이터 사이언스 (Data Science)', track: 'stem' },
  { value: 'applied_math', label: '응용수학 (Applied Math)', track: 'stem' },
  { value: 'actuarial', label: '보험계리 (Actuarial Science)', track: 'stem' },
  { value: 'natural_sci', label: '자연과학 (Natural Sciences)', track: 'stem' },
  { value: 'biology', label: '생명과학 (Biology)', track: 'stem' },
  { value: 'genetics', label: '유전학 (Genetics)', track: 'stem' },
  { value: 'molecular_bio', label: '분자생물학 (Molecular Biology)', track: 'stem' },
  { value: 'microbiology', label: '미생물학 (Microbiology)', track: 'stem' },
  { value: 'neuroscience', label: '신경과학 (Neuroscience)', track: 'stem' },
  { value: 'chemistry', label: '화학 (Chemistry)', track: 'stem' },
  { value: 'physics', label: '물리학 (Physics)', track: 'stem' },
  { value: 'environmental', label: '환경과학 (Environmental Science)', track: 'stem' },
  { value: 'premed', label: '보건·프리메드 (Health·Pre-med)', track: 'stem' },
  { value: 'nursing', label: '간호 (Nursing)', track: 'stem' },
  { value: 'public_health', label: '공중보건 (Public Health)', track: 'stem' },
  { value: 'kinesiology', label: '키네시올로지·운동과학 (Kinesiology)', track: 'stem' },
  { value: 'architecture', label: '건축 (Architecture)', track: 'stem' },
  { value: 'business', label: '비즈니스·경제 (Business·Economics)', track: 'liberal' },
  { value: 'finance', label: '금융 (Finance)', track: 'liberal' },
  { value: 'economics', label: '경제학 (Economics)', track: 'liberal' },
  { value: 'accounting', label: '회계 (Accounting)', track: 'liberal' },
  { value: 'sport_management', label: '스포츠 매니지먼트 (Sport Management)', track: 'liberal' },
  { value: 'social_sci', label: '사회과학 (Social Sciences)', track: 'liberal' },
  { value: 'prelaw', label: '법학·프리로 (Pre-Law)', track: 'liberal' },
  { value: 'psychology', label: '심리학 (Psychology)', track: 'liberal' },
  { value: 'cognitive_science', label: '인지과학 (Cognitive Science)', track: 'stem' },
  { value: 'sport_psychology', label: '스포츠 심리학 (Sport Psychology)', track: 'liberal' },
  { value: 'humanities', label: '인문 (Humanities)', track: 'liberal' },
  { value: 'linguistics', label: '언어학 (Linguistics)', track: 'liberal' },
  { value: 'education', label: '교육학 (Education)', track: 'liberal' },
  { value: 'arts', label: '예술·디자인 (Art·Design)', track: 'liberal' },
  { value: 'media', label: '커뮤니케이션·미디어 (Communication·Media)', track: 'liberal' },
  { value: 'film', label: '영화 (Film)', track: 'liberal' },
  { value: 'music', label: '음악 (Music)', track: 'liberal' },
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
  biomedical_eng: 'engineering',
  chemical_eng: 'engineering',
  aerospace_eng: 'engineering',
  neuroscience: 'natural_sci',
  economics: 'business',
  accounting: 'business',
  education: 'psychology',
  film: 'media',
  music: 'arts',
  kinesiology: 'premed',
  sport_management: 'business',
  sport_psychology: 'psychology',
  genetics: 'biology',
  molecular_bio: 'biology',
  microbiology: 'biology',
}
// 별칭 체인 재귀 해석 (예: genetics → biology → natural_sci)
export const majorParent = (value: string | null): string | null => {
  if (!value) return value
  let v = value
  for (let i = 0; i < 5 && majorAlias[v]; i++) v = majorAlias[v]
  return v
}

// 목록 화면용 소그룹 — 트랙 안에서 비슷한 전공끼리 묶음 (모든 전공이 정확히 한 그룹에 속해야 함)
export interface MajorCluster { track: MajorTrack; ko: string; en: string; values: string[] }
export const majorClusters: MajorCluster[] = [
  { track: 'stem', ko: '공학·건축', en: 'Engineering & Architecture', values: ['engineering', 'industrial_eng', 'biomedical_eng', 'chemical_eng', 'aerospace_eng', 'architecture'] },
  { track: 'stem', ko: '컴퓨터·데이터', en: 'Computing & Data', values: ['cs', 'data_science', 'cognitive_science'] },
  { track: 'stem', ko: '수학', en: 'Math', values: ['math_data', 'applied_math', 'actuarial'] },
  { track: 'stem', ko: '자연과학', en: 'Natural Sciences', values: ['natural_sci', 'biology', 'genetics', 'molecular_bio', 'microbiology', 'neuroscience', 'chemistry', 'physics', 'environmental'] },
  { track: 'stem', ko: '보건·의료', en: 'Health & Medicine', values: ['premed', 'nursing', 'public_health', 'kinesiology'] },
  { track: 'liberal', ko: '비즈니스·경제', en: 'Business & Economics', values: ['business', 'finance', 'economics', 'accounting', 'sport_management'] },
  { track: 'liberal', ko: '사회·법·교육', en: 'Society, Law & Education', values: ['social_sci', 'prelaw', 'education'] },
  { track: 'liberal', ko: '심리', en: 'Psychology', values: ['psychology', 'sport_psychology'] },
  { track: 'liberal', ko: '인문·언어', en: 'Humanities & Language', values: ['humanities', 'linguistics'] },
  { track: 'liberal', ko: '예술·미디어', en: 'Arts & Media', values: ['arts', 'media', 'film', 'music'] },
]
