import { t, bilingual } from '../i18n'
import type { OnboardingAnswers, School } from '../lib/types'
import { majorLabel } from '../data/majors'
import schoolsData from '../data/schools.index.json' // 경량 인덱스(id·이름·티어) — 전체 시드는 schoolsCache에서만

const schools = schoolsData as School[]

export const tierLabels: Record<number, string> = bilingual<number>(
  { 1: 'Top 20', 2: '21-40위', 3: '41-60위' },
  { 1: 'Top 20', 2: 'Ranks 21–40', 3: 'Ranks 41–60' },
)

export const gpaBandLabels: Record<string, string> = bilingual(
  {
    '3.9+': '3.9 이상',
    '3.7-3.9': '3.7 ~ 3.9',
    '3.5-3.7': '3.5 ~ 3.7',
    'below3.5': '3.5 미만',
    'none': 'GPA가 없는 학교',
    'ninth': '9학년이라 아직 없음',
  },
  {
    '3.9+': '3.9 or higher',
    '3.7-3.9': '3.7 – 3.9',
    '3.5-3.7': '3.5 – 3.7',
    'below3.5': 'Below 3.5',
    'none': 'School doesn’t give GPAs',
    'ninth': 'None yet (9th grade)',
  },
)

export const mathCourseLabels: Record<string, string> = bilingual(
  {
    algebra2_or_below: 'Algebra 2 이하',
    precalc: 'Precalculus',
    calc: 'Calculus (AB·BC)',
    post_calc: 'Calculus 이후 과정',
  },
  {
    algebra2_or_below: 'Algebra 2 or below',
    precalc: 'Precalculus',
    calc: 'Calculus (AB/BC)',
    post_calc: 'Beyond Calculus',
  },
)

export const satStatusLabels: Record<string, string> = bilingual(
  {
    none: '아직 계획 없음',
    studying: '공부 중',
    taken: '응시했음',
  },
  {
    none: 'No plans yet',
    studying: 'Studying',
    taken: 'Taken',
  },
)

export const toeflStatusLabels: Record<string, string> = bilingual(
  {
    none: '미응시',
    studying: '공부 중',
    scored: '점수 있음',
    exempt: '면제 대상일 수 있음 (학교별 확인)',
  },
  {
    none: 'Not taken',
    studying: 'Studying',
    scored: 'Have a score',
    exempt: 'May be exempt (check per school)',
  },
)

export const activityLevelLabels: Record<number, string> = bilingual<number>(
  {
    1: '아직 없음',
    2: '어느 정도 있음',
    3: '뚜렷하게 있음',
  },
  {
    1: 'Not yet',
    2: 'Some',
    3: 'Clearly established',
  },
)

// 요약 화면용 한 줄 문자열 생성
export function summaryRows(a: OnboardingAnswers): [string, string][] {
  const targetText =
    a.targetMode === 'schools'
      ? a.targetSchoolIds
          .map((id) => schools.find((s) => s.id === id)?.name ?? `#${id}`)
          .join(', ')
      : a.targetMode === 'tier' && a.targetTier
        ? tierLabels[a.targetTier]
        : t('미정', 'Undecided')

  const statusText =
    a.applicantStatus === 'intl'
      ? t('국제학생 (International)', 'International')
      : a.applicantStatus === 'domestic'
        ? t('시민권·영주권', 'US citizen / permanent resident')
        : t('모름 → 국제학생 기준으로 안내', 'Not sure → treated as international')

  const rows: [string, string][] = [
    [t('졸업연도', 'Graduation year'), a.gradYear ? `Class of ${a.gradYear}` : '-'],
    [t('지원 신분', 'Applicant status'), statusText],
    [t('전담 카운슬러', 'Dedicated counselor'), a.hasCounselor === 'yes' ? t('있음', 'Yes') : a.hasCounselor === 'no' ? t('없음', 'No') : t('모름', 'Not sure')],
    [t('학교', 'School'), (a.schoolName ? a.schoolName + ' · ' : '') + (a.schoolInUs ? t('미국 현지 학교', 'School in the US') : a.schoolAccredited === 'yes' ? t('국제 인증 있음', 'Internationally accredited') : a.schoolAccredited === 'no' ? t('국제 인증 없음', 'Not accredited') : t('인증 모름 → 확인 필요', 'Accreditation unknown → check'))],
    [t('계열', 'Track'), a.majorTrack === 'stem' ? t('이과 (STEM)', 'STEM') : a.majorTrack === 'liberal' ? t('문과 (Humanities·Social)', 'Humanities / Social') : t('미정', 'Undecided')],
    [t('희망 전공 1순위', 'First-choice major'), majorLabel(a.majorPrimary)],
    [t('희망 전공 2순위', 'Second-choice major'), a.majorSecondary ? majorLabel(a.majorSecondary) : t('없음', 'None')],
    [t('목표 학교', 'Target schools'), targetText],
    ['GPA', a.gpaBand ? gpaBandLabels[a.gpaBand] : '-'],
    [t('현재 수학', 'Current math'), a.mathCourse ? mathCourseLabels[a.mathCourse] : '-'],
    ['SAT', a.satStatus === 'taken' && a.satBand ? t(`응시 (${a.satBand})`, `Taken (${a.satBand})`) : a.satStatus ? satStatusLabels[a.satStatus] : '-'],
    ['AP', t(`완료 ${a.apCompleted ?? 0}개 · 수강 중 ${a.apCurrent ?? 0}개`, `${a.apCompleted ?? 0} completed · ${a.apCurrent ?? 0} in progress`)],
  ]

  if (a.toeflStatus) rows.push(['TOEFL/IELTS', toeflStatusLabels[a.toeflStatus]])

  rows.push(
    [t('대표 활동 (Spike)', 'Spike'), a.activitySpike ? activityLevelLabels[a.activitySpike] : '-'],
    [t('리더십 (Leadership)', 'Leadership'), a.activityLeadership ? activityLevelLabels[a.activityLeadership] : '-'],
    [t('교외 인정 (Validation)', 'Validation'), a.activityValidation ? activityLevelLabels[a.activityValidation] : '-'],
  )

  return rows
}
