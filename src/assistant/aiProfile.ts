import { supabase } from '../lib/supabase'
import { filterChecklist, profileGrade, type ProfileRow } from '../lib/profile'
import { currentSeasonLabel } from '../lib/academics'
import { localizeRows, getLang } from '../i18n'
import { majorLabel } from '../data/majors'
import { gpaBandLabels, satStatusLabels, toeflStatusLabels } from '../onboarding/labels'
import type { ChecklistItem } from '../lib/types'
import schoolsIndex from '../data/schools.index.json'

// AI 도우미에 보낼 "내 기록" 요약 — 동의한 경우에만 만들고, 이름·이메일·재학 고교·에세이 본문/메모·추천인 이름·관심 표현 메모는 넣지 않음
const names = new Map((schoolsIndex as { id: number; name: string; name_ko: string | null }[]).map((s) => [s.id, getLang() === 'ko' ? s.name_ko ?? s.name : s.name]))
const clip = (v: string | null | undefined, n: number) => (v ? (v.length > n ? `${v.slice(0, n)}…` : v) : null)
type Row = Record<string, unknown>

export async function buildAiProfile(userId: string, p: ProfileRow): Promise<Record<string, unknown>> {
  const ko = getLang() === 'ko'
  const q = (table: string, cols: string) => supabase!.from(table).select(cols).eq('user_id', userId).then(({ data }) => (data ?? []) as unknown as Row[], () => [] as Row[])
  const [items, checks, tests, apps, courses, acts, honors, plans, recs, interest, tasks, essays] = supabase
    ? await Promise.all([
        supabase.from('checklist_items').select('*').then(({ data }) => (data ?? []) as unknown as Row[], () => [] as Row[]),
        supabase.from('user_checks').select('item_id,status').eq('user_id', userId).eq('season_label', currentSeasonLabel()).then(({ data }) => (data ?? []) as unknown as Row[], () => [] as Row[]),
        q('test_scores', 'kind,total,section_scores,subject,taken_on'),
        q('applications', 'school_id,round,status,student_deadline,fit'),
        q('courses', 'grade,name,level,letter_grade,percent'),
        q('activities', 'sort_order,category,position,organization,description,grades,hours_per_week,weeks_per_year'),
        q('honors', 'sort_order,title,grade,level'),
        q('plans', 'title,axis,season_label,status'),
        q('recommenders', 'role,subject,status,asked_on,due_on,brag_sheet_sent,thank_you_sent,school_ids'),
        q('interest_logs', 'school_id,kind,happened_on'),
        q('custom_tasks', 'school_id,title,done'),
        q('essays', 'school_id,prompt,status,word_limit'),
      ])
    : Array.from({ length: 12 }, () => [] as Row[])
  const season = filterChecklist(localizeRows(items as unknown as ChecklistItem[]), p).slice(0, 15)
  const done = new Set(checks.filter((c) => c.status === 'done').map((c) => c.item_id as number))
  const status = p.applicant_status === 'domestic' ? (ko ? '미국 시민권·영주권자' : 'U.S. citizen/permanent resident') : (ko ? '국제학생(유학생)' : 'International student')
  const school = (id: unknown) => (id ? names.get(Number(id)) ?? id : null)

  return {
    [ko ? '학년' : 'grade']: profileGrade(p),
    [ko ? '졸업연도' : 'class_of']: p.grad_year,
    [ko ? '이번_시즌' : 'season']: currentSeasonLabel(),
    [ko ? '신분' : 'status']: status,
    applicant_status: p.applicant_status,
    [ko ? '전담_카운슬러' : 'has_counselor']: p.has_counselor,
    [ko ? '희망_전공' : 'majors']: [p.major_primary, p.major_secondary].filter(Boolean).map((m) => majorLabel(m)),
    [ko ? '목표_학교' : 'target_schools']: p.target_mode === 'schools' ? p.target_school_ids.map((id) => names.get(id) ?? id) : p.target_mode === 'tier' ? `Tier ${p.target_tier}` : (ko ? '미정' : 'undecided'),
    [ko ? 'GPA_구간' : 'gpa_band']: p.gpa_band ? gpaBandLabels[p.gpa_band] ?? p.gpa_band : null,
    [ko ? '온보딩_SAT' : 'onboarding_sat']: p.sat_status === 'taken' && p.sat_band ? p.sat_band : p.sat_status ? satStatusLabels[p.sat_status] : null,
    [ko ? '온보딩_영어시험' : 'onboarding_english']: p.toefl_status ? toeflStatusLabels[p.toefl_status] : null,
    [ko ? 'AP_이수_수강중' : 'ap_done_current']: [p.ap_completed, p.ap_current],
    [ko ? '시험_점수' : 'test_scores']: tests.map((x) => ({ 종류: x.kind, 과목: x.subject, 총점: x.total, 영역: x.section_scores, 날짜: x.taken_on })),
    [ko ? '과목과_성적' : 'courses']: courses.sort((a, b) => Number(a.grade) - Number(b.grade)).map((c) => ({ 학년: c.grade, 과목: c.name, 수준: c.level, 성적: c.letter_grade ?? c.percent })),
    [ko ? '활동' : 'activities']: acts.sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map((a) => ({ 분야: a.category, 역할: a.position, 단체: a.organization, 설명: clip(a.description as string, 150), 학년: a.grades, 주당시간: a.hours_per_week, 연간주수: a.weeks_per_year })),
    [ko ? '수상' : 'honors']: honors.sort((a, b) => Number(a.sort_order) - Number(b.sort_order)).map((h) => ({ 이름: h.title, 학년: h.grade, 수준: h.level })),
    [ko ? '계획' : 'plans']: plans.map((x) => ({ 계획: x.title, 축: x.axis, 시즌: x.season_label, 상태: x.status })),
    [ko ? '추천서_진행' : 'recommenders']: recs.map((r) => ({ 역할: r.role, 과목: r.subject, 상태: r.status, 부탁한_날: r.asked_on, 마감: r.due_on, 브래그시트_보냄: r.brag_sheet_sent, 감사인사: r.thank_you_sent, 학교: ((r.school_ids as number[] | null) ?? []).map(school) })),
    [ko ? '지원_학교와_라운드' : 'applications']: apps.map((a) => ({ 학교: school(a.school_id), 라운드: a.round, 상태: a.status, 내가_정한_마감: a.student_deadline, 티어: a.fit })),
    [ko ? '관심_표현' : 'demonstrated_interest']: interest.map((x) => ({ 학교: school(x.school_id), 종류: x.kind, 날짜: x.happened_on })),
    [ko ? '에세이_진행' : 'essays']: essays.map((e) => ({ 학교: school(e.school_id) ?? 'Common App', 문항: clip(e.prompt as string, 120), 상태: e.status, 단어제한: e.word_limit })),
    [ko ? '할_일' : 'tasks']: tasks.map((x) => ({ 학교: school(x.school_id), 할일: String(x.title).replace(/^prep:/, ''), 완료: x.done })).slice(0, 40),
    [ko ? '이번_시즌_체크리스트' : 'this_season_checklist']: season.map((i) => ({ [ko ? '항목' : 'item']: i.title, [ko ? '완료' : 'done']: done.has(i.id) })),
  }
}
