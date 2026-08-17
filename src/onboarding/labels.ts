import type { OnboardingAnswers, School } from '../lib/types'
import { majorLabel } from '../data/majors'
import schoolsData from '../data/schools.index.json' // 경량 인덱스(id·이름·티어) — 전체 시드는 schoolsCache에서만

const schools = schoolsData as School[]

export const tierLabels: Record<number, string> = {
  1: 'Top 20',
  2: '21-40위',
  3: '41-60위',
}

export const gpaBandLabels: Record<string, string> = {
  '3.9+': '3.9 이상',
  '3.7-3.9': '3.7 ~ 3.9',
  '3.5-3.7': '3.5 ~ 3.7',
  'below3.5': '3.5 미만',
  'none': 'GPA가 없는 학교',
  'ninth': '9학년이라 아직 없음',
}

export const mathCourseLabels: Record<string, string> = {
  algebra2_or_below: 'Algebra 2 이하',
  precalc: 'Precalculus',
  calc: 'Calculus (AB·BC)',
  post_calc: 'Calculus 이후 과정',
}

export const satStatusLabels: Record<string, string> = {
  none: '아직 계획 없음',
  studying: '공부 중',
  taken: '응시했음',
}

export const toeflStatusLabels: Record<string, string> = {
  none: '미응시',
  studying: '공부 중',
  scored: '점수 있음',
}

export const activityLevelLabels: Record<number, string> = {
  1: '아직 없음',
  2: '어느 정도 있음',
  3: '뚜렷하게 있음',
}

// 요약 화면용 한 줄 문자열 생성
export function summaryRows(a: OnboardingAnswers): [string, string][] {
  const targetText =
    a.targetMode === 'schools'
      ? a.targetSchoolIds
          .map((id) => schools.find((s) => s.id === id)?.name ?? `#${id}`)
          .join(', ')
      : a.targetMode === 'tier' && a.targetTier
        ? tierLabels[a.targetTier]
        : '미정'

  const statusText =
    a.applicantStatus === 'intl'
      ? '국제학생 (International)'
      : a.applicantStatus === 'domestic'
        ? '시민권·영주권'
        : '모름 → 국제학생 기준으로 안내'

  const rows: [string, string][] = [
    ['졸업연도', a.gradYear ? `Class of ${a.gradYear}` : '-'],
    ['지원 신분', statusText],
    ['전담 카운슬러', a.hasCounselor === 'yes' ? '있음' : a.hasCounselor === 'no' ? '없음' : '모름'],
    ['학교 국제 인증', a.schoolAccredited === 'yes' ? '있음' : a.schoolAccredited === 'no' ? '없음' : '모름 → 확인 필요'],
    ['계열', a.majorTrack === 'stem' ? '이과 (STEM)' : a.majorTrack === 'liberal' ? '문과 (Humanities·Social)' : '미정'],
    ['희망 전공 1순위', majorLabel(a.majorPrimary)],
    ['희망 전공 2순위', a.majorSecondary ? majorLabel(a.majorSecondary) : '없음'],
    ['목표 학교', targetText],
    ['GPA', a.gpaBand ? gpaBandLabels[a.gpaBand] : '-'],
    ['현재 수학', a.mathCourse ? mathCourseLabels[a.mathCourse] : '-'],
    ['SAT', a.satStatus === 'taken' && a.satBand ? `응시 (${a.satBand})` : a.satStatus ? satStatusLabels[a.satStatus] : '-'],
    ['AP', `완료 ${a.apCompleted ?? 0}개 · 수강 중 ${a.apCurrent ?? 0}개`],
  ]

  if (a.toeflStatus) rows.push(['TOEFL/IELTS', toeflStatusLabels[a.toeflStatus]])

  rows.push(
    ['대표 활동 (Spike)', a.activitySpike ? activityLevelLabels[a.activitySpike] : '-'],
    ['리더십 (Leadership)', a.activityLeadership ? activityLevelLabels[a.activityLeadership] : '-'],
    ['교외 인정 (Validation)', a.activityValidation ? activityLevelLabels[a.activityValidation] : '-'],
  )

  return rows
}
