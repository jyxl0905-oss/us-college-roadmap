import { directAdmitParent } from '../data/majors'
import type { School } from '../lib/types'
import type { ProfileRow } from '../lib/profile'
import { profileGrade } from '../lib/profile'
import { currentSeason, timingLabel } from '../lib/academics'
export { timingLabel }
import { t, bilingual } from '../i18n'

// F4 지원 보드 — 원칙: 라운드 추천 금지(사실 고지·규칙 검증·정리·추적까지만), 활동 선호 창작 금지

export type Round = 'ed' | 'ed2' | 'ea' | 'rea' | 'rd'
export type AppStatus =
  | 'preparing' | 'submitted' | 'waiting' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'

export interface ApplicationRow {
  school_id: number
  round: Round | null
  status: AppStatus
  updated_at: string
  student_deadline?: string | null // 학생이 공식 페이지 확인 후 직접 입력한 마감일 (툴은 날짜를 제공하지 않음)
  fit?: Fit | null // 학생이 직접 정한 분류 — 툴은 판단하지 않음
}

export type Fit = 'reach' | 'match' | 'safety'
export const fitOrder: Fit[] = ['reach', 'match', 'safety']
export const fitLabels: Record<Fit, string> = bilingual<Fit>(
  { reach: 'Reach (도전)', match: 'Match (적정)', safety: 'Safety (안전)' },
  { reach: 'Reach', match: 'Match', safety: 'Safety' },
)
export const fitHint = () =>
  t('학생이 직접 정하는 분류예요 — 툴은 합격 가능성을 계산하지 않아요. 학교 카드의 SAT 중간 50%·국제학생 합격률을 보고 스스로 판단해 붙이세요. 세 그룹이 골고루 있는지가 리스트의 기본 골격이에요.', 'You set these yourself — the tool does not estimate admission chances. Use the SAT middle-50% and international acceptance rate on each school card to judge, and aim for a mix of all three.')

// 라운드 칸 표시 순서 (F5 지원 학교 탭)
export const roundSlots: { round: Round; label: string; rule: string }[] = [
  { round: 'ed', label: 'ED I', get rule() { return t('합격 시 등록 의무 · 1곳만', 'Binding if admitted · one school only') } },
  { round: 'rea', label: 'REA / SCEA', get rule() { return t('비구속이지만 타 사립 조기지원 제한 · 1곳', 'Non-binding, but restricts early apps to other private schools · one school') } },
  { round: 'ea', label: 'EA', get rule() { return t('비구속 · 여러 곳 가능', 'Non-binding · multiple schools allowed') } },
  { round: 'ed2', label: 'ED II', get rule() { return t('합격 시 등록 의무 · ED I 불합격 후 1곳', 'Binding if admitted · one school, after an ED I denial') } },
  { round: 'rd', label: 'RD', get rule() { return t('정시 · 여러 곳 가능', 'Regular Decision · multiple schools allowed') } },
]

// D-day: 학생이 입력한 'YYYY-MM-DD'를 기기 로컬 자정으로 해석 (마감 당일 = D-Day, 지난 날은 음수)
export function dDay(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!m) return null
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

// 마감 시기 라벨 현지화 — 시드는 한국어('11월 초')만 있음 → 영어 모드에서 'early Nov'로 표시 (정렬은 원문 기준 유지)
export interface CustomTask {
  id: number
  school_id: number
  title: string
  done: boolean
}

export const roundLabels: Record<Round, string> = {
  ed: 'ED', ed2: 'ED II', ea: 'EA', rea: 'REA', rd: 'RD',
}

export const statusLabels: Record<AppStatus, string> = bilingual(
  {
    preparing: '준비 중', submitted: '제출함', waiting: '결과 대기',
    accepted: '합격', rejected: '불합격', waitlisted: '대기자', deferred: '유예(defer)',
  },
  {
    preparing: 'Preparing', submitted: 'Submitted', waiting: 'Awaiting decision',
    accepted: 'Accepted', rejected: 'Rejected', waitlisted: 'Waitlisted', deferred: 'Deferred',
  },
)

// 보드 노출: 11학년 Summer부터
export function boardVisible(profile: ProfileRow): boolean {
  const grade = profileGrade(profile)
  return grade > 11 || (grade === 11 && currentSeason() === 'summer')
}

// 그 학교가 제공하는 라운드만 선택지 (F3 데이터 기반) — timing은 시기 라벨
export function offeredRounds(s: School): { round: Round; timing: string | null }[] {
  const out: { round: Round; timing: string | null }[] = []
  if (s.ed_offered) out.push({ round: 'ed', timing: s.ed_timing ?? null })
  if (s.ed2_offered) out.push({ round: 'ed2', timing: s.ed2_timing ?? null })
  if (s.ea_offered) out.push({ round: 'ea', timing: s.ea_timing ?? null })
  if (s.rea_offered) out.push({ round: 'rea', timing: s.ea_timing ?? null })
  if (s.rd_timing) out.push({ round: 'rd', timing: s.rd_timing })
  return out
}

export function roundTiming(s: School, round: Round | null): string | null {
  if (!round) return null
  return offeredRounds(s).find((r) => r.round === round)?.timing ?? null
}

// 경고 3종 — 차단이 아닌 표시 (규칙 검증, 추천 아님)
export interface BoardWarning {
  key: 'double_ed' | 'double_rea' | 'rea_conflict' | 'ed_intl_aid'
  text: string
}

export function boardWarnings(apps: ApplicationRow[], profile: ProfileRow): BoardWarning[] {
  const rounds = apps.map((a) => a.round).filter(Boolean) as Round[]
  const warnings: BoardWarning[] = []
  const edCount = rounds.filter((r) => r === 'ed').length
  const ed2Count = rounds.filter((r) => r === 'ed2').length
  if (edCount >= 2 || ed2Count >= 2)
    warnings.push({ key: 'double_ed', text: t('ED는 합격 시 등록 의무 — 동시에 1곳만 가능', 'ED is binding if admitted — only one school at a time') })
  const reaCount = rounds.filter((r) => r === 'rea').length
  if (reaCount >= 2)
    warnings.push({ key: 'double_rea', text: t('REA/SCEA는 1곳만 가능 — 다른 학교의 조기지원 제한 규칙과 충돌', 'REA/SCEA is single-choice — only one school; this conflicts with the other school’s early-application rule') })
  const hasRea = reaCount > 0
  const otherEarly = rounds.filter((r) => r !== 'rd').length
  if (hasRea && otherEarly >= 2)
    warnings.push({
      key: 'rea_conflict',
      text: t('REA는 타 사립 조기지원을 제한하는 경우가 많음 — 두 학교 공식 정책 확인', 'REA often restricts early applications to other private schools — check both schools’ official policies'),
    })
  const isIntl = profile.applicant_status !== 'domestic'
  if (isIntl && (edCount > 0 || ed2Count > 0))
    warnings.push({
      key: 'ed_intl_aid',
      text: t('ED 합격 시 타교 재정지원 오퍼와 비교 불가 — 지원금이 중요하면 고려', 'If admitted ED you can’t compare aid offers from other schools — keep this in mind if aid matters'),
    })
  return warnings
}

// §3-D C7 행동 변환 — 고정 매핑 (이 표만 사용, 임의 추가 금지)
// key = 한국어 원문(저장 키, custom_tasks.title로 저장됨 — 변경 금지), text = 표시 문구(언어별)
export interface DerivedItem { key: string; text: string }
const di = (ko: string, en: string): DerivedItem => ({ key: ko, text: t(ko, en) })

const C7_ACTION_MAP: Record<string, DerivedItem> = {
  essay: di('이 학교는 에세이를 very important로 공시 — 보충 에세이에 시간을 최우선 배분할 것', 'This school lists essays as very important — put supplemental essays first in your time budget'),
  character: di('성격·개인 자질을 very important로 공시 — 추천서와 에세이에서 일관된 모습이 드러나는지 점검', 'Character/personal qualities listed as very important — check that recommendations and essays show a consistent picture'),
  interview: di('인터뷰를 very important로 공시 — 인터뷰 제공 여부 확인 후 신청할 것', 'Interview listed as very important — check whether interviews are offered and request one'),
  demonstrated_interest: di('지원 관심도를 평가에 반영 — 온라인 설명회 참석·메일링 등록을 기록으로 남길 것', 'Demonstrated interest is considered — leave a record: attend online sessions, join the mailing list'),
  rigor: di('과목 난이도를 very important로 공시 — 12학년 시간표의 리거를 유지할 것', 'Course rigor listed as very important — keep your 12th-grade schedule rigorous'),
  talent: di('특기·재능을 very important로 공시 — 대표 활동의 결과물을 원서에서 보여줄 준비', 'Talent/ability listed as very important — be ready to show the output of your main activity in the application'),
  extracurricular: di('활동을 very important로 공시 — 활동란 10칸의 문구 완성도를 점검할 것', 'Extracurriculars listed as very important — polish the wording of all 10 activity slots'),
}

export function c7Actions(s: School): DerivedItem[] {
  const list = s.c7_very_important
  if (!list || list.length === 0) return [] // null이면 블록 생략 (일반론 채우기 금지)
  return list.map((slug) => C7_ACTION_MAP[slug]).filter(Boolean)
}

export const suppEssayTip = () =>
  t('이 학교의 보충 에세이가 묻는 것 = 이 학교가 보는 것 — 문항을 확인해 커스텀 항목으로 추가할 것', 'What this school’s supplement asks = what this school looks for — check the prompts and add them as custom items')

// §3-E 조건 조합 자동 체크리스트
export function autoItems(s: School, profile: ProfileRow, app: ApplicationRow | undefined): DerivedItem[] {
  const isIntl = profile.applicant_status !== 'domestic'
  const items: DerivedItem[] = []
  if (s.test_policy === 'test-optional') items.push(di('SAT 제출 여부 결정', 'Decide whether to submit SAT'))
  if (isIntl)
    items.push(
      profile.toefl_status === 'exempt'
        ? di('이 학교의 TOEFL 면제 기준(재학 연수·SAT 영어 등) 공식 확인', 'Officially confirm this school’s TOEFL waiver rule (years enrolled, SAT EBRW, etc.)')
        : di('TOEFL 발송·면제 확인', 'Send TOEFL / confirm waiver'),
    )
  if (isIntl && s.need_blind_intl === false) items.push(di('재정지원 신청 여부 결정', 'Decide whether to apply for financial aid'))
  if (profile.major_primary && s.direct_admit_majors.includes(directAdmitParent(profile.major_primary) as string))
    items.push(di('지원 전공 확정', 'Finalize the major you apply to'))
  if (app?.round) items.push(di('마감 역산 일정 확인', 'Check the countdown schedule from the deadline'))
  items.push(di('보충 에세이 문항 확인·목록화', 'Find and list the supplemental essay prompts'))
  return items
}

// ED/ED2 배정 = 1지망 우선 원칙의 UI 반영 (최상단 고정·강조)
export function isFirstChoice(app: ApplicationRow | undefined): boolean {
  return app?.round === 'ed' || app?.round === 'ed2'
}

// 조기 라운드(ED/ED2/EA/REA) 배정 학교는 C7 행동 항목을 체크 항목화, RD·미배정은 표시만
export function c7Checkable(app: ApplicationRow | undefined): boolean {
  return !!app?.round && app.round !== 'rd'
}
