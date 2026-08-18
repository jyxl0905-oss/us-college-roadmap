import type { School } from '../lib/types'
import type { ProfileRow } from '../lib/profile'
import { profileGrade } from '../lib/profile'
import { currentSeason } from '../lib/academics'

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
}

// 라운드 칸 표시 순서 (F5 지원 학교 탭)
export const roundSlots: { round: Round; label: string; rule: string }[] = [
  { round: 'ed', label: 'ED I', rule: '합격 시 등록 의무 · 1곳만' },
  { round: 'rea', label: 'REA / SCEA', rule: '비구속이지만 타 사립 조기지원 제한 · 1곳' },
  { round: 'ea', label: 'EA', rule: '비구속 · 여러 곳 가능' },
  { round: 'ed2', label: 'ED II', rule: '합격 시 등록 의무 · ED I 불합격 후 1곳' },
  { round: 'rd', label: 'RD', rule: '정시 · 여러 곳 가능' },
]

export function dDay(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export interface CustomTask {
  id: number
  school_id: number
  title: string
  done: boolean
}

export const roundLabels: Record<Round, string> = {
  ed: 'ED', ed2: 'ED II', ea: 'EA', rea: 'REA', rd: 'RD',
}

export const statusLabels: Record<AppStatus, string> = {
  preparing: '준비 중', submitted: '제출함', waiting: '결과 대기',
  accepted: '합격', rejected: '불합격', waitlisted: '대기자', deferred: '유예(defer)',
}

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
  key: 'double_ed' | 'rea_conflict' | 'ed_intl_aid'
  text: string
}

export function boardWarnings(apps: ApplicationRow[], profile: ProfileRow): BoardWarning[] {
  const rounds = apps.map((a) => a.round).filter(Boolean) as Round[]
  const warnings: BoardWarning[] = []
  const edCount = rounds.filter((r) => r === 'ed').length
  const ed2Count = rounds.filter((r) => r === 'ed2').length
  if (edCount >= 2 || ed2Count >= 2)
    warnings.push({ key: 'double_ed', text: 'ED는 합격 시 등록 의무 — 동시에 1곳만 가능' })
  const hasRea = rounds.includes('rea')
  const otherEarly = rounds.filter((r) => r !== 'rd').length
  if (hasRea && otherEarly >= 2)
    warnings.push({
      key: 'rea_conflict',
      text: 'REA는 타 사립 조기지원을 제한하는 경우가 많음 — 두 학교 공식 정책 확인',
    })
  const isIntl = profile.applicant_status !== 'domestic'
  if (isIntl && (edCount > 0 || ed2Count > 0))
    warnings.push({
      key: 'ed_intl_aid',
      text: 'ED 합격 시 타교 재정지원 오퍼와 비교 불가 — 지원금이 중요하면 고려',
    })
  return warnings
}

// §3-D C7 행동 변환 — 고정 매핑 (이 표만 사용, 임의 추가 금지)
const C7_ACTION_MAP: Record<string, string> = {
  essay: '이 학교는 에세이를 very important로 공시 — 보충 에세이에 시간을 최우선 배분할 것',
  character: '성격·개인 자질을 very important로 공시 — 추천서와 에세이에서 일관된 모습이 드러나는지 점검',
  interview: '인터뷰를 very important로 공시 — 인터뷰 제공 여부 확인 후 신청할 것',
  demonstrated_interest: '지원 관심도를 평가에 반영 — 온라인 설명회 참석·메일링 등록을 기록으로 남길 것',
  rigor: '과목 난이도를 very important로 공시 — 12학년 시간표의 리거를 유지할 것',
  talent: '특기·재능을 very important로 공시 — 대표 활동의 결과물을 원서에서 보여줄 준비',
  extracurricular: '활동을 very important로 공시 — 활동란 10칸의 문구 완성도를 점검할 것',
}

export function c7Actions(s: School): string[] {
  const list = s.c7_very_important
  if (!list || list.length === 0) return [] // null이면 블록 생략 (일반론 채우기 금지)
  return list.map((slug) => C7_ACTION_MAP[slug]).filter(Boolean) as string[]
}

export const SUPP_ESSAY_TIP =
  '이 학교의 보충 에세이가 묻는 것 = 이 학교가 보는 것 — 문항을 확인해 커스텀 항목으로 추가할 것'

// §3-E 조건 조합 자동 체크리스트
export function autoItems(s: School, profile: ProfileRow, app: ApplicationRow | undefined): string[] {
  const isIntl = profile.applicant_status !== 'domestic'
  const items: string[] = []
  if (s.test_policy === 'test-optional') items.push('SAT 제출 여부 결정')
  if (isIntl)
    items.push(profile.toefl_status === 'exempt' ? '이 학교의 TOEFL 면제 기준(재학 연수·SAT 영어 등) 공식 확인' : 'TOEFL 발송·면제 확인')
  if (isIntl && s.need_blind_intl === false) items.push('재정지원 신청 여부 결정')
  if (profile.major_primary && s.direct_admit_majors.includes(profile.major_primary))
    items.push('지원 전공 확정')
  if (app?.round) items.push('마감 역산 일정 확인')
  items.push('보충 에세이 문항 확인·목록화')
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
