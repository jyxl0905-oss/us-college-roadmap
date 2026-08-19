import { bilingual, t } from '../i18n'
import type { Season } from './types'

// 학년도 롤오버 기준: 매년 8월 1일
// 예) 2026-08-04 기준 → 2026-27 학년도 → Class of 2027이면 12학년
export function currentSchoolYearEnd(now: Date = new Date()): number {
  const year = now.getFullYear()
  return now.getMonth() + 1 >= 8 ? year + 1 : year
}

// Class of {gradYear} 학생의 현재 학년 (9~12 밖이면 그대로 반환해 호출부에서 처리)
export function gradeFromGradYear(gradYear: number, now: Date = new Date()): number {
  return 12 - (gradYear - currentSchoolYearEnd(now))
}

export function currentSeason(now: Date = new Date()): Season {
  const month = now.getMonth() + 1
  if (month >= 8) return 'fall'
  if (month <= 5) return 'spring'
  return 'summer'
}

// user_checks.season_label용 식별자 (예: '2026-fall')
export function currentSeasonLabel(now: Date = new Date()): string {
  return `${now.getFullYear()}-${currentSeason(now)}`
}

// 리포트 푸터용 다음 체크인 안내
export function nextCheckinKo(now: Date = new Date()): string {
  const season = currentSeason(now)
  const y = now.getFullYear()
  if (season === 'fall') return t(`${y + 1}년 1월 (Spring 체크인)`, `January ${y + 1} (Spring check-in)`)
  if (season === 'spring') return t(`${y}년 6월 (Summer 체크인)`, `June ${y} (Summer check-in)`)
  return t(`${y}년 8월 (Fall 체크인)`, `August ${y} (Fall check-in)`)
}

export const seasonLabelKo: Record<Season, string> = bilingual<Season>(
  { fall: 'Fall (가을)', spring: 'Spring (봄)', summer: 'Summer (여름)' },
  { fall: 'Fall', spring: 'Spring', summer: 'Summer' },
)

// 마감 시기 문자열('11월 초') → 언어별 표시 ('early Nov'). 형식이 다르면 원문 그대로
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function timingLabel(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2})월\s*(초|중순|말)?$/)
  if (!m) return raw
  const month = MONTHS_EN[Number(m[1]) - 1]
  if (!month) return raw
  const part = m[2] === '초' ? 'early ' : m[2] === '중순' ? 'mid-' : m[2] === '말' ? 'late ' : ''
  return t(raw, `${part}${month}`)
}
