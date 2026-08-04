import type { ChecklistItem } from './types'
import type { ProfileRow } from './profile'

// 6축 밸런스 점수 (0~100)
// - rigor·testing: 프로필 값(GPA 밴드, 수학 트랙, AP 수, SAT/TOEFL)에서 자동 계산
// - spike·leadership·validation: 자가진단 초기값 + 해당 축 체크 시 가산
// - story: 체크 기반
export type Axis = 'rigor' | 'testing' | 'spike' | 'leadership' | 'validation' | 'story'

export const axisOrder: Axis[] = ['rigor', 'testing', 'spike', 'leadership', 'validation', 'story']

export const axisKo: Record<Axis, string> = {
  rigor: '학업 강도',
  testing: '시험',
  spike: '대표 활동',
  leadership: '리더십',
  validation: '교외 인정',
  story: '스토리',
}

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

export function computeScores(p: ProfileRow, checkedItems: ChecklistItem[]): AxisScores {
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
      : p.toefl_status === 'scored'
        ? 30
        : p.toefl_status === 'studying'
          ? 15
          : 0

  const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

  return {
    rigor: cap(rigor),
    testing: cap(sat + toefl),
    spike: cap(selfPts[p.activity_spike ?? 1] + checks('spike') * 10),
    leadership: cap(selfPts[p.activity_leadership ?? 1] + checks('leadership') * 10),
    validation: cap(selfPts[p.activity_validation ?? 1] + checks('validation') * 10),
    story: cap(10 + checks('story') * 15),
  }
}

export function weakestAxis(scores: AxisScores): Axis {
  return axisOrder.reduce((weakest, axis) => (scores[axis] < scores[weakest] ? axis : weakest))
}

export const axisDiagnosis: Record<Axis, string> = {
  rigor: '수업 난이도·성적 흐름이 상대적으로 약해요. 다음 학기 과목 선택에서 도전성을 한 단계 올려보세요.',
  testing: '표준시험 준비가 뒤처져 있어요. SAT/TOEFL 일정을 이번 시즌 안에 구체화해 보세요.',
  spike: '나를 대표하는 활동이 아직 흐릿해요. 하나를 골라 눈에 보이는 결과물을 만들어 보세요.',
  leadership: "역할이 '참여'에 머물러 있어요. 작은 팀에서라도 주도하는 경험을 만들어 보세요.",
  validation: '교외에서 검증받은 기록이 부족해요. 대회·외부 프로그램 등 외부 평가에 도전해 보세요.',
  story: '활동들이 아직 하나의 이야기로 묶이지 않아요. 체크리스트의 스토리 항목부터 채워보세요.',
}

// SAT 밴드의 대표값 — 학교 중간 50% 범위 위 내 위치 표시용
export const satBandMid: Record<string, number> = {
  '1500+': 1550,
  '1400-1490': 1445,
  '1300-1390': 1345,
  below1300: 1250,
}
