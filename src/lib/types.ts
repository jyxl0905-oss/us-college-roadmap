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
export type ToeflStatus = 'none' | 'studying' | 'scored'

export interface OnboardingAnswers {
  gradYear: number | null
  applicantStatus: ApplicantStatus | null
  hasCounselor: YesNoUnknown | null
  schoolAccredited: YesNoUnknown | null
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
}

export const emptyAnswers: OnboardingAnswers = {
  gradYear: null,
  applicantStatus: null,
  hasCounselor: null,
  schoolAccredited: null,
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
}

export interface School {
  id: number
  name: string
  name_ko: string
  usnews_rank: number
  tier: Tier
  sat_mid50_low: number | null
  sat_mid50_high: number | null
  gpa_note: string
  intl_accept_rate: number | null
  need_blind_intl: boolean
  demonstrated_interest: boolean
  direct_admit_majors: string[]
  what_they_value: string
  source_url: string
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
  sort_order: number
}
