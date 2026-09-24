import type { ProfileRow } from '../lib/profile'
import { currentSchoolYearEnd } from '../lib/academics'
import { t } from '../i18n'

// 체험 모드(/demo)용 가상 학생 — 로그인 없이 리포트 전체를 둘러보게 함. 저장·전송 없음
// 11학년(현재 학년도 기준) · 국제학생 · CS 지망 · 목표 5곳
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000' // 실제 계정과 겹치지 않는 nil UUID (RLS상 어떤 행도 안 보임)

export function demoProfile(): ProfileRow {
  return {
    nickname: t('예시 학생', 'Sample student'),
    grad_year: currentSchoolYearEnd() + 1, // 지금 11학년
    applicant_status: 'intl',
    has_counselor: 'no',
    school_accredited: 'yes',
    major_primary: 'cs',
    major_secondary: 'math_data',
    target_mode: 'schools',
    target_school_ids: [20, 38, 32, 18, 31], // CMU · UIUC · Georgia Tech · UCLA · UT Austin
    target_tier: null,
    gpa_band: '3.7-3.9',
    math_course: 'calc',
    sat_status: 'taken',
    sat_band: '1400-1490',
    ap_completed: 3,
    ap_current: 3,
    toefl_status: 'score',
    activity_spike: 2,
    activity_leadership: 2,
    activity_validation: 1,
    quiz_answers: null,
    info_sources: null,
    research_consent: false,
  }
}
