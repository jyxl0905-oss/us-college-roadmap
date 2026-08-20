import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { majorLabel } from '../data/majors'
import { gpaBandLabels, mathCourseLabels, satStatusLabels, toeflStatusLabels, tierLabels } from '../onboarding/labels'
import { axisKo, axisOrder, type Axis } from '../lib/score'
import { gradeFromGradYear } from '../lib/academics'

// 운영자 통계 대시보드 — DB 함수 admin_stats()(SECURITY DEFINER, 이메일 화이트리스트)가 집계만 반환.
// 개인 식별 정보(이메일·닉네임·개별 기록)는 조회하지 않음.

type Dist = Record<string, number>
interface Stats {
  generated_at: string
  filter?: string | null
  hs_schools?: { name: string; n: number }[]
  totals: {
    auth_users: number; profiles: number; nicknamed: number; reports_total: number; reports_users: number
    checks_total: number; checks_users: number; active_7d: number; active_30d: number; new_7d: number; new_30d: number
    research_consent: number; reminder_opt_out: number; school_in_us: number; multi_month_users: number
  }
  signups_by_week: { week: string; n: number }[]
  events_by_day: { day: string; n: number; users: number }[]
  events_by_type_30d: Dist
  grad_year: Dist; major: Dist; applicant_status: Dist; has_counselor: Dist; school_accredited: Dist
  target_mode: Dist; target_tier: Dist; gpa_band: Dist; sat_status: Dist; sat_band: Dist; toefl_status: Dist; math_course: Dist
  info_sources: Dist
  top_schools: { name: string; n: number }[]
  activity_self: { spike: Dist; leadership: Dist; validation: Dist }
  quiz: { respondents: number; avg_correct: number | null; per_item: { id: number; question: string; correct_rate: number }[] }
  clarity: { id: number; question: string; avg: number; n: number }[]
  checklist_progress: { avg_done_rate: number | null; by_season: { season: string; users: number; avg_done_rate: number | null }[] }
  axis_avg: Partial<Record<Axis, number>>
  most_checked: { title: string; n: number }[]
  least_checked: { title: string; n: number; grade: number; season: string }[]
  app_usage: Record<string, { rows: number; users: number; done?: number; with_round?: number }>
  rounds: Dist
  reminders_sent: number
}

interface Extra {
  lang: Dist
  graduated: number
  survey: {
    n: number; avg_helpful: number | null; helpful_dist: Dist; admitted: Dist; features: Dist
    enrolled_top: { name: string; n: number }[]
    comments: { helpful: number; admitted: string; comment: string }[]
    research_ok: number
  }
}
interface SchoolRow { name: string; users: number; no_counselor: number; intl: number; active_30d: number; returning_users: number; report_users: number; check_users: number; avg_done_rate: number | null; app_users: number; research_consent: number; top_majors?: { k: string; n: number }[]; top_targets?: { name: string; n: number }[] }
const admittedKo: Record<string, string> = { first_choice: '1지망 합격', target: '목표 학교 중 합격', other: '목표 밖 합격', waiting: '결과 대기', no: '아직 합격 없음' }
const featureKo: Record<string, string> = { checklist: '시즌 체크리스트', axes: '6축·처방', schools: '학교 카드·둘러보기', app: '내 원서', board: '지원 학교·라운드', major: '전공 가이드 맵', deadlines: '마감·알림', guide: '기본기·용어집' }

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '–')

// ── 작은 차트 컴포넌트 (SVG 직접 렌더, 단일 색조) ──
function BarList({ data, labels, total }: { data: Dist; labels?: Record<string, string>; total?: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map((e) => e[1]))
  const sum = total ?? entries.reduce((s, e) => s + e[1], 0)
  if (entries.length === 0) return <p className="text-sm text-gray-400">아직 데이터 없음</p>
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-sm">
          <span className="w-36 shrink-0 truncate text-gray-700" title={labels?.[k] ?? k}>{labels?.[k] ?? (k === '?' ? '미입력' : k)}</span>
          <div className="h-3 flex-1 rounded-sm bg-gray-100">
            <div className="h-3 rounded-sm bg-blue-500" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-gray-500">{v} <span className="text-gray-400">({pct(v, sum)})</span></span>
        </div>
      ))}
    </div>
  )
}

function Bars({ points, labelEvery = 2 }: { points: { label: string; n: number }[]; labelEvery?: number }) {
  if (points.length === 0) return <p className="text-sm text-gray-400">아직 데이터 없음</p>
  const W = 600, H = 140, PAD = 24
  const max = Math.max(1, ...points.map((p) => p.n))
  const bw = (W - PAD * 2) / points.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="막대 차트">
      {points.map((p, i) => {
        const h = ((H - 44) * p.n) / max
        return (
          <g key={p.label}>
            <rect x={PAD + i * bw + 2} y={H - 22 - h} width={Math.max(2, bw - 4)} height={h} rx={3} className="fill-blue-500">
              <title>{p.label}: {p.n}</title>
            </rect>
            {p.n > 0 && <text x={PAD + i * bw + bw / 2} y={H - 26 - h} textAnchor="middle" className="fill-gray-500 text-[10px]">{p.n}</text>}
            {i % labelEvery === 0 && <text x={PAD + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="fill-gray-400 text-[9px]">{p.label.slice(5)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function Lines({ points }: { points: { day: string; n: number; users: number }[] }) {
  if (points.length === 0) return <p className="text-sm text-gray-400">아직 데이터 없음</p>
  const W = 600, H = 160, PAD = 28
  const maxN = Math.max(1, ...points.map((p) => p.n))
  const maxU = Math.max(1, ...points.map((p) => p.users))
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, points.length - 1)
  const yN = (v: number) => H - 24 - ((H - 40) * v) / maxN
  const yU = (v: number) => H - 24 - ((H - 40) * v) / maxU
  const path = (f: (v: number) => number, key: 'n' | 'users') => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${f(p[key])}`).join(' ')
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="일별 이벤트·사용자 추이">
        <path d={path(yN, 'n')} fill="none" className="stroke-blue-500" strokeWidth={2} />
        <path d={path(yU, 'users')} fill="none" className="stroke-gray-400" strokeWidth={2} strokeDasharray="4 3" />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={x(i)} cy={yN(p.n)} r={3} className="fill-blue-500"><title>{p.day}: 이벤트 {p.n} · 사용자 {p.users}</title></circle>
            {(i === 0 || i === points.length - 1 || i % 5 === 0) && (
              <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-gray-400 text-[9px]">{p.day.slice(5)}</text>
            )}
          </g>
        ))}
        <text x={PAD} y={12} className="fill-gray-400 text-[9px]">최대 이벤트 {maxN} · 최대 사용자 {maxU}</text>
      </svg>
      <p className="mt-1 text-xs text-gray-500"><span className="inline-block h-0.5 w-4 bg-blue-500 align-middle" /> 이벤트 수 · <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-gray-400 align-middle" /> 활동 사용자 수 (각각 자체 스케일)</p>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mb-2 text-xs text-gray-400">{hint}</p>}
      <div className="mt-2">{children}</div>
    </section>
  )
}

const statusKo: Record<string, string> = { intl: '국제학생', domestic: '시민권·영주권', unknown: '모름', '?': '미입력' }
const ynKo: Record<string, string> = { yes: '예', no: '아니오', unknown: '모름', '?': '미입력' }
const targetModeKo: Record<string, string> = { schools: '구체 학교', tier: '티어만', undecided: '미정', '?': '미입력' }
const levelKo: Record<string, string> = { 1: '아직 없음', 2: '어느 정도', 3: '뚜렷함', '?': '미입력' }
const infoKo: Record<string, string> = { youtube: '유튜브', blog_cafe: '블로그·카페', hagwon: '학원·컨설팅', school: '학교 카운슬러', friends: '친구·선배', parents: '부모님', none: '없음' }
const eventKo: Record<string, string> = { signup: '가입', login: '로그인', check: '체크', report_view: '리포트 열람', board_view: '지원 보드 열람', round_assigned: '라운드 배정' }
const appKo: Record<string, string> = { activities: '활동', honors: '수상', test_scores: '시험 점수', courses: '과목', essays: '에세이', plans: '계획', applications: '지원 학교', custom_tasks: '커스텀 항목' }
const roundKo: Record<string, string> = { ed: 'ED', ed2: 'ED II', ea: 'EA', rea: 'REA', rd: 'RD', unassigned: '미배정' }
// 학년 계산은 앱 공통 규칙(8월 1일 롤오버, academics.ts)과 동일하게
const gradeOf = (gy: string) => { const g = gradeFromGradYear(Number(gy)); return Number.isFinite(g) ? `Class of ${gy} (${Math.min(12, Math.max(9, g))}학년)` : gy }

// SQL 집계가 빈 결과에서 null(json_agg 등)을 돌려줘도 화면이 깨지지 않도록 기본값 채움
function normalize(raw: Stats): Stats {
  const r = raw as Partial<Stats>
  const dist = (d: Dist | null | undefined): Dist => d ?? {}
  return {
    ...raw,
    totals: { ...(r.totals ?? ({} as Stats['totals'])) },
    signups_by_week: r.signups_by_week ?? [],
    events_by_day: r.events_by_day ?? [],
    events_by_type_30d: dist(r.events_by_type_30d),
    grad_year: dist(r.grad_year), major: dist(r.major), applicant_status: dist(r.applicant_status),
    has_counselor: dist(r.has_counselor), school_accredited: dist(r.school_accredited),
    target_mode: dist(r.target_mode), target_tier: dist(r.target_tier), gpa_band: dist(r.gpa_band),
    sat_status: dist(r.sat_status), sat_band: dist(r.sat_band), toefl_status: dist(r.toefl_status), math_course: dist(r.math_course),
    info_sources: dist(r.info_sources),
    top_schools: r.top_schools ?? [],
    activity_self: { spike: dist(r.activity_self?.spike), leadership: dist(r.activity_self?.leadership), validation: dist(r.activity_self?.validation) },
    quiz: { respondents: r.quiz?.respondents ?? 0, avg_correct: r.quiz?.avg_correct ?? null, per_item: r.quiz?.per_item ?? [] },
    clarity: r.clarity ?? [],
    checklist_progress: { avg_done_rate: r.checklist_progress?.avg_done_rate ?? null, by_season: r.checklist_progress?.by_season ?? [] },
    axis_avg: r.axis_avg ?? {},
    most_checked: r.most_checked ?? [],
    least_checked: r.least_checked ?? [],
    app_usage: r.app_usage ?? {},
    rounds: dist(r.rounds),
    reminders_sent: r.reminders_sent ?? 0,
  }
}

export default function AdminPage({ email, demo }: { email: string | null; demo?: Stats }) {
  const [stats, setStats] = useState<Stats | null>(demo ? normalize(demo) : null)
  const [extra, setExtra] = useState<Extra | null>(null)
  const [school, setSchool] = useState<string | null>(null) // null=전체, '__none__'=미입력
  const [bySchool, setBySchool] = useState<SchoolRow[] | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase || demo) return
    setLoadingStats(true)
    supabase.rpc('admin_stats', { p_school: school }).then(({ data, error }) => {
      setLoadingStats(false)
      if (error) setError(error.message.includes('forbidden') || error.code === '42501' ? '권한이 없어요 (운영자 계정으로 로그인해야 해요)' : error.message)
      else if (!data) setError('통계 데이터가 비어 있어요')
      else setStats(normalize(data as Stats))
    }, (e: unknown) => { setLoadingStats(false); setError(e instanceof Error ? e.message : String(e)) })
    if (!extra) supabase.rpc('admin_stats_extra').then(({ data }) => { if (data) setExtra(data as Extra) }, () => {})
    if (!bySchool) supabase.rpc('admin_stats_schools').then(({ data }) => { if (data) setBySchool(data as SchoolRow[]) }, () => {})
  }, [demo, school]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="text-gray-700">{error}</p>
      <p className="mt-1 text-xs text-gray-400">현재 로그인: {email ?? '없음'}</p>
      <button onClick={() => navigate('/')} className="mt-6 text-sm text-blue-600 underline">홈으로</button>
    </div>
  )
  if (!stats) return <p className="mt-20 text-center text-gray-400">통계 불러오는 중…</p>

  const T = stats.totals
  const appUsersMax = Math.max(0, ...Object.values(stats.app_usage).map((v) => v.users))
  const funnel = [
    { label: '가입 (이메일 인증)', n: T.auth_users },
    { label: '온보딩 완료 (프로필)', n: T.profiles },
    { label: '리포트 열람 사용자', n: T.reports_users },
    { label: '체크 1개 이상', n: T.checks_users },
    { label: '내 원서 기록 사용자', n: appUsersMax },
    { label: '2개월 이상 재방문', n: T.multi_month_users },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">운영 통계</h1>
          <p className="text-xs text-gray-400">집계 시각 {new Date(stats.generated_at).toLocaleString('ko-KR')} · 개인 식별 정보 없이 집계만 표시</p>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-gray-400 underline">← 홈</button>
      </div>

      {/* 학교별 비교 표 — 전체 기준, 필터와 무관 */}
      {bySchool && bySchool.length > 0 && (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="font-semibold text-gray-900">🏫 학교별 현황</h2>
          <p className="mb-2 text-xs text-gray-400">학교 이름은 온보딩에서 학생이 직접 입력 · 행을 누르면 아래 전체 통계가 그 학교 기준으로 바뀌어요</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="py-1 pr-2">학교</th><th className="pr-2">가입</th><th className="pr-2">30일 활성</th><th className="pr-2">재방문</th><th className="pr-2">리포트</th><th className="pr-2">체크</th><th className="pr-2">평균 완료율</th><th className="pr-2">내 원서</th><th className="pr-2">카운슬러 없음</th><th className="pr-2">국제학생</th><th className="pr-2">인기 전공</th><th className="pr-2">인기 목표 학교</th>
                </tr>
              </thead>
              <tbody>
                {bySchool.map((r) => {
                  const active = school === r.name || (school === '__none__' && r.name === '__none__')
                  return (
                    <tr key={r.name} onClick={() => setSchool(active ? null : r.name)} className={`cursor-pointer border-t border-gray-50 ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="max-w-[220px] truncate py-1.5 pr-2 font-medium text-gray-800">{r.name === '__none__' ? <span className="text-gray-400">학교 미입력</span> : r.name}</td>
                      <td className="pr-2 tabular-nums text-gray-700">{r.users}</td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.active_30d}</td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.returning_users} <span className="text-gray-400">({pct(r.returning_users, r.users)})</span></td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.report_users}</td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.check_users}</td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.avg_done_rate != null ? Math.round(r.avg_done_rate * 100) + '%' : '–'}</td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.app_users}</td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.no_counselor} <span className="text-gray-400">({pct(r.no_counselor, r.users)})</span></td>
                      <td className="pr-2 tabular-nums text-gray-500">{r.intl} <span className="text-gray-400">({pct(r.intl, r.users)})</span></td>
                      <td className="max-w-[180px] truncate pr-2 text-xs text-gray-500" title={(r.top_majors ?? []).map((m) => `${majorLabel(m.k)} ${m.n}`).join(' · ')}>
                        {(r.top_majors ?? []).length === 0 ? '–' : (r.top_majors ?? []).map((m) => `${majorLabel(m.k).split(' (')[0]} ${m.n}`).join(' · ')}
                      </td>
                      <td className="max-w-[220px] truncate pr-2 text-xs text-gray-500" title={(r.top_targets ?? []).map((tg) => `${tg.name} ${tg.n}`).join(' · ')}>
                        {(r.top_targets ?? []).length === 0 ? '–' : (r.top_targets ?? []).map((tg) => `${tg.name.replace('University of ', 'U. ').replace(' University', '')} ${tg.n}`).join(' · ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 학교 필터 — 학교별로 나눠 보기 */}
      {(stats.hs_schools ?? []).length > 0 && (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">학교별로 보기 {loadingStats && <span className="text-gray-400">· 불러오는 중…</span>}</p>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setSchool(null)} className={`rounded-full border px-3 py-1 text-xs ${school === null ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600'}`}>전체</button>
            {(stats.hs_schools ?? []).map((h) => (
              <button key={h.name} onClick={() => setSchool(h.name)} className={`rounded-full border px-3 py-1 text-xs ${school === h.name ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600'}`}>
                {h.name === '__none__' ? '학교 미입력' : h.name} <span className="text-gray-400">{h.n}</span>
              </button>
            ))}
          </div>
          {school && <p className="mt-2 text-xs text-blue-700">아래 모든 숫자는 <strong>{school === '__none__' ? '학교 미입력' : school}</strong> 사용자 기준이에요.</p>}
        </div>
      )}

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="총 가입자" value={T.auth_users} sub={`최근 7일 +${T.new_7d} · 30일 +${T.new_30d}`} />
        <Tile label="온보딩 완료" value={T.profiles} sub={pct(T.profiles, T.auth_users) + ' 전환'} />
        <Tile label="활성 사용자 (7일)" value={T.active_7d} sub={`30일 ${T.active_30d}`} />
        <Tile label="재방문 (2개월+)" value={T.multi_month_users} sub={pct(T.multi_month_users, T.profiles) + ' 리텐션'} />
        <Tile label="리포트 발급" value={T.reports_total} sub={`${T.reports_users}명`} />
        <Tile label="체크 완료" value={T.checks_total} sub={`${T.checks_users}명 · 평균 완료율 ${stats.checklist_progress.avg_done_rate != null ? Math.round(stats.checklist_progress.avg_done_rate * 100) + '%' : '–'}`} />
        <Tile label="알림 메일 발송" value={stats.reminders_sent} sub={`수신 거부 ${T.reminder_opt_out}`} />
        <Tile label="연구 동의" value={T.research_consent} sub={pct(T.research_consent, T.profiles)} />
      </div>

      {/* 인기 순위 하이라이트 — 데이터 쌓이면 자동 계산 */}
      {(() => {
        const majors = Object.entries(stats.major).filter(([k]) => k !== '?').sort((a, b) => b[1] - a[1]).slice(0, 5)
        const schools = stats.top_schools.slice(0, 5)
        const total = T.profiles
        if (majors.length === 0 && schools.length === 0) return null
        return (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="font-semibold text-gray-900">🏆 인기 전공 Top 5</p>
              <ol className="mt-2 space-y-1 text-sm">
                {majors.map(([k, v], i) => (
                  <li key={k} className="flex items-center gap-2"><span className="w-4 text-gray-400">{i + 1}</span><span className="flex-1 truncate text-gray-800">{majorLabel(k)}</span><span className="tabular-nums text-gray-500">{v}명 <span className="text-gray-400">({pct(v, total)})</span></span></li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="font-semibold text-gray-900">🎯 인기 목표 학교 Top 5</p>
              {schools.length === 0 ? <p className="mt-2 text-sm text-gray-400">아직 구체 학교를 고른 사용자가 없어요</p> : (
                <ol className="mt-2 space-y-1 text-sm">
                  {schools.map((sch, i) => (
                    <li key={sch.name} className="flex items-center gap-2"><span className="w-4 text-gray-400">{i + 1}</span><span className="flex-1 truncate text-gray-800">{sch.name}</span><span className="tabular-nums text-gray-500">{sch.n}명 <span className="text-gray-400">({pct(sch.n, total)})</span></span></li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )
      })()}

      <div className="mt-4 grid gap-4">
        <Card title="사용자 퍼널" hint="가입 → 온보딩 → 리포트 → 체크 → 내 원서 → 재방문. 어디서 이탈하는지 보는 용도">
          <div className="flex flex-col gap-1.5">
            {funnel.map((f, i) => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                <span className="w-40 shrink-0 text-gray-700">{f.label}</span>
                <div className="h-4 flex-1 rounded-sm bg-gray-100">
                  <div className="h-4 rounded-sm bg-blue-500" style={{ width: `${funnel[0].n > 0 ? (f.n / funnel[0].n) * 100 : 0}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums text-gray-500">{f.n} <span className="text-gray-400">({i === 0 ? '100%' : pct(f.n, funnel[0].n)})</span></span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="주별 신규 가입 (최근 16주)">
          <Bars points={stats.signups_by_week.map((w) => ({ label: w.week, n: w.n }))} labelEvery={1} />
        </Card>

        <Card title="일별 활동 (최근 30일)" hint="이벤트 = 로그인·체크·리포트 열람 등 모든 기록">
          <Lines points={stats.events_by_day} />
          <div className="mt-3"><BarList data={stats.events_by_type_30d} labels={eventKo} /></div>
        </Card>

        <Card title="사용자 구성 — 학년·전공">
          <p className="mb-1 text-xs font-medium text-gray-500">졸업연도</p>
          <BarList data={Object.fromEntries(Object.entries(stats.grad_year).map(([k, v]) => [k, v]))} labels={Object.fromEntries(Object.keys(stats.grad_year).map((k) => [k, k === '?' ? '미입력' : gradeOf(k)]))} />
          <p className="mb-1 mt-4 text-xs font-medium text-gray-500">1순위 전공</p>
          <BarList data={stats.major} labels={Object.fromEntries(Object.keys(stats.major).map((k) => [k, k === '?' ? '미입력' : majorLabel(k)]))} />
        </Card>

        <Card title="사용자 구성 — 상황" hint="타깃(카운슬러 없는 국제학생)이 실제로 오고 있는지 확인">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="mb-1 text-xs font-medium text-gray-500">지원 신분</p><BarList data={stats.applicant_status} labels={statusKo} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">전담 카운슬러</p><BarList data={stats.has_counselor} labels={ynKo} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">학교 국제 인증</p><BarList data={stats.school_accredited} labels={ynKo} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">목표 설정 방식</p><BarList data={stats.target_mode} labels={targetModeKo} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">목표 티어 (티어 선택자)</p><BarList data={stats.target_tier} labels={Object.fromEntries(Object.keys(stats.target_tier).map((k) => [k, tierLabels[Number(k)] ?? k]))} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">정보 출처 (복수)</p><BarList data={stats.info_sources} labels={infoKo} total={T.profiles} /></div>
          </div>
          <p className="mt-3 text-xs text-gray-500">미국 현지 학교 재학: {T.school_in_us}명</p>
        </Card>

        <Card title="목표 학교 Top 15" hint="구체 학교를 고른 사용자 기준, 중복 선택 포함">
          {stats.top_schools.length === 0 ? <p className="text-sm text-gray-400">아직 데이터 없음</p> : (
            <BarList data={Object.fromEntries(stats.top_schools.map((s) => [s.name, s.n]))} total={T.profiles} />
          )}
        </Card>

        <Card title="학업 프로필 분포">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="mb-1 text-xs font-medium text-gray-500">GPA 밴드</p><BarList data={stats.gpa_band} labels={{ ...gpaBandLabels, '?': '미입력' }} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">수학 과목</p><BarList data={stats.math_course} labels={{ ...mathCourseLabels, '?': '미입력' }} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">SAT 상태</p><BarList data={stats.sat_status} labels={{ ...satStatusLabels, '?': '미입력' }} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">SAT 밴드 (응시자)</p><BarList data={stats.sat_band} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">TOEFL 상태</p><BarList data={stats.toefl_status} labels={{ ...toeflStatusLabels, '?': '미입력' }} /></div>
          </div>
        </Card>

        <Card title="활동 자가진단 (온보딩)" hint="1=아직 없음 · 2=어느 정도 · 3=뚜렷함">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="mb-1 text-xs font-medium text-gray-500">대표 활동</p><BarList data={stats.activity_self.spike} labels={levelKo} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">리더십</p><BarList data={stats.activity_self.leadership} labels={levelKo} /></div>
            <div><p className="mb-1 text-xs font-medium text-gray-500">교외 인정</p><BarList data={stats.activity_self.validation} labels={levelKo} /></div>
          </div>
        </Card>

        <Card title="6축 평균 점수" hint="각 사용자의 최신 리포트 스냅샷 기준 평균 (0-100)">
          <BarList data={Object.fromEntries(axisOrder.filter((a) => stats.axis_avg[a] != null).map((a) => [a, stats.axis_avg[a] as number]))} labels={axisKo} total={0} />
          <p className="mt-1 text-xs text-gray-400">막대 옆 숫자는 평균 점수(비율 아님)</p>
        </Card>

        <Card title="시즌별 체크리스트 완료율">
          {stats.checklist_progress.by_season.length === 0 ? <p className="text-sm text-gray-400">아직 데이터 없음</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400"><th className="py-1">시즌</th><th>리포트 사용자</th><th>평균 완료율</th></tr></thead>
              <tbody>{stats.checklist_progress.by_season.map((s) => (
                <tr key={s.season} className="border-t border-gray-50"><td className="py-1.5 text-gray-700">{s.season}</td><td className="text-gray-500">{s.users}</td><td className="text-gray-500">{s.avg_done_rate != null ? Math.round(s.avg_done_rate * 100) + '%' : '–'}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card title="많이 체크된 항목 / 아무도 안 한 공통 항목" hint="콘텐츠 개선용 — 안 하는 항목은 문구·난도·시기 점검 대상">
          <p className="mb-1 text-xs font-medium text-gray-500">가장 많이 완료</p>
          {stats.most_checked.length === 0 ? <p className="text-sm text-gray-400">아직 없음</p> : <BarList data={Object.fromEntries(stats.most_checked.map((m) => [m.title, m.n]))} total={T.checks_users} />}
          <p className="mb-1 mt-4 text-xs font-medium text-gray-500">완료 적은 공통 항목 (하위 10)</p>
          <ul className="space-y-1 text-sm text-gray-600">
            {stats.least_checked.map((l) => <li key={l.title + l.grade + l.season}>· {l.grade}학년 {l.season} — {l.title} <span className="text-gray-400">({l.n})</span></li>)}
          </ul>
        </Card>

        <Card title="퀴즈·명확성 — 사용자 입시 이해도" hint="퀴즈 정답률이 낮은 문항 = 사용자가 가장 모르는 것 (콘텐츠 우선순위)">
          <p className="text-sm text-gray-700">퀴즈 응답 {stats.quiz.respondents}명 · 평균 {stats.quiz.avg_correct ?? '–'} / 5 정답</p>
          <ul className="mt-2 space-y-1 text-sm">
            {stats.quiz.per_item.map((q) => (
              <li key={q.id} className="flex items-center gap-2">
                <div className="h-2.5 w-24 shrink-0 rounded-sm bg-gray-100"><div className="h-2.5 rounded-sm bg-blue-500" style={{ width: `${q.correct_rate * 100}%` }} /></div>
                <span className="w-10 shrink-0 tabular-nums text-gray-500">{Math.round(q.correct_rate * 100)}%</span>
                <span className="text-gray-700">{q.question}</span>
              </li>
            ))}
          </ul>
          <p className="mb-1 mt-4 text-xs font-medium text-gray-500">명확성 자가평가 (1-5, 체크인 응답)</p>
          {stats.clarity.length === 0 ? <p className="text-sm text-gray-400">아직 없음</p> : (
            <ul className="space-y-1 text-sm">
              {stats.clarity.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <div className="h-2.5 w-24 shrink-0 rounded-sm bg-gray-100"><div className="h-2.5 rounded-sm bg-blue-500" style={{ width: `${(c.avg / 5) * 100}%` }} /></div>
                  <span className="w-10 shrink-0 tabular-nums text-gray-500">{c.avg}</span>
                  <span className="text-gray-700">{c.question} <span className="text-gray-400">(n={c.n})</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="내 원서(가상 Common App) 사용" hint="기능별 기록 수와 사용자 수 — 어떤 탭이 쓰이는지">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400"><th className="py-1">기능</th><th>기록 수</th><th>사용자</th><th>비고</th></tr></thead>
            <tbody>{Object.entries(stats.app_usage).map(([k, v]) => (
              <tr key={k} className="border-t border-gray-50"><td className="py-1.5 text-gray-700">{appKo[k] ?? k}</td><td className="text-gray-500">{v.rows}</td><td className="text-gray-500">{v.users}</td><td className="text-xs text-gray-400">{v.done != null ? `완료 ${v.done}` : v.with_round != null ? `라운드 배정 ${v.with_round}` : ''}</td></tr>
            ))}</tbody>
          </table>
          {Object.keys(stats.rounds).length > 0 && (<><p className="mb-1 mt-3 text-xs font-medium text-gray-500">지원 라운드 배정</p><BarList data={stats.rounds} labels={roundKo} /></>)}
        </Card>

        <Card title="🎓 졸업 후 결과 설문" hint="12학년 봄~졸업 모드에서 1회 수집 — 도움 정도·합격 결과·가장 유용했던 기능">
          {!extra ? <p className="text-sm text-gray-400">불러오는 중…</p> : extra.survey.n === 0 ? <p className="text-sm text-gray-400">아직 응답 없음 (첫 12학년 봄부터 쌓여요)</p> : (
            <div>
              <p className="text-sm text-gray-700">응답 {extra.survey.n}명 · 도움 정도 평균 <strong>{extra.survey.avg_helpful ?? '–'}</strong> / 5 · 연구 동의 {extra.survey.research_ok}명 · 졸업 모드 {extra.graduated}명</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div><p className="mb-1 text-xs font-medium text-gray-500">도움 정도 (1-5)</p><BarList data={extra.survey.helpful_dist ?? {}} /></div>
                <div><p className="mb-1 text-xs font-medium text-gray-500">합격 결과</p><BarList data={extra.survey.admitted ?? {}} labels={admittedKo} /></div>
                <div><p className="mb-1 text-xs font-medium text-gray-500">가장 도움 된 기능 (복수)</p><BarList data={extra.survey.features ?? {}} labels={featureKo} total={extra.survey.n} /></div>
                <div><p className="mb-1 text-xs font-medium text-gray-500">진학 학교</p>{(extra.survey.enrolled_top ?? []).length === 0 ? <p className="text-sm text-gray-400">없음</p> : <BarList data={Object.fromEntries(extra.survey.enrolled_top.map((e) => [e.name, e.n]))} total={extra.survey.n} />}</div>
              </div>
              {(extra.survey.comments ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-gray-500">한마디 (최근 50)</p>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {extra.survey.comments.map((c, i) => <li key={i} className="rounded-lg bg-gray-50 px-3 py-2">"{c.comment}" <span className="text-xs text-gray-400">— 도움 {c.helpful}/5 · {admittedKo[c.admitted] ?? c.admitted}</span></li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
        {extra && Object.keys(extra.lang ?? {}).length > 0 && (
          <Card title="언어 설정"><BarList data={extra.lang} labels={{ ko: '한국어', en: 'English', '?': '미설정' }} /></Card>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-gray-400">/admin · 운영자 전용</p>
    </div>
  )
}
