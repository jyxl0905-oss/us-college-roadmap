import type { Course } from './appData'

// GPA 계산 — 미국 대학·College Board에서 통용되는 표준 방식.
// 산식은 화면에 그대로 공개한다 (참고치 — 대학마다 재계산 방식이 다를 수 있음).
//  · Unweighted: A/A+=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, F=0
//  · % → 레터: College Board 표준 (97+=A+, 93–96=A, 90–92=A-, 87–89=B+, 83–86=B, 80–82=B-,
//              77–79=C+, 73–76=C, 70–72=C-, 67–69=D+, 65–66=D, <65=F)
//  · Weighted: AP·IB +1.0, Honors +0.5 (가장 흔한 방식 — 학교마다 다를 수 있음)

export const LETTER_POINTS: Record<string, number> = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7,
  'D+': 1.3, D: 1.0, F: 0,
}
export const LETTERS = Object.keys(LETTER_POINTS)

export function percentToLetter(p: number): string {
  if (p >= 97) return 'A+'
  if (p >= 93) return 'A'
  if (p >= 90) return 'A-'
  if (p >= 87) return 'B+'
  if (p >= 83) return 'B'
  if (p >= 80) return 'B-'
  if (p >= 77) return 'C+'
  if (p >= 73) return 'C'
  if (p >= 70) return 'C-'
  if (p >= 67) return 'D+'
  if (p >= 65) return 'D'
  return 'F'
}

// 과목의 확정 레터 (레터 입력 우선, 없으면 % 변환, 둘 다 없으면 null=미입력)
export function courseLetter(c: Course): string | null {
  if (c.letter_grade && c.letter_grade in LETTER_POINTS) return c.letter_grade
  if (c.percent !== null && c.percent !== undefined) return percentToLetter(c.percent)
  return null
}

export function weightBonus(level: Course['level']): number {
  return level === 'ap' || level === 'ib' ? 1.0 : level === 'honors' ? 0.5 : 0
}

export interface GpaResult {
  unweighted: number
  weighted: number
  gradedCredits: number // 성적이 입력된 학점 합
  totalCourses: number
}

export function computeGpa(courses: Course[]): GpaResult | null {
  let uwSum = 0
  let wSum = 0
  let credits = 0
  for (const c of courses) {
    const letter = courseLetter(c)
    if (letter === null) continue
    const cr = c.credits ?? 1
    const pts = LETTER_POINTS[letter]
    uwSum += pts * cr
    // F는 가중 보너스 없음 (통상 규칙)
    wSum += (pts + (pts > 0 ? weightBonus(c.level) : 0)) * cr
    credits += cr
  }
  if (credits === 0) return null
  return {
    unweighted: Math.round((uwSum / credits) * 100) / 100,
    weighted: Math.round((wSum / credits) * 100) / 100,
    gradedCredits: credits,
    totalCourses: courses.length,
  }
}

// 누적 unweighted GPA → 온보딩 GPA 밴드 (프로필 갱신 제안용)
export function gpaToBand(uw: number): string {
  if (uw >= 3.9) return '3.9+'
  if (uw >= 3.7) return '3.7-3.9'
  if (uw >= 3.5) return '3.5-3.7'
  return 'below3.5'
}
