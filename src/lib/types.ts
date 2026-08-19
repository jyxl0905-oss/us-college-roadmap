export type ApplicantStatus = 'intl' | 'domestic' | 'unknown'
export type YesNoUnknown = 'yes' | 'no' | 'unknown'
export type TargetMode = 'schools' | 'tier' | 'undecided'
export type Season = 'fall' | 'spring' | 'summer'
export type Tier = 1 | 2 | 3
export type ActivityLevel = 1 | 2 | 3

export type GpaBand = '3.9+' | '3.7-3.9' | '3.5-3.7' | 'below3.5' | 'none' | 'ninth'
export type MathCourse = 'algebra2_or_below' | 'precalc' | 'calc' | 'post_calc'
export type SatStatus = 'none' | 'studying' | 'taken'
export type SatBand = '1500+' | '1400-1490' | '1300-1390' | 'below1300'
export type ToeflStatus = 'none' | 'studying' | 'scored' | 'exempt' // exempt = 면제 대상일 수 있음(학교별 확인 필요)

export type MajorTrackChoice = 'stem' | 'liberal' | 'undecided'

// 온보딩 OX 퀴즈 응답 (R1)
export interface QuizAnswer {
  id: number
  answer: boolean // 사용자가 고른 O(true)/X(false)
  correct: boolean
}

export interface QuizItem {
  id: number
  question: string
  answer: boolean
  explanation_2lines: string
  sort_order: number
}

export interface ClarityItem {
  id: number
  question: string
  sort_order: number
}

export interface OnboardingAnswers {
  gradYear: number | null
  applicantStatus: ApplicantStatus | null
  hasCounselor: YesNoUnknown | null
  schoolAccredited: YesNoUnknown | null
  schoolInUs: boolean // 미국 현지 학교 재학
  schoolName: string | null // 다니는 학교 이름 (선택, 통계용)
  majorTrack: MajorTrackChoice | null
  majorPrimary: string | null
  majorSecondary: string | null
  targetMode: TargetMode | null
  targetSchoolIds: number[]
  targetTier: Tier | null
  gpaBand: GpaBand | null
  mathCourse: MathCourse | null
  satStatus: SatStatus | null
  satBand: SatBand | null
  apCompleted: number | null
  apCurrent: number | null
  toeflStatus: ToeflStatus | null
  activitySpike: ActivityLevel | null
  activityLeadership: ActivityLevel | null
  activityValidation: ActivityLevel | null
  quizAnswers: QuizAnswer[] | null
  infoSources: string[]
}

export const emptyAnswers: OnboardingAnswers = {
  gradYear: null,
  applicantStatus: null,
  hasCounselor: null,
  schoolAccredited: null,
  schoolInUs: false,
  schoolName: null,
  majorTrack: null,
  majorPrimary: null,
  majorSecondary: null,
  targetMode: null,
  targetSchoolIds: [],
  targetTier: null,
  gpaBand: null,
  mathCourse: null,
  satStatus: null,
  satBand: null,
  apCompleted: null,
  apCurrent: null,
  toeflStatus: null,
  activitySpike: null,
  activityLeadership: null,
  activityValidation: null,
  quizAnswers: null,
  infoSources: [],
}

export interface School {
  id: number
  name: string
  name_ko: string
  usnews_rank: number
  tier: Tier
  sat_mid50_low: number | null
  sat_mid50_high: number | null
  gpa_note: string | null
  intl_accept_rate: number | null
  need_blind_intl: boolean | null // null = 학교가 공식 표명하지 않음
  demonstrated_interest: boolean | null
  direct_admit_majors: string[]
  what_they_value: string
  source_url: string
  test_policy: string | null // test-required / test-optional / test-free
  intro_ko: string | null
  location_note: string | null
  // F3: 마감 캘린더 — 공식 입학처만, 확인 불가 시 null (시드 JSON엔 아직 없을 수 있어 optional)
  ed_offered?: boolean | null
  ed2_offered?: boolean | null
  ea_offered?: boolean | null
  rea_offered?: boolean | null
  ed_timing?: string | null // "11월 초" 형식 (월+순)
  ed2_timing?: string | null
  ea_timing?: string | null // REA/SCEA 시기도 여기에
  rd_timing?: string | null
  deadlines_source_url?: string | null
  deadlines_verified_at?: string | null
  // F4: CDS C7에서 Very Important로 공시된 요소 슬러그 (null = 미확인/미공시)
  c7_very_important?: string[] | null
  c7_source_url?: string | null
}

export interface ChecklistItem {
  id: number
  title: string
  why_how: string
  grade: number
  season: Season
  major_category: string | null
  tier_condition: Tier | null
  intl_only: boolean
  no_counselor_only: boolean
  axis: 'rigor' | 'testing' | 'spike' | 'leadership' | 'validation' | 'story'
  is_guide: boolean
  sort_order: number
}
