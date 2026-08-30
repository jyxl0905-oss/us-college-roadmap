import type { School } from './types'
import type { ProfileRow } from './profile'
import type { Fit } from '../board/boardLogic'

// 데이터 기준 분류(참고용) — 공식 수치(SAT 중간 50%, 국제학생 합격률)로만 계산하는 편집 가이드.
// 합격 가능성 예측이 아니다. 산식은 공개적으로 단순하게 유지:
//   · 국제학생 합격률 10% 미만 → 무조건 Reach (초저합격률 학교는 점수와 무관하게 도전)
//   · 내 SAT 밴드 중앙값 < 중간50% 하단 → Reach
//   · 하단~중앙 → Hard Target / 중앙~상단 → Target / 상단 초과 → Safety
// SAT 미응시·학교 데이터 미공개면 null (표시 안 함).
const bandMid: Record<string, number> = {
  '1500+': 1550,
  '1400-1490': 1445,
  '1300-1390': 1345,
  below1300: 1250,
}

export function dataFitOf(profile: ProfileRow, school: School): Fit | null {
  if (profile.sat_status !== 'taken' || !profile.sat_band) return null
  const my = bandMid[profile.sat_band]
  if (my === undefined) return null
  if (school.intl_accept_rate !== null && school.intl_accept_rate < 10) return 'reach'
  const lo = school.sat_mid50_low
  const hi = school.sat_mid50_high
  if (lo === null || hi === null || hi <= lo) return null
  if (my < lo) return 'reach'
  const mid = (lo + hi) / 2
  if (my < mid) return 'hard_target'
  if (my <= hi) return 'target'
  return 'safety'
}
