import { t } from '../i18n'

// 11학년 봄부터 12학년까지 '꼭 체크' 마일스톤 — 시즌 체크리스트와 별개로 리포트 옆에 항상 떠 있는 핵심 4~5개.
// key는 DB(milestones.key)에 저장되므로 변경 금지. 문구는 편집 가능.
export interface MustDo {
  key: string
  grade: 11 | 12
  season: 'spring' | 'summer' | 'fall'
  title: () => string
  why: () => string
  to?: string // 앱 내 이동 경로
}

export const MUST_DO: MustDo[] = [
  // 11학년 봄
  { key: 'recommenders', grade: 11, season: 'spring', to: '/app/plans',
    title: () => t('추천서 부탁할 선생님 2명 정하기', 'Pick 2 teachers for recommendation letters'),
    why: () => t('11학년 과목 선생님 중에서 · 학기 끝나기 전에 정식으로 부탁 · 그 수업에서 내가 남긴 것(질문·프로젝트)을 메모', 'From your 11th-grade teachers · ask formally before the year ends · note what you did in their class') },
  { key: 'essay_ideas', grade: 11, season: 'spring', to: '/app/writing',
    title: () => t('에세이 소재 3개 메모해 두기', 'Jot down 3 essay ideas'),
    why: () => t('에세이 탭에서 Common App 공통 문항 7개를 보고 떠오르는 활동·순간·질문을 적어두기 — 완성 아니고 소재만', 'Read the 7 Common App prompts in the Essays tab and note moments, activities, questions — just material, not drafts') },
  { key: 'commonapp_activities', grade: 11, season: 'spring', to: '/app/activities',
    title: () => t('가상 Common App 활동란 채워보기', 'Fill in your virtual Common App activities'),
    why: () => t('실제 원서와 같은 10칸·150자 형식 — 지금 써보면 뭐가 비었는지 보여요', 'Same 10 slots · 150 characters as the real form — writing it now shows the gaps') },
  { key: 'college_list_draft', grade: 11, season: 'spring', to: '/app/colleges',
    title: () => t('목표 학교 초안 + 라운드 생각해 보기', 'Draft your college list + think about rounds'),
    why: () => t('reach/match/safety 균형 · ED로 갈 진짜 1지망이 있는지', 'Balance reach/match/safety · is there a true first choice for ED?') },
  // 11학년 여름
  { key: 'main_essay_draft', grade: 11, season: 'summer', to: '/app/writing',
    title: () => t('메인 에세이 초안 완성', 'Finish a draft of your main essay'),
    why: () => t('12학년 가을엔 쓸 시간이 없어요 — 여름 초안, 가을 퇴고', 'There is no time in 12th-grade fall — draft in summer, revise in fall') },
  { key: 'ask_recommenders', grade: 11, season: 'summer',
    title: () => t('추천서 정식으로 부탁하기', 'Formally ask for recommendation letters'),
    why: () => t('학년 끝나기 전에 부탁해야 선생님이 여름에 쓸 시간이 생겨요', 'Asking before the year ends gives teachers the summer to write') },
  { key: 'ed_strategy', grade: 11, season: 'summer', to: '/app/colleges',
    title: () => t('ED/EA 전략 정하기', 'Decide your ED/EA strategy'),
    why: () => t('ED는 합격 시 등록 의무 — 1지망 + 재정 조건을 같이 확인', 'ED is binding — decide with your true first choice and finances together') },
  { key: 'tests_wrap', grade: 11, season: 'summer', to: '/app/testing',
    title: () => t('SAT·TOEFL 마무리 계획', 'Plan to wrap up SAT/TOEFL'),
    why: () => t('여름 지나면 시험과 원서가 겹쳐요 — 남은 시험일을 캘린더에', 'After summer, tests collide with applications — put remaining dates on your calendar') },
  // 12학년 가을
  { key: 'real_commonapp', grade: 12, season: 'fall', to: '/app/activities',
    title: () => t('실제 Common App 계정 만들고 활동란 옮기기', 'Create your real Common App account and move activities over'),
    why: () => t('가상 원서에 써둔 걸 그대로 옮기면 돼요 (commonapp.org)', 'Copy what you wrote in the virtual application (commonapp.org)') },
  { key: 'supplements_list', grade: 12, season: 'fall', to: '/app/writing',
    title: () => t('학교별 보충 에세이 문항 목록화', 'List every school’s supplemental prompts'),
    why: () => t('각 학교 공식 페이지에서 확인 → 에세이 탭에 붙여넣기 · 겹치는 주제는 재사용', 'Find them on each school’s official page → paste into the Essays tab · reuse overlapping topics') },
  { key: 'deadlines_entered', grade: 12, season: 'fall', to: '/app/colleges',
    title: () => t('지원 학교마다 공식 마감일 입력', 'Enter the official deadline for each school'),
    why: () => t('입력하면 D-day·캘린더·이틀 전 이메일 알림이 자동으로 돌아가요', 'Once entered, D-day, calendar and the 2-day email reminder run automatically') },
  { key: 'docs_owner', grade: 12, season: 'fall', to: '/app/colleges',
    title: () => t('성적표·추천서 발송 담당자와 날짜 확인', 'Confirm who sends transcripts/recommendations and when'),
    why: () => t('남이 보내주는 서류는 이름과 날짜까지 못 박아야 해요', 'Documents others send need a named person and a date') },
  { key: 'financial_docs', grade: 12, season: 'fall',
    title: () => t('재정 서류 일정 확인 (CSS Profile·잔고 증명)', 'Check financial document deadlines (CSS Profile, bank statement)'),
    why: () => t('원서 마감과 다른 날짜로 도는 경우가 많아요 — 부모님과 미리', 'Often on a different schedule from the application — plan with your parents early') },
  // 12학년 봄
  { key: 'midyear_report', grade: 12, season: 'spring',
    title: () => t('미드이어 리포트 발송 확인', 'Confirm your mid-year report was sent'),
    why: () => t('12학년 1학기 성적도 평가돼요 — 성적 유지 + 발송 확인', '12th-grade first-semester grades still count — keep them up and confirm it was sent') },
  { key: 'decision', grade: 12, season: 'spring',
    title: () => t('5월 1일 등록 결정 · 디파짓은 한 곳만', 'Decide by May 1 · deposit at one school only'),
    why: () => t('조건(학비·재정지원·전공)으로 비교표 만들어 결정 · 더블 디파짓은 규정 위반', 'Compare by conditions (cost, aid, major) · double depositing breaks the rules') },
  { key: 'i20_visa', grade: 12, season: 'spring',
    title: () => t('I-20 신청 · 비자 인터뷰 준비 시작', 'Apply for the I-20 · start visa interview prep'),
    why: () => t('합격 확정 즉시 — 여름엔 인터뷰가 몰려요', 'Right after you commit — interview slots fill up in summer') },
]

// 미국 학년도 순서(가을 시작): 11 fall → 11 spring → 11 summer → 12 fall → 12 spring
const seasonOrder = { fall: 1, spring: 2, summer: 3 } as const
export function mustDoRank(m: { grade: number; season: keyof typeof seasonOrder }): number {
  return m.grade * 10 + seasonOrder[m.season]
}
