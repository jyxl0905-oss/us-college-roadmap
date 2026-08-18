import type { ChecklistItem } from './types'
import type { ProfileRow } from './profile'
import { bilingual, t } from '../i18n'

// 6축 밸런스 점수 (0~100)
// - rigor·testing: 프로필 값(GPA 밴드, 수학 트랙, AP 수, SAT/TOEFL)에서 자동 계산
// - spike·leadership·validation: 자가진단 초기값 + 해당 축 체크 시 가산
// - story: 체크 기반
export type Axis = 'rigor' | 'testing' | 'spike' | 'leadership' | 'validation' | 'story'

export const axisOrder: Axis[] = ['rigor', 'testing', 'spike', 'leadership', 'validation', 'story']

export const axisKo: Record<Axis, string> = bilingual<Axis>(
  { rigor: '학업 강도', testing: '시험', spike: '대표 활동', leadership: '리더십', validation: '교외 인정', story: '스토리 준비' },
  { rigor: 'Rigor', testing: 'Testing', spike: 'Spike', leadership: 'Leadership', validation: 'Validation', story: 'Story' },
)

// 스토리 준비 축 설명 (ⓘ 툴팁 공용 문구)
export const storyAxisTooltip = () =>
  t('에세이·원서에 쓸 재료가 준비되고 있는지를 봄 — 이야기의 좋고 나쁨을 평가하는 것이 아님', 'Tracks whether you are gathering material for essays and the application — not a judgment of how good your story is')

export type AxisScores = Record<Axis, number>

const gpaPts: Record<string, number> = {
  '3.9+': 40,
  '3.7-3.9': 32,
  '3.5-3.7': 24,
  'below3.5': 16,
  none: 20,
  ninth: 20,
}

const mathPts: Record<string, number> = {
  algebra2_or_below: 5,
  precalc: 10,
  calc: 15,
  post_calc: 20,
}

const satPts: Record<string, number> = {
  '1500+': 70,
  '1400-1490': 55,
  '1300-1390': 40,
  below1300: 25,
}

const selfPts: Record<number, number> = { 1: 20, 2: 45, 3: 70 }

// storyStats: 스토리 준비 점수용 — done(전 시즌 누적 완료 수) / exposed(현재 학년·시즌까지 노출된 항목 수).
// 저학년이 아직 보지도 못한 항목 때문에 낮게 진단되는 것을 방지 (§0-2)
// overrides: F5 내 원서 기록 기반 점수 (null이면 자가진단 사용). 기록 기반일 때도 해당 축 체크 가산은 유지
export function computeScores(
  p: ProfileRow,
  checkedItems: ChecklistItem[],
  storyStats?: { done: number; exposed: number },
  overrides?: { spike: number | null; leadership: number | null; validation: number | null },
): AxisScores {
  const checks = (axis: Axis) => checkedItems.filter((i) => i.axis === axis).length

  const apCount = Math.min((p.ap_completed ?? 0) + (p.ap_current ?? 0), 8)
  const rigor = (gpaPts[p.gpa_band ?? ''] ?? 20) + (mathPts[p.math_course ?? ''] ?? 5) + apCount * 5

  const sat =
    p.sat_status === 'taken'
      ? (satPts[p.sat_band ?? ''] ?? 25)
      : p.sat_status === 'studying'
        ? 15
        : 0
  // 국내(시민권·영주권) 지원자는 TOEFL이 필요 없으므로 만점 처리
  const toefl =
    p.applicant_status === 'domestic'
      ? 30
      : p.toefl_status === 'scored' || p.toefl_status === 'exempt'
        ? 30
        : p.toefl_status === 'studying'
          ? 15
          : 0

  const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

  return {
    rigor: cap(rigor),
    testing: cap(sat + toefl),
    spike: cap((overrides?.spike ?? selfPts[p.activity_spike ?? 1]) + checks('spike') * 10),
    leadership: cap((overrides?.leadership ?? selfPts[p.activity_leadership ?? 1]) + checks('leadership') * 10),
    validation: cap((overrides?.validation ?? selfPts[p.activity_validation ?? 1]) + checks('validation') * 10),
    story: storyStats
      ? cap((storyStats.done / Math.max(1, storyStats.exposed)) * 100)
      : cap(10 + checks('story') * 15),
  }
}

export function weakestAxis(scores: AxisScores): Axis {
  return axisOrder.reduce((weakest, axis) => (scores[axis] < scores[weakest] ? axis : weakest))
}

export function strongestAxis(scores: AxisScores): Axis {
  return axisOrder.reduce((strongest, axis) => (scores[axis] > scores[strongest] ? axis : strongest))
}

// 축 점수 → 처방 등급 (prescriptions.level과 매칭)
export type ScoreLevel = 'sufficient' | 'in_progress' | 'large_gap'

export function scoreLevel(score: number): ScoreLevel {
  if (score >= 70) return 'sufficient'
  if (score >= 40) return 'in_progress'
  return 'large_gap'
}

// prescriptions.grade_band('9', '9-10', 'all' 등)과 학년 매칭
export function gradeBandMatches(band: string, grade: number): boolean {
  if (band === 'all') return true
  if (band.includes('-')) {
    const [lo, hi] = band.split('-').map(Number)
    return grade >= lo && grade <= hi
  }
  return Number(band) === grade
}

export const axisDiagnosis: Record<Axis, string> = bilingual<Axis>(
  {
    rigor: '수업 난이도·성적 흐름이 상대적으로 약해요. 다음 학기 과목 선택에서 도전성을 한 단계 올려보세요.',
    testing: '표준시험 준비가 뒤처져 있어요. SAT/TOEFL 일정을 이번 시즌 안에 구체화해 보세요.',
    spike: '나를 대표하는 활동이 아직 흐릿해요. 하나를 골라 눈에 보이는 결과물을 만들어 보세요.',
    leadership: "역할이 '참여'에 머물러 있어요. 작은 팀에서라도 주도하는 경험을 만들어 보세요.",
    validation: '교외에서 검증받은 기록이 부족해요. 대회·외부 프로그램 등 외부 평가에 도전해 보세요.',
    story: '스토리 준비 항목을 하나씩 채워보세요 — 시즌마다 남긴 기록이 곧 에세이 재료가 돼요.',
  },
  {
    rigor: 'Course rigor and grade trend are relatively weak. Step up the challenge in next semester’s course choices.',
    testing: 'Standardized test prep is behind. Pin down an SAT/TOEFL schedule this season.',
    spike: 'Your signature activity is still fuzzy. Pick one and produce a visible result.',
    leadership: 'Your roles are still at the “participant” level. Find something to lead, even in a small team.',
    validation: 'You lack outside recognition. Try competitions or external programs that evaluate your work.',
    story: 'Fill in the story-prep items one at a time — what you record each season becomes essay material.',
  },
)

// SAT 밴드의 대표값 — 학교 중간 50% 범위 위 내 위치 표시용
export const satBandMid: Record<string, number> = {
  '1500+': 1550,
  '1400-1490': 1445,
  '1300-1390': 1345,
  below1300: 1250,
}
