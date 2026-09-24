import type { Activity, Honor, TestScore, Course, Essay, AppRecords } from '../app/appData'
import type { Plan } from '../app/plans'
import type { ApplicationRow } from '../board/boardLogic'
import { cycleSeasons } from '../app/plans'
import { t } from '../i18n'
import { DEMO_USER_ID } from './demoProfile'

// 체험 모드(/demo/app) 예시 기록 — 가상 학생(11학년·CS·목표 CMU·UIUC·GT·UCLA·UT). 화면 안에서만 바뀌고 저장되지 않음
export const isDemoUser = (userId: string | null | undefined) => userId === DEMO_USER_ID

interface DemoStore extends AppRecords { plans: Plan[]; applications: ApplicationRow[] }
let store: DemoStore | null = null
let nextId = -1000

export function demoId(): number { return nextId-- }

export function demoStore(): DemoStore {
  if (store) return store
  const [fall, spring, summer] = cycleSeasons().map((s) => s.label)
  const now = new Date().toISOString()
  const courses: Course[] = [
    ...([
      ['English 9', 'regular', 'A-'], ['Algebra 2', 'honors', 'A'], ['Biology', 'regular', 'A'], ['World History', 'regular', 'B+'], ['Spanish 1', 'regular', 'A'], ['Intro to Computer Science', 'regular', 'A'],
    ] as const).map(([name, level, g], i) => ({ id: -100 - i, grade: 9, name, level, letter_grade: g, percent: null, credits: 1 })),
    ...([
      ['English 10', 'honors', 'A-'], ['Precalculus', 'honors', 'A'], ['Chemistry', 'honors', 'B+'], ['AP World History', 'ap', 'A-'], ['Spanish 2', 'regular', 'A'], ['AP Computer Science A', 'ap', 'A'],
    ] as const).map(([name, level, g], i) => ({ id: -120 - i, grade: 10, name, level, letter_grade: g, percent: null, credits: 1 })),
    ...([
      ['English 11', 'regular'], ['AP Calculus BC', 'ap'], ['AP Physics C: Mechanics', 'ap'], ['US History', 'honors'], ['AP Microeconomics', 'ap'], ['Spanish 3', 'honors'],
    ] as const).map(([name, level], i) => ({ id: -140 - i, grade: 11, name, level, letter_grade: null, percent: null, credits: 1 })),
  ] as Course[]
  const activities: Activity[] = [
    { id: -200, sort_order: 0, category: 'club', position: 'Software Lead', organization: 'School Robotics Team', description: 'Lead a 4-person software team programming autonomous routines in Java; mentor 6 new members each fall.', grades: [9, 10, 11], timing: 'school_year', hours_per_week: 6, weeks_per_year: 30, continue_in_college: true },
    { id: -201, sort_order: 1, category: 'community', position: 'Founder & Instructor', organization: 'Code Buddies (free coding class)', description: 'Started weekly Python lessons for 12 middle schoolers at a local community center; wrote a 10-lesson curriculum.', grades: [10, 11], timing: 'year_round', hours_per_week: 3, weeks_per_year: 40, continue_in_college: true },
    { id: -202, sort_order: 2, category: 'academic', position: 'Competitor', organization: 'USA Computing Olympiad (USACO)', description: 'Solve algorithm problems in C++ each contest season; practice 4 hours a week with past problems.', grades: [10, 11], timing: 'school_year', hours_per_week: 4, weeks_per_year: 30, continue_in_college: false },
    { id: -203, sort_order: 3, category: 'arts', position: 'Tech Columnist', organization: 'School Newspaper', description: 'Write a monthly column explaining tech news for students; 8 columns published so far.', grades: [11], timing: 'school_year', hours_per_week: 2, weeks_per_year: 20, continue_in_college: false },
  ]
  const honors: Honor[] = [
    { id: -300, sort_order: 0, title: 'USACO Silver Division (promoted)', grade: 10, level: 'national', activity_id: -202 },
    { id: -301, sort_order: 1, title: 'Department Award in Mathematics', grade: 10, level: 'school', activity_id: null },
  ]
  const tests: TestScore[] = [
    { id: -400, kind: 'sat', taken_on: '2026-08-22', total: 1450, section_scores: { ebrw: 680, math: 770 }, subject: null },
    { id: -401, kind: 'toefl', taken_on: '2026-06-13', total: 108, section_scores: null, subject: null },
    { id: -402, kind: 'ap', taken_on: '2026-05-10', total: 5, section_scores: null, subject: 'Computer Science A' },
    { id: -403, kind: 'ap', taken_on: '2026-05-12', total: 4, section_scores: null, subject: 'World History: Modern' },
  ]
  const essays: Essay[] = [
    { id: -500, school_id: null, prompt: 'Common App personal essay — prompt 2 (a challenge or setback)', status: 'brainstorm', word_limit: 650, notes: t('로보틱스 대회 직전 코드가 전부 날아갔던 일 — 무엇을 배웠는지 중심으로', 'The robotics code wipe right before regionals — focus on what I learned'), body: null, body_saved_at: null },
    { id: -501, school_id: 20, prompt: 'Why CMU? (supplement)', status: 'not_started', word_limit: 300, notes: null, body: null, body_saved_at: null },
  ]
  const plans: Plan[] = [
    { id: -600, title: t('USACO Gold 승급 도전', 'Aim for USACO Gold'), axis: 'validation', season_label: fall, status: 'doing', notes: null, ref: 'program:usaco' },
    { id: -601, title: t('Code Buddies 두 번째 반 열기', 'Open a second Code Buddies class'), axis: 'leadership', season_label: spring, status: 'planned', notes: null },
    { id: -602, title: t('AP 시험 3과목 준비', 'Prep for 3 AP exams'), axis: 'rigor', season_label: spring, status: 'planned', notes: null },
    { id: -603, title: t('참가: CMU Pre-College Summer Session', 'Attend: CMU Pre-College Summer Session'), axis: 'spike', season_label: summer, status: 'planned', notes: null, ref: 'program:cmu_precollege_summer_session' },
  ]
  const applications: ApplicationRow[] = [
    { school_id: 20, round: 'ed', status: 'preparing', updated_at: now, student_deadline: null, fit: 'reach' },
    { school_id: 38, round: 'ea', status: 'preparing', updated_at: now, student_deadline: null, fit: 'hard_target' },
    { school_id: 32, round: 'ea', status: 'preparing', updated_at: now, student_deadline: null, fit: 'hard_target' },
    { school_id: 18, round: 'rd', status: 'preparing', updated_at: now, student_deadline: null, fit: 'reach' },
    { school_id: 31, round: 'rd', status: 'preparing', updated_at: now, student_deadline: null, fit: 'target' },
  ] as ApplicationRow[]
  store = { courses, activities, honors, tests, essays, plans, applications }
  return store
}

// appData의 테이블 이름 → 예시 기록 목록 (insert/update/delete를 화면 안에서만 반영)
export function demoTable(table: string): { id: number }[] | null {
  const s = demoStore()
  switch (table) {
    case 'activities': return s.activities
    case 'honors': return s.honors
    case 'test_scores': return s.tests
    case 'courses': return s.courses
    case 'essays': return s.essays
    case 'plans': return s.plans
    default: return null
  }
}
