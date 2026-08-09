import type { OnboardingAnswers, ChecklistItem, School, Tier, QuizAnswer } from './types'
import { supabase } from './supabase'
import { gradeFromGradYear, currentSeason } from './academics'
import schoolsData from '../data/schools.seed.json'

const schools = schoolsData as School[]

// profiles 테이블 row (snake_case). user_id는 저장 시 채움
export interface ProfileRow {
  user_id?: string
  nickname: string | null
  grad_year: number | null
  applicant_status: string | null
  has_counselor: string | null
  school_accredited: string | null
  major_primary: string | null
  major_secondary: string | null
  target_mode: string | null
  target_school_ids: number[]
  target_tier: number | null
  gpa_band: string | null
  math_course: string | null
  sat_status: string | null
  sat_band: string | null
  ap_completed: number | null
  ap_current: number | null
  toefl_status: string | null
  activity_spike: number | null
  activity_leadership: number | null
  activity_validation: number | null
  quiz_answers: QuizAnswer[] | null
  info_sources: string[] | null
  research_consent: boolean
}

export function answersToRow(
  a: OnboardingAnswers,
  nickname: string,
  researchConsent = false,
): ProfileRow {
  return {
    nickname,
    grad_year: a.gradYear,
    applicant_status: a.applicantStatus,
    has_counselor: a.hasCounselor,
    school_accredited: a.schoolAccredited,
    major_primary: a.majorPrimary,
    major_secondary: a.majorSecondary,
    target_mode: a.targetMode,
    target_school_ids: a.targetSchoolIds,
    target_tier: a.targetTier,
    gpa_band: a.gpaBand,
    math_course: a.mathCourse,
    sat_status: a.satStatus,
    sat_band: a.satBand,
    ap_completed: a.apCompleted,
    ap_current: a.apCurrent,
    toefl_status: a.toeflStatus,
    activity_spike: a.activitySpike,
    activity_leadership: a.activityLeadership,
    activity_validation: a.activityValidation,
    quiz_answers: a.quizAnswers,
    info_sources: a.infoSources.length > 0 ? a.infoSources : null,
    research_consent: researchConsent,
  }
}

export async function saveProfile(userId: string, row: ProfileRow): Promise<void> {
  if (!supabase) throw new Error('Supabase 미설정')
  const { error } = await supabase.from('profiles').upsert({ ...row, user_id: userId })
  if (error) throw error
}

export async function loadProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// 프로필의 현재 학년 (9~12 범위로 클램프)
export function profileGrade(p: ProfileRow): number {
  if (!p.grad_year) return 9
  return Math.min(12, Math.max(9, gradeFromGradYear(p.grad_year)))
}

// 목표 티어 집합: tier 모드면 그 티어, 학교 모드면 선택 학교들의 티어
function targetTiers(p: ProfileRow): Set<Tier> {
  if (p.target_mode === 'tier' && p.target_tier) return new Set([p.target_tier as Tier])
  if (p.target_mode === 'schools') {
    return new Set(
      p.target_school_ids
        .map((id) => schools.find((s) => s.id === id)?.tier)
        .filter((t): t is Tier => t !== undefined),
    )
  }
  return new Set()
}

// §0-2: 현재 학년·시즌까지 이 학생에게 노출된 story 태그 항목 수 (스토리 준비 점수의 분모)
// 학년 순서: 9→12, 학년 내 시즌 순서: fall→spring→summer (미국 학년도 기준)
const seasonOrder: Record<string, number> = { fall: 1, spring: 2, summer: 3 }

export function countStoryExposure(items: ChecklistItem[], p: ProfileRow): number {
  const grade = profileGrade(p)
  const nowSeason = seasonOrder[currentSeason()]
  const exposedGradeSeasons: { grade: number; season: string }[] = []
  for (let g = 9; g <= grade; g++) {
    for (const s of ['fall', 'spring', 'summer']) {
      if (g < grade || seasonOrder[s] <= nowSeason) exposedGradeSeasons.push({ grade: g, season: s })
    }
  }
  const storyIds = new Set<number>()
  for (const gs of exposedGradeSeasons) {
    for (const item of filterChecklist(items, p, gs)) {
      if (item.axis === 'story') storyIds.add(item.id)
    }
  }
  return storyIds.size
}

// 핵심 로직: 학년·시즌·전공·티어·국제학생·카운슬러 조건으로 체크리스트 필터
// opts로 과거 시즌(체크인 화면)의 학년·시즌을 지정할 수 있음
export function filterChecklist(
  items: ChecklistItem[],
  p: ProfileRow,
  opts?: { grade?: number; season?: string },
): ChecklistItem[] {
  const grade = opts?.grade ?? profileGrade(p)
  const season = opts?.season ?? currentSeason()
  const tiers = targetTiers(p)
  const isIntl = p.applicant_status !== 'domestic'
  const noCounselor = p.has_counselor !== 'yes'

  return items
    .filter((item) => {
      if (item.grade !== grade || item.season !== season) return false
      if (
        item.major_category !== null &&
        item.major_category !== p.major_primary &&
        item.major_category !== p.major_secondary
      )
        return false
      if (item.tier_condition !== null && !tiers.has(item.tier_condition)) return false
      if (item.intl_only && !isIntl) return false
      if (item.no_counselor_only && !noCounselor) return false
      return true
    })
    .sort((x, y) => x.sort_order - y.sort_order)
}
