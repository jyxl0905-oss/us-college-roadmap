import { t } from '../i18n'

// CDS C7 "입학 심사 요소별 비중" — 각 대학 공식 Common Data Set 원문 기준 (src/data/c7.json)
// JSON의 g는 FACTORS 순서대로 한 글자씩: V=Very Important, I=Important, C=Considered, N=Not Considered, -=공란
export const FACTORS = [
  'rigor', 'class_rank', 'gpa', 'standardized_tests', 'essay', 'recommendations',
  'interview', 'extracurricular', 'talent', 'character', 'first_generation', 'legacy',
  'geographic', 'state_residency', 'religion', 'race_ethnicity', 'volunteer', 'work_experience', 'interest',
] as const
export type FactorKey = (typeof FACTORS)[number]
export type Level = 'VI' | 'I' | 'C' | 'NC'
export const LEVELS: Level[] = ['VI', 'I', 'C', 'NC']

// next: 공식 발표된 이후 입시의 시험 정책 변경 (entry = 입학 연도 = 고교 졸업 연도)
export interface TestNext { policy: 'test-required' | 'test-optional' | 'test-free'; entry: number; url: string }
// note: 시험 요건 예외·단과대별 차이 [한국어, 영어, 공식 출처]
export interface C7Row { id: number; year: string; url: string; levels: Record<FactorKey, Level | null>; next: TestNext | null; note: [string, string, string] | null }
interface Raw { id: number; year: string; url: string; g: string; next?: TestNext; note?: [string, string, string] }

const CODE: Record<string, Level | null> = { V: 'VI', I: 'I', C: 'C', N: 'NC', '-': null }

let cache: Promise<Map<number, C7Row>> | null = null
export const loadC7 = () =>
  (cache ??= import('../data/c7.json').then((m) => {
    const rows = (m.default as unknown as { schools: Raw[] }).schools
    return new Map(rows.map((r) => [r.id, { id: r.id, year: r.year, url: r.url, levels: Object.fromEntries(FACTORS.map((f, i) => [f, CODE[r.g[i]] ?? null])) as C7Row['levels'], next: r.next ?? null, note: r.note ?? null }]))
  }))

const FACTOR_LABELS: Record<FactorKey, [string, string]> = {
  rigor: ['과목 난이도', 'Course rigor'],
  class_rank: ['석차', 'Class rank'],
  gpa: ['GPA', 'GPA'],
  standardized_tests: ['시험 점수(SAT·ACT)', 'Test scores (SAT/ACT)'],
  essay: ['에세이', 'Essays'],
  recommendations: ['추천서', 'Recommendations'],
  interview: ['인터뷰', 'Interview'],
  extracurricular: ['활동', 'Extracurriculars'],
  talent: ['재능·특기', 'Talent / ability'],
  character: ['인성·자질', 'Character'],
  first_generation: ['가족 첫 대학생', 'First generation'],
  legacy: ['동문 자녀', 'Alumni relation'],
  geographic: ['출신 지역', 'Geographic residence'],
  state_residency: ['주 거주 여부', 'State residency'],
  religion: ['종교', 'Religious affiliation'],
  race_ethnicity: ['인종·민족', 'Race / ethnicity'],
  volunteer: ['봉사', 'Volunteer work'],
  work_experience: ['일 경험', 'Work experience'],
  interest: ['관심 표현', 'Level of interest'],
}
export const factorLabel = (k: FactorKey) => t(...FACTOR_LABELS[k])

const LEVEL_LABELS: Record<Level, [string, string]> = {
  VI: ['매우 중요', 'Very important'],
  I: ['중요', 'Important'],
  C: ['고려', 'Considered'],
  NC: ['반영 안 함', 'Not considered'],
}
export const levelLabel = (l: Level) => t(...LEVEL_LABELS[l])

// 단계별 색 — 진할수록 비중 큼
export const LEVEL_STYLE: Record<Level, { dot: string; chip: string }> = {
  VI: { dot: 'bg-blue-700', chip: 'bg-blue-700 text-white' },
  I: { dot: 'bg-blue-400', chip: 'bg-blue-100 text-blue-800' },
  C: { dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-700' },
  NC: { dot: 'bg-gray-200', chip: 'bg-white text-gray-400 ring-1 ring-gray-200' },
}

// 시험 미반영(test-free) 학교는 공시 표와 상관없이 '반영 안 함'으로 취급 (필터·비교·요약용)
export const effectiveTestLevel = (row: C7Row | undefined, policy: string | null): Level | null =>
  policy === 'test-free' ? 'NC' : row?.levels.standardized_tests ?? null
