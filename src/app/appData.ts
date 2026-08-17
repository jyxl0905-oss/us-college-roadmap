import { supabase } from '../lib/supabase'

// F5 가상 Common App — 학생 본인 기록 타입·CRUD (전부 본인 행만, RLS)

export const ACTIVITY_MAX = 10
export const HONOR_MAX = 5
export const LIMITS = { position: 50, organization: 100, description: 150, honorTitle: 100 } // 실제 Common App 글자 수

export type ActivityCategory =
  | 'academic' | 'arts' | 'athletics' | 'community' | 'work' | 'research' | 'club' | 'other'
export const activityCategoryKo: Record<ActivityCategory, string> = {
  academic: '학술', arts: '예술', athletics: '운동', community: '봉사', work: '직업·인턴',
  research: '리서치', club: '동아리', other: '기타',
}
export type ActivityTiming = 'school_year' | 'break' | 'year_round'
export const timingKo: Record<ActivityTiming, string> = {
  school_year: '학기 중', break: '방학', year_round: '연중',
}

export interface Activity {
  id: number
  sort_order: number
  category: ActivityCategory
  position: string
  organization: string
  description: string
  grades: number[]
  timing: ActivityTiming | null
  hours_per_week: number | null
  weeks_per_year: number | null
  continue_in_college: boolean | null
}

export type HonorLevel = 'school' | 'regional' | 'national' | 'international'
export const honorLevelKo: Record<HonorLevel, string> = {
  school: '교내', regional: '지역·주', national: '전국', international: '국제',
}
export interface Honor {
  id: number
  sort_order: number
  title: string
  grade: number | null
  level: HonorLevel | null
  activity_id: number | null
}

export type TestKind = 'sat' | 'toefl' | 'ielts' | 'ap'
export interface TestScore {
  id: number
  kind: TestKind
  taken_on: string | null
  total: number | null
  section_scores: Record<string, number> | null
  subject: string | null
}

export type CourseLevel = 'regular' | 'honors' | 'ap' | 'ib'
export const courseLevelKo: Record<CourseLevel, string> = { regular: '일반', honors: 'Honors', ap: 'AP', ib: 'IB' }
export interface Course {
  id: number
  grade: number
  name: string
  level: CourseLevel
}

export type EssayStatus = 'not_started' | 'brainstorm' | 'draft' | 'revising' | 'done'
export const essayStatusKo: Record<EssayStatus, string> = {
  not_started: '미시작', brainstorm: '브레인스토밍', draft: '초안', revising: '퇴고 중', done: '완료',
}
export interface Essay {
  id: number
  school_id: number | null // null = 개인 에세이
  prompt: string
  status: EssayStatus
  word_limit: number | null
  notes: string | null
}

export interface AppRecords {
  activities: Activity[]
  honors: Honor[]
  tests: TestScore[]
  courses: Course[]
  essays: Essay[]
}

export async function loadAppRecords(userId: string): Promise<AppRecords> {
  if (!supabase) return { activities: [], honors: [], tests: [], courses: [], essays: [] }
  const [a, h, t, c, e] = await Promise.all([
    supabase.from('activities').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('honors').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('test_scores').select('*').eq('user_id', userId).order('taken_on', { ascending: false }),
    supabase.from('courses').select('*').eq('user_id', userId).order('grade'),
    supabase.from('essays').select('*').eq('user_id', userId).order('id'),
  ])
  return {
    activities: (a.data ?? []) as Activity[],
    honors: (h.data ?? []) as Honor[],
    tests: (t.data ?? []) as TestScore[],
    courses: (c.data ?? []) as Course[],
    essays: (e.data ?? []) as Essay[],
  }
}

type Table = 'activities' | 'honors' | 'test_scores' | 'courses' | 'essays'

// 저장 실패를 조용히 삼키지 않음 — 실패 시 사용자에게 알리고 throw (호출부는 낙관적 갱신을 하지 않도록)
function fail(action: string, message: string): never {
  alert(`${action}에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.\n(${message})`)
  throw new Error(message)
}

export async function insertRow<T extends { id: number }>(table: Table, userId: string, row: Omit<T, 'id'>): Promise<T | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from(table).insert({ user_id: userId, ...row }).select('*').single()
  if (error) fail('저장', error.message)
  return (data as T) ?? null
}

export async function updateRow<T extends { id: number }>(table: Table, id: number, patch: Partial<T>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from(table).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) fail('저장', error.message)
}

export async function deleteRow(table: Table, id: number): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) fail('삭제', error.message)
}

// SAT 최고 총점 (회차별 총점 중 최고 — superscore 아님)
export function bestSat(tests: TestScore[]): TestScore | null {
  const sats = tests.filter((t) => t.kind === 'sat' && t.total !== null)
  if (sats.length === 0) return null
  return sats.reduce((a, b) => ((b.total ?? 0) > (a.total ?? 0) ? b : a))
}

export function satBandFromScore(total: number): string {
  if (total >= 1500) return '1500+'
  if (total >= 1400) return '1400-1490'
  if (total >= 1300) return '1300-1390'
  return 'below1300'
}
