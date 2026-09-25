import { subjectOf, type CourseInput } from './courseRecs'

// 학교별 고교 과목 요건·인터뷰 정책 (각 대학 공식 입학처 기준, 사용자 승인 후 반영) + 내 과목 기록과 대조
export type ReqSubject = 'english' | 'math' | 'science' | 'lab_science' | 'social' | 'language' | 'arts'
export interface YearsRule { req: number | null; rec: number | null }
export interface SpecificRule { course: 'calculus' | 'precalculus' | 'physics' | 'chemistry' | 'biology' | 'statistics'; level: 'required' | 'recommended'; for: string }
export interface CourseReqs {
  basis: 'required' | 'recommended' | 'mixed' | 'none_stated' | null
  english?: YearsRule | null; math?: YearsRule | null; science?: YearsRule | null; lab_science?: YearsRule | null
  social?: YearsRule | null; language?: YearsRule | null; arts?: YearsRule | null
  specific: SpecificRule[]
  extra_en: string | null; extra_ko: string | null
  source_url: string | null
}
export interface InterviewPolicy {
  offered: 'required' | 'recommended' | 'optional' | 'by_invitation' | 'informational_only' | 'not_offered' | null
  evaluative: boolean | null
  who: 'alumni' | 'admissions_staff' | 'students' | 'mixed' | null
  intl: 'available' | 'limited' | 'not_available' | 'not_stated' | null
  third_party: string | null; third_party_ko?: string | null
  how_en: string | null; how_ko: string | null
  source_url: string | null
}
export interface SchoolReq { id: number; courses: CourseReqs | null; interview: InterviewPolicy | null; note_en: string | null; note_ko: string | null }

let cache: Promise<Map<number, SchoolReq>> | null = null
export function loadSchoolReqs(): Promise<Map<number, SchoolReq>> {
  cache ??= import('../data/requirements.json').then((m) => new Map((m.default as unknown as { schools: SchoolReq[] }).schools.map((r) => [r.id, r])))
  return cache
}

export const REQ_SUBJECTS: { key: ReqSubject; ko: string; en: string }[] = [
  { key: 'english', ko: '영어', en: 'English' },
  { key: 'math', ko: '수학', en: 'Math' },
  { key: 'science', ko: '과학', en: 'Science' },
  { key: 'lab_science', ko: '실험 과학', en: 'Lab science' },
  { key: 'social', ko: '사회·역사', en: 'History / social' },
  { key: 'language', ko: '외국어', en: 'World language' },
  { key: 'arts', ko: '예술', en: 'Arts' },
]

const ARTS = /\bart\b|arts\b|music|drawing|design|theat(er|re)|film|dance|photograph|ceramic|choir|band|orchestra|미술|음악/i
const SPECIFIC: Record<SpecificRule['course'], RegExp> = {
  calculus: /(?<!pre[-\s]?)\bcal(c(ulus)?)?\b|미적분|\b(aa|analysis)\b.*\b(sl|hl)\b/i,
  precalculus: /pre-?\s*cal|trigonometry|(?<!pre[-\s]?)\bcal(c(ulus)?)?\b/i, // 미적분을 들었으면 프리캘 충족
  physics: /physics|물리/i,
  chemistry: /chem|화학/i,
  biology: /\bbio|생물/i,
  statistics: /statistic|통계/i,
}

// 과목 분류별로 기록이 있는 학년 수 (9–12학년, 한 학년에 여러 과목이어도 1년)
export function yearsOf(courses: CourseInput[], subject: ReqSubject): number {
  const grades = new Set<number>()
  for (const c of courses) {
    if (c.grade < 9 || c.grade > 12) continue
    const s = subjectOf(c)
    const hit = subject === 'arts' ? ARTS.test(c.name) : subject === 'lab_science' ? s === 'science' : s === subject
    if (hit) grades.add(c.grade)
  }
  return grades.size
}

export type CheckStatus = 'met' | 'on_track' | 'short'
export interface SubjectCheck { key: ReqSubject; target: number; kind: 'required' | 'recommended'; have: number; status: CheckStatus }
export interface SpecificCheck { rule: SpecificRule; done: boolean }

// 요건 대비 내 기록 — 지금까지 들은 학년 수 + 남은 학년(12학년까지 매년 들으면)으로 판단
export function checkReqs(r: CourseReqs, courses: CourseInput[], grade: number): { subjects: SubjectCheck[]; specific: SpecificCheck[] } {
  const g = Math.min(12, Math.max(9, grade))
  const remaining = 12 - g
  const subjects: SubjectCheck[] = []
  for (const s of REQ_SUBJECTS) {
    const rule = r[s.key]
    if (!rule) continue
    const target = rule.req ?? rule.rec
    if (!target) continue
    const have = yearsOf(courses, s.key)
    const thisYear = courses.some((c) => c.grade === g && (s.key === 'arts' ? ARTS.test(c.name) : (s.key === 'lab_science' ? subjectOf(c) === 'science' : subjectOf(c) === s.key)))
    // 올해 과목을 아직 안 적었으면 올해도 남은 해로 셈
    const left = remaining + (thisYear ? 0 : 1)
    subjects.push({ key: s.key, target, kind: rule.req ? 'required' : 'recommended', have, status: have >= target ? 'met' : have + left >= target ? 'on_track' : 'short' })
  }
  const specific = (r.specific ?? []).map((rule) => ({ rule, done: courses.some((c) => SPECIFIC[rule.course].test(c.name)) }))
  return { subjects, specific }
}
