import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Pin, Search, Trophy, Sun, CalendarDays, Landmark, ExternalLink, Quote } from 'lucide-react'
import { t } from '../i18n'
import { goBack, navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import { majorClusters, majorParent } from '../data/majors'
import schoolsIndex from '../data/schools.index.json'
import data from '../data/programs.json'

// 대회·서머 프로그램 가이드 — 공식 출처만 (각 프로그램 공식 사이트·운영 대학·입학처 페이지), 2026-09-23 확인, 사용자 승인
export interface Mention { college: string; relation: 'host' | 'admissions_mention'; note_ko: string; note_en: string; url: string; school_id?: number }
export interface Program {
  key: string; name: string; type: 'competition' | 'summer' | 'event'; majors: string[]; host: string
  what_ko: string; what_en: string; do_ko: string; do_en: string; grades: string | null
  intl_eligibility: 'open' | 'restricted' | 'us_only' | null; intl_note_ko: string | null; intl_note_en: string | null
  cost_ko: string | null; cost_en: string | null; timing_ko: string | null; timing_en: string | null
  format: 'online' | 'in_person' | 'hybrid' | null; official_url: string; eligibility_url: string | null
  official_mentions: Mention[]; area: string
}
interface Statement { college: string; topic: string; statement_ko: string; statement_en: string; quote_en: string | null; url: string }

export const programs = (data as { programs: Program[] }).programs
const statements = (data as { statements: Statement[] }).statements
const schoolName = new Map((schoolsIndex as { id: number; name: string }[]).map((s) => [s.id, s.name]))

// 입학처 공식 입장 — 맨 위에 먼저 보여줄 것
const TOP_STATEMENTS = ['MIT|summer_no_advantage', 'Caltech|summer_no_advantage', 'Yale|precollege_disclaimer']

type Kind = 'all' | 'competition' | 'summer'

export function IntlBadge({ v }: { v: Program['intl_eligibility'] }) {
  const map = {
    open: ['bg-emerald-50 text-emerald-700 ring-emerald-200', t('국제학생 가능', 'Open to intl.')],
    restricted: ['bg-amber-50 text-amber-800 ring-amber-200', t('조건부', 'Conditions apply')],
    us_only: ['bg-rose-50 text-rose-700 ring-rose-200', t('미국 시민권·거주 필요', 'US only')],
    null: ['bg-gray-50 text-gray-500 ring-gray-200', t('참가 자격 확인 필요', 'Check eligibility')],
  } as const
  const [cls, label] = map[(v ?? 'null') as keyof typeof map]
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>{label}</span>
}

function TypeIcon({ type }: { type: Program['type'] }) {
  const Icon = type === 'competition' ? Trophy : type === 'summer' ? Sun : CalendarDays
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18} strokeWidth={1.9} /></span>
}

const typeLabel = (type: Program['type']) => (type === 'competition' ? t('대회', 'Competition') : type === 'summer' ? t('서머 프로그램', 'Summer program') : t('행사', 'Event'))

export default function ProgramsGuidePage({ profile }: { profile: ProfileRow | null }) {
  const params = new URLSearchParams(window.location.search)
  const startMajor = params.get('major') ?? profile?.major_primary ?? null
  const startCluster = majorClusters.findIndex((c) => c.values.includes(majorParent(startMajor) ?? '') || c.values.includes(startMajor ?? ''))
  const [cluster, setCluster] = useState<number>(startCluster)
  const [kind, setKind] = useState<Kind>('all')
  const [hideUs, setHideUs] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [allStatements, setAllStatements] = useState(false)

  useEffect(() => {
    document.title = t('미국 대입 대회·서머 프로그램 가이드 — 전공별 추천, 국제학생 참가 자격 | 미국 대입 로드맵', 'Competitions & summer programs by major — international eligibility | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const rows = useMemo(() => {
    const vals = cluster >= 0 ? new Set(majorClusters[cluster].values) : null
    const needle = q.trim().toLowerCase()
    const order = { open: 0, restricted: 1, null: 2, us_only: 3 } as Record<string, number>
    return programs
      .filter((p) => !vals || p.majors.some((m) => vals.has(m)))
      .filter((p) => kind === 'all' || p.type === kind || (kind === 'summer' && p.type === 'event'))
      .filter((p) => !hideUs || p.intl_eligibility !== 'us_only')
      .filter((p) => !needle || `${p.name} ${p.host} ${p.what_ko} ${p.what_en}`.toLowerCase().includes(needle))
      // 내 전공에 딱 맞는 것 먼저, 그다음 국제학생 참가 쉬운 순
      .sort((a, b) => (startMajor ? Number(!a.majors.includes(startMajor)) - Number(!b.majors.includes(startMajor)) : 0) || order[a.intl_eligibility ?? 'null'] - order[b.intl_eligibility ?? 'null'])
  }, [cluster, kind, hideUs, q, startMajor])

  const usOnlyCount = programs.filter((p) => p.intl_eligibility === 'us_only').length
  const top = TOP_STATEMENTS.map((k) => statements.find((s) => `${s.college}|${s.topic}` === k)).filter(Boolean) as Statement[]
  const shownStatements = allStatements ? statements : top

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${on ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{label}</button>
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('대회·서머 프로그램', 'Competitions & summer programs')}</h1>
        </div>

        {/* 입학처 공식 입장 */}
        <div className="mt-4 rounded-2xl bg-gray-900 px-5 py-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200">{t('먼저 알아둘 것 — 입학처 공식 입장', 'First — what admissions offices officially say')}</p>
          <p className="mt-2 text-[15px] font-semibold leading-snug">{t('비싼 서머 프로그램은 필수가 아니에요. 무엇을 했는지보다 그 경험으로 어떻게 성장했는지가 중요해요.', 'Expensive summer programs are not required. What matters is how you grew, not where you went.')}</p>
          <div className="mt-3 flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-2.5">
            {shownStatements.map((s, i) => (
              <div key={i} className="rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-200"><Quote size={12} />{s.college}</p>
                <p className={`mt-1 text-[13px] leading-relaxed text-blue-50/90 ${allStatements ? '' : 'line-clamp-2'}`}>{t(s.statement_ko, s.statement_en)}</p>
                {s.quote_en && <p className="mt-1.5 text-[12px] italic text-blue-100/60">“{s.quote_en}”</p>}
                <a href={s.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] text-blue-200 underline">{t('공식 출처', 'Official source')}<ExternalLink size={10} /></a>
              </div>
            ))}
          </div>
          <button onClick={() => setAllStatements((v) => !v)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-200">
            {allStatements ? t('접기', 'Show less') : t(`전문 보기 · 대학 공식 입장 ${statements.length}개`, `Read in full · all ${statements.length} statements`)} <ChevronDown size={14} className={allStatements ? 'rotate-180' : ''} />
          </button>
        </div>

        {/* 필터 */}
        <div className="relative mt-5">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('이름으로 찾기 (예: USACO, RISD)', 'Search by name (e.g. USACO, RISD)')} className="w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-600 focus:outline-none" />
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {chip(cluster === -1, t('전체 전공', 'All majors'), () => setCluster(-1))}
          {majorClusters.map((c, i) => programs.some((p) => p.majors.some((m) => c.values.includes(m))) && chip(cluster === i, t(c.ko, c.en), () => setCluster(i)))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {chip(kind === 'all', t('전체', 'All'), () => setKind('all'))}
          {chip(kind === 'competition', t('대회', 'Competitions'), () => setKind('competition'))}
          {chip(kind === 'summer', t('서머 프로그램', 'Summer programs'), () => setKind('summer'))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={hideUs} onChange={(e) => setHideUs(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            {t(`미국 시민권·거주 필요한 것 숨기기 (${usOnlyCount})`, `Hide US-only (${usOnlyCount})`)}
          </label>
        </div>

        <p className="mt-3 text-xs text-gray-500">{t(`${rows.length}개`, `${rows.length} items`)}</p>
        <div className="mt-1.5 flex flex-col gap-2">
          {rows.map((p) => {
            const isOpen = open === p.key
            const hosts = p.official_mentions.filter((m) => m.relation === 'host')
            const mentions = p.official_mentions.filter((m) => m.relation === 'admissions_mention')
            return (
              <div key={p.key} id={`p-${p.key}`} className="rounded-xl border-2 border-gray-200 bg-white">
                <button onClick={() => setOpen(isOpen ? null : p.key)} aria-expanded={isOpen} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
                  <TypeIcon type={p.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold leading-snug text-gray-900">{p.name}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-gray-500">{typeLabel(p.type)}</span>
                      <IntlBadge v={p.intl_eligibility} />
                      {mentions.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"><Landmark size={11} />{[...new Set(mentions.map((m) => m.college))].join('·')}{t(' 입학처 언급', ' admissions')}</span>}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{t(p.what_ko, p.what_en)}</p>
                  </div>
                  <ChevronDown size={16} className={`mt-1 shrink-0 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3.5 text-[13px] leading-relaxed">
                    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2">
                      <dt className="text-gray-400">{t('뭘 하나요', 'What you do')}</dt><dd className="text-gray-800">{t(p.do_ko, p.do_en)}</dd>
                      <dt className="text-gray-400">{t('주최', 'Run by')}</dt><dd className="text-gray-800">{p.host}</dd>
                      {p.grades && <><dt className="text-gray-400">{t('대상', 'Who')}</dt><dd className="text-gray-800">{p.grades}</dd></>}
                      <dt className="text-gray-400">{t('국제학생', 'Intl. students')}</dt><dd className="text-gray-800">{t(p.intl_note_ko ?? '공식 페이지에 명시돼 있지 않아요 — 주최 측에 직접 확인하세요.', p.intl_note_en ?? 'Not stated officially — check with the organizer.')}</dd>
                      {p.timing_ko && <><dt className="text-gray-400">{t('시기', 'Timing')}</dt><dd className="text-gray-800">{t(p.timing_ko, p.timing_en ?? p.timing_ko)}</dd></>}
                      {p.cost_ko && <><dt className="text-gray-400">{t('비용', 'Cost')}</dt><dd className="text-gray-800">{t(p.cost_ko, p.cost_en ?? p.cost_ko)}</dd></>}
                      {p.format && <><dt className="text-gray-400">{t('방식', 'Format')}</dt><dd className="text-gray-800">{p.format === 'online' ? t('온라인', 'Online') : p.format === 'in_person' ? t('현장', 'In person') : t('온라인+현장', 'Hybrid')}</dd></>}
                    </dl>
                    {(hosts.length > 0 || mentions.length > 0) && (
                      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
                        <p className="text-xs font-semibold text-gray-500">{t('공식적으로 명시한 대학', 'Colleges that officially name it')}</p>
                        <ul className="mt-1.5 flex flex-col gap-1.5">
                          {[...hosts, ...mentions].map((m, i) => (
                            <li key={i} className="text-xs leading-relaxed text-gray-700">
                              <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.relation === 'host' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}>{m.relation === 'host' ? t('운영', 'Runs it') : t('입학처 언급', 'Admissions')}</span>
                              {m.school_id && schoolName.has(m.school_id)
                                ? <button onClick={() => navigate(`/schools/${slugify(schoolName.get(m.school_id!)!)}`)} className="font-semibold text-gray-900 underline decoration-gray-300 underline-offset-2">{m.college}</button>
                                : <span className="font-semibold text-gray-900">{m.college}</span>}
                              {' — '}{t(m.note_ko, m.note_en)}{' '}
                              <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('출처', 'source')}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <a href={p.official_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-blue-600 underline">{t('공식 사이트', 'Official site')}<ExternalLink size={11} /></a>
                      {p.eligibility_url && p.eligibility_url !== p.official_url && <a href={p.eligibility_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 underline">{t('참가 자격 원문', 'Eligibility page')}<ExternalLink size={11} /></a>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {rows.length === 0 && <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500 ring-1 ring-gray-200">{t('조건에 맞는 항목이 없어요.', 'Nothing matches.')}</p>}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
          <Pin size={12} strokeWidth={2} className="mr-1 inline -mt-0.5" />
          {t('각 프로그램 공식 사이트와 운영 대학·입학처 페이지에서 확인한 내용이에요(2026년 9월). 참가 자격·비용·일정은 해마다 바뀌니 지원 전에 공식 페이지를 꼭 다시 확인하세요. 대회·프로그램 참가가 합격을 보장하지 않아요.', 'Checked on each program’s official site and on college pages (September 2026). Eligibility, costs and timing change every year — re-check the official page before applying. No program guarantees admission.')}
        </p>

        <button onClick={() => navigate(profile ? '/app' : '/')} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700">
          {profile ? t('내 원서에 수상·활동 기록하기 →', 'Log honors & activities in My App →') : t('가입하고 수상·활동 기록 시작하기', 'Sign up and start logging honors & activities')}
        </button>
      </div>
    </div>
  )
}
