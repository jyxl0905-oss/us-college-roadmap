import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Scale, Check, AlertTriangle, ExternalLink, Search, X } from 'lucide-react'
import { t } from '../i18n'
import { goBack, navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { loadSchools } from '../lib/schoolsCache'
import { timingLabel } from '../lib/academics'
import { dataFitOf } from '../lib/dataFit'
import { fitLabels } from '../board/boardLogic'
import { majorLabel, directAdmitParent } from '../data/majors'
import { costFor } from '../browse/CostBlock'
import { loadC7, factorLabel, type C7Row, type FactorKey } from '../lib/c7'
import SchoolLogo from '../browse/SchoolLogo'
import { PLANS, TIMELINE, OUTCOMES, REA_RULES, SOURCES, type PlanKey } from './applyPlansContent'

// 지원 방식(ED·ED2·EA·REA·RD·롤링) 가이드 + 내 목표 학교의 지원 방식 + ED 학교 고민 비교
// 제도 설명은 Common App·College Board·각 대학 공식 페이지 기준(applyPlansContent.ts), 학교별 지원 방식은 학교 데이터(공식 입학처 확인분)
// ED 비교는 공식 수치를 나란히 놓고 규칙대로 "맞는 점·고려할 점"만 보여줌 — 합격 가능성 예측 아님

const fmt$ = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const pct = (n: number | null | undefined) => (n === null || n === undefined ? null : `${n < 10 ? n.toFixed(1) : Math.round(n)}%`)

function plansOf(s: School): { key: PlanKey; timing: string | null }[] {
  const out: { key: PlanKey; timing: string | null }[] = []
  if (s.ed_offered) out.push({ key: 'ed', timing: s.ed_timing ?? null })
  if (s.ed2_offered) out.push({ key: 'ed2', timing: s.ed2_timing ?? null })
  if (s.rea_offered) out.push({ key: 'rea', timing: s.ea_timing ?? null })
  else if (s.ea_offered) out.push({ key: 'ea', timing: s.ea_timing ?? null })
  if (s.rd_timing) out.push({ key: s.rd_timing.startsWith('롤링') ? 'rolling' : 'rd', timing: s.rd_timing })
  return out
}
const hasPlanData = (s: School) => s.ed_offered !== undefined && s.ed_offered !== null

// CDS C21 ED 합격률 (지원자 수가 너무 적으면 표시 안 함)
const edRate = (s: School) => (s.ed_applied && s.ed_admitted && s.ed_applied >= 30 ? (s.ed_admitted / s.ed_applied) * 100 : null)

interface Point { ok: boolean; ko: string; en: string }

// 규칙 기반 "맞는 점·고려할 점" — 공식 수치와 내 프로필만 사용
function pointsFor(s: School, p: ProfileRow | null, c7: C7Row | undefined): Point[] {
  const out: Point[] = []
  const intl = p ? p.applicant_status !== 'domestic' : true
  if (s.ed2_offered && s.ed_offered) out.push({ ok: true, ko: 'ED2도 있어서, ED1을 다른 학교에 쓰고 여기를 ED2로 쓰는 선택지도 있어요.', en: 'Also offers ED2 — you could use ED1 elsewhere and apply here ED2.' })
  if (s.ed_offered && !s.ed2_offered) out.push({ ok: false, ko: 'ED2가 없어서, 이 학교에 구속력 있는 조기 지원을 하려면 ED1뿐이에요.', en: 'No ED2 — ED1 is the only binding early option here.' })
  if (intl) {
    if (s.need_blind_intl === true && s.meets_full_need_intl === true) out.push({ ok: true, ko: '국제학생도 need-blind이고 필요한 재정지원을 전액 채워준다고 공식 발표했어요.', en: 'Officially need-blind for international students and meets full demonstrated need.' })
    else if (s.meets_full_need_intl === true) out.push({ ok: true, ko: '국제학생에게도 필요한 재정지원을 전액 채워준다고 공식 발표했어요 (심사는 need-aware).', en: 'Meets full need for international students (admission is need-aware).' })
    else if (s.need_blind_intl === false) out.push({ ok: false, ko: '국제학생은 need-aware예요. 재정지원이 필요하면 ED 약속(합격 시 등록)과 비용을 함께 따져 봐야 해요.', en: 'Need-aware for international students — weigh ED’s binding commitment against cost if you need aid.' })
  }
  const cost = costFor(s.id)
  if (cost?.total) out.push({ ok: false, ko: `1년 총비용(공식) ${fmt$(cost.total)} — ED는 합격하면 등록해야 해서, 가족과 비용을 먼저 확인하세요.`, en: `Official yearly cost ${fmt$(cost.total)} — ED is binding, so check the cost with your family first.` })
  if (p) {
    const fit = dataFitOf(p, s)
    if (fit) out.push({ ok: fit !== 'reach', ko: `내 SAT 구간 기준 분류: ${fitLabels[fit]} (공식 중간 50%·합격률 기준 참고용)`, en: `By your SAT band: ${fitLabels[fit]} (reference only, from official mid-50% and admit rate)` })
    if (p.sat_status === 'none' && s.test_policy === 'test-required') out.push({ ok: false, ko: '시험 점수 제출이 필수인 학교인데, 아직 SAT 계획이 없어요.', en: 'Requires test scores, and you have no SAT plan yet.' })
    const major = p.major_primary && p.major_primary !== 'undecided' ? p.major_primary : null
    if (major && s.direct_admit_majors.includes(directAdmitParent(major) as string)) out.push({ ok: false, ko: `희망 전공(${majorLabel(major)})은 지원할 때 학과에 바로 지원하는 전공이라, 학과 경쟁을 따로 봐요.`, en: `Your major (${majorLabel(major)}) is direct-admit here — the department’s competition counts separately.` })
  }
  if (s.demonstrated_interest === true) out.push({ ok: true, ko: '관심 표현(demonstrated interest)을 심사에 반영한다고 공시한 학교예요.', en: 'Officially considers demonstrated interest.' })
  const vi = c7 ? (Object.entries(c7.levels).filter(([, v]) => v === 'VI').map(([k]) => factorLabel(k as FactorKey))) : []
  if (vi.length) out.push({ ok: true, ko: `공식 자료(CDS)에서 "매우 중요"로 본다고 밝힌 것: ${vi.join(', ')}`, en: `Rated "very important" in its CDS: ${vi.join(', ')}` })
  return out
}

export default function ApplyPlansPage({ profile }: { profile: ProfileRow | null }) {
  const [open, setOpen] = useState<PlanKey | null>('ed')
  const [schools, setSchools] = useState<School[] | null>(null)
  const [c7, setC7] = useState<Map<number, C7Row> | null>(null)
  const [picked, setPicked] = useState<number[]>([])
  const [q, setQ] = useState('')
  const targets = useMemo(() => profile?.target_school_ids ?? [], [profile])

  useEffect(() => {
    document.title = t('미국 대학 지원 방식 가이드 — ED·EA·REA·RD 차이 | 미국 대입 로드맵', 'US college application plans — ED, EA, REA and RD explained | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])
  useEffect(() => { void loadSchools().then(setSchools); void loadC7().then(setC7) }, [])

  const byId = useMemo(() => new Map((schools ?? []).map((s) => [s.id, s])), [schools])
  const mine = useMemo(() => targets.map((id) => byId.get(id)).filter(Boolean) as School[], [targets, byId])
  const counts = useMemo(() => {
    const list = schools ?? []
    return { ed: list.filter((s) => s.ed_offered).length, ed2: list.filter((s) => s.ed2_offered).length, ea: list.filter((s) => s.ea_offered && !s.rea_offered).length, rea: list.filter((s) => s.rea_offered).length, total: list.filter(hasPlanData).length }
  }, [schools])
  // ED 비교 후보: 기본은 내 목표 학교 중 ED·ED2 있는 곳
  const edTargets = mine.filter((s) => s.ed_offered || s.ed2_offered)
  useEffect(() => { if (!picked.length && edTargets.length) setPicked(edTargets.slice(0, 3).map((s) => s.id)) }, [edTargets.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: number) => setPicked((v) => (v.includes(id) ? v.filter((x) => x !== id) : v.length >= 3 ? v : [...v, id]))
  const search = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle || !schools) return []
    return schools.filter((s) => (s.ed_offered || s.ed2_offered) && `${s.name} ${s.name_ko ?? ''}`.toLowerCase().includes(needle)).slice(0, 6)
  }, [q, schools])
  const compared = picked.map((id) => byId.get(id)).filter(Boolean) as School[]
  const planName = (k: PlanKey) => PLANS.find((x) => x.key === k)!.short

  const chip = (k: PlanKey, timing: string | null) => (
    <span key={k} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
      {planName(k)}{timing && <span className="font-medium text-gray-500">{k === 'rolling' ? '' : timingLabel(timing)}</span>}
    </span>
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><CalendarDays size={21} strokeWidth={2} />{t('지원 방식 가이드', 'Application plans')}</h1>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
          {t('ED·EA·REA·RD가 뭐가 다른지, 합격하면 꼭 가야 하는지, 몇 군데까지 쓸 수 있는지를 쉽게 정리했어요. 설명은 Common App·College Board·각 대학 공식 페이지 기준이고, 학교마다 규칙이 조금씩 달라서 최종 확인은 지원하는 학교 입학처에서 하세요.', 'What ED, EA, REA and RD mean, whether you must attend if admitted, and how many you can use — in plain language, based on Common App, College Board and official college pages. Rules vary a little by school, so confirm with each admissions office.')}
        </p>

        {/* 한눈에 비교 */}
        <h2 className="mt-6 text-sm font-bold text-gray-900">{t('한눈에 비교', 'At a glance')}</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border-2 border-gray-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-[12px]">
            <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500">
              <tr>
                <th className="px-3 py-2">{t('방식', 'Plan')}</th>
                <th className="px-3 py-2">{t('합격하면 꼭 가야 해요?', 'Binding?')}</th>
                <th className="px-3 py-2">{t('다른 학교 조기 지원', 'Other early apps')}</th>
                <th className="px-3 py-2">{t('보통 마감', 'Usual deadline')}</th>
                <th className="px-3 py-2">{t('보통 발표', 'Usual decision')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PLANS.map((x) => (
                <tr key={x.key}>
                  <td className="px-3 py-2 font-bold text-gray-900">{x.short}<span className="block text-[10.5px] font-medium text-gray-400">{x.full}</span></td>
                  <td className={`px-3 py-2 font-semibold ${x.binding ? 'text-red-700' : 'text-green-700'}`}>{t(x.bindingText[0], x.bindingText[1])}</td>
                  <td className="px-3 py-2 text-gray-700">{t(x.others[0], x.others[1])}</td>
                  <td className="px-3 py-2 text-gray-700">{t(x.deadline[0], x.deadline[1])}</td>
                  <td className="px-3 py-2 text-gray-700">{t(x.decision[0], x.decision[1])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 제도별 설명 */}
        <h2 className="mt-6 text-sm font-bold text-gray-900">{t('하나씩 쉽게', 'Each plan, simply')}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {PLANS.map((x) => {
            const on = open === x.key
            const n = x.key === 'ed' ? counts.ed : x.key === 'ed2' ? counts.ed2 : x.key === 'ea' ? counts.ea : x.key === 'rea' ? counts.rea : null
            return (
              <div key={x.key} className="rounded-2xl border-2 border-gray-200 bg-white">
                <button onClick={() => setOpen(on ? null : x.key)} aria-expanded={on} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                  <span>
                    <span className="text-[15px] font-bold text-gray-900">{x.short}</span>
                    <span className="ml-1.5 text-[12px] font-medium text-gray-500">{t(x.oneLine[0], x.oneLine[1])}</span>
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${on ? 'rotate-180' : ''}`} />
                </button>
                {on && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 text-[13px] leading-relaxed text-gray-700">
                    <ul className="flex flex-col gap-1.5">
                      {x.points.map((pt, i) => <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />{t(pt[0], pt[1])}</li>)}
                    </ul>
                    {x.caution && <p className="mt-2.5 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{t(x.caution[0], x.caution[1])}</p>}
                    {n !== null && schools && <p className="mt-2.5 text-[12px] text-gray-500">{t(`이 사이트 학교 데이터 기준 ${x.short} 있는 학교: ${n}곳 (지원 방식이 확인된 ${counts.total}곳 중)`, `Schools offering ${x.short} in our data: ${n} (of ${counts.total} with verified plans)`)}</p>}
                    {x.key === 'rea' && (
                      <div className="mt-3 overflow-x-auto">
                        <p className="mb-1.5 text-[12px] font-semibold text-gray-900">{t('REA·SCEA 학교별로 같이 쓸 수 있는 것', 'What each REA/SCEA school still allows')}</p>
                        <table className="w-full min-w-[480px] text-[12px]">
                          <tbody className="divide-y divide-gray-100">
                            {REA_RULES.map((r) => (
                              <tr key={r.school}>
                                <td className="py-1.5 pr-2 align-top font-semibold text-gray-900">{t(r.ko, r.school)}<span className="block text-[10.5px] font-medium text-gray-400">{r.plan}</span></td>
                                <td className="py-1.5 align-top text-gray-700">{t(r.allows[0], r.allows[1])} <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 underline">{t('공식', 'Official')}<ExternalLink size={10} /></a></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 일정 */}
        <h2 className="mt-6 text-sm font-bold text-gray-900">{t('1년 일정 (보통)', 'Typical timeline')}</h2>
        <ol className="mt-2 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3">
          {TIMELINE.map((x, i) => (
            <li key={i} className="flex gap-3 py-1.5 text-[13px]">
              <span className="w-24 shrink-0 font-bold text-gray-900">{t(x.when[0], x.when[1])}</span>
              <span className="text-gray-700">{t(x.what[0], x.what[1])}</span>
            </li>
          ))}
        </ol>

        {/* 조기 지원 결과 */}
        <h2 className="mt-6 text-sm font-bold text-gray-900">{t('조기 지원 결과는 세 가지', 'Three early-round outcomes')}</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {OUTCOMES.map((o) => (
            <div key={o.title[1]} className="rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-3">
              <p className="text-[13px] font-bold text-gray-900">{t(o.title[0], o.title[1])}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{t(o.body[0], o.body[1])}</p>
            </div>
          ))}
        </div>

        {/* 내 목표 학교의 지원 방식 */}
        <h2 className="mt-8 text-sm font-bold text-gray-900">{t('내 목표 학교는 어떤 방식으로 지원할 수 있나', 'How you can apply to your target schools')}</h2>
        {!profile ? (
          <p className="mt-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 py-4 text-[13px] text-gray-600">
            {t('로그인하고 목표 학교를 고르면, 학교마다 ED·EA·REA·RD 중 무엇이 되는지 여기서 한 번에 보여줘요.', 'Sign in and pick target schools to see which plans each one offers here.')}
            <button onClick={() => navigate('/')} className="ml-1 font-semibold text-blue-600 underline">{t('시작하기', 'Get started')}</button>
          </p>
        ) : mine.length === 0 ? (
          <p className="mt-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 py-4 text-[13px] text-gray-600">
            {t('아직 목표 학교를 직접 고르지 않았어요. 목표 학교를 고르면 학교마다 지원 방식을 보여줘요.', 'You haven’t picked specific target schools yet. Pick some to see their plans here.')}
            <button onClick={() => navigate('/targets')} className="ml-1 font-semibold text-blue-600 underline">{t('목표 학교 고르기', 'Pick targets')}</button>
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {mine.map((s) => {
              const ps = plansOf(s)
              return (
                <div key={s.id} className="flex items-start gap-3 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5">
                  <SchoolLogo schoolId={s.id} name={s.name} size={28} />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="text-left text-[13px] font-bold text-gray-900 hover:underline">{t(s.name_ko ?? s.name, s.name)}</button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {hasPlanData(s) && ps.length ? ps.map((x) => chip(x.key, x.timing)) : <span className="text-[11.5px] text-gray-400">{t('지원 방식 확인 전 — 학교 입학처에서 확인하세요', 'Plans not verified yet — check the admissions site')}</span>}
                    </div>
                  </div>
                  {s.deadlines_source_url && <a href={s.deadlines_source_url} target="_blank" rel="noreferrer" aria-label={t('공식 마감 페이지', 'Official deadlines page')} className="shrink-0 p-1 text-gray-400 hover:text-blue-600"><ExternalLink size={14} /></a>}
                </div>
              )
            })}
            <button onClick={() => navigate('/deadlines')} className="self-start text-[12px] font-semibold text-blue-600 underline">{t('마감 캘린더에서 날짜순으로 보기 →', 'See them by date in Deadlines →')}</button>
          </div>
        )}

        {/* ED 학교 고민 비교 */}
        <h2 className="mt-8 flex items-center gap-1.5 text-sm font-bold text-gray-900"><Scale size={16} strokeWidth={2} />{t('ED를 어디에 쓸지 고민될 때', 'Deciding where to use ED')}</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-gray-600">
          {t('ED는 합격하면 꼭 가야 해서, "가장 가고 싶은 학교"이면서 "비용을 감당할 수 있는 학교"여야 해요. 후보를 최대 3곳 고르면 공식 자료와 내 프로필로 맞는 점과 고려할 점을 나란히 보여줘요. 합격 가능성을 예측하는 게 아니라, 판단에 필요한 사실을 모아 주는 거예요.', 'ED is binding, so it should be your clear first choice and a school you can afford. Pick up to 3 candidates to see official facts and your profile side by side. This doesn’t predict admission — it gathers the facts you need to decide.')}
        </p>
        <div className="mt-2 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3">
          {edTargets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {edTargets.map((s) => {
                const on = picked.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggle(s.id)} aria-pressed={on} className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-semibold ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
                    {on && <Check size={12} strokeWidth={2.5} />}{t(s.name_ko ?? s.name, s.name)}
                  </button>
                )
              })}
            </div>
          )}
          <div className="relative mt-2">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ED·ED2 있는 학교 검색해서 추가', 'Search schools with ED/ED2 to add')} className="w-full rounded-lg border-2 border-gray-200 bg-white py-1.5 pl-8 pr-2 text-[13px]" />
          </div>
          {search.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {search.map((s) => (
                <button key={s.id} onClick={() => { toggle(s.id); setQ('') }} disabled={!picked.includes(s.id) && picked.length >= 3} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:opacity-40">
                  + {t(s.name_ko ?? s.name, s.name)}
                </button>
              ))}
            </div>
          )}
          {picked.length >= 3 && <p className="mt-1.5 text-[11px] text-gray-400">{t('최대 3곳까지 비교할 수 있어요.', 'Up to 3 schools.')}</p>}
        </div>

        {compared.length > 0 && (
          <div className={`mt-2 grid gap-2 ${compared.length > 1 ? 'sm:grid-cols-2' : ''} ${compared.length > 2 ? 'lg:grid-cols-3' : ''}`}>
            {compared.map((s) => {
              const pts = pointsFor(s, profile, c7?.get(s.id))
              const good = pts.filter((x) => x.ok)
              const care = pts.filter((x) => !x.ok)
              const er = edRate(s)
              const cost = costFor(s.id)
              return (
                <div key={s.id} className="rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <SchoolLogo schoolId={s.id} name={s.name} size={26} />
                      <p className="truncate text-[14px] font-bold text-gray-900">{t(s.name_ko ?? s.name, s.name)}</p>
                    </div>
                    <button onClick={() => toggle(s.id)} aria-label={t('비교에서 빼기', 'Remove')} className="shrink-0 p-0.5 text-gray-400 hover:text-gray-700"><X size={15} /></button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">{plansOf(s).map((x) => chip(x.key, x.timing))}</div>
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[12px]">
                    <dt className="text-gray-500">{t('ED 합격률 (CDS)', 'ED admit rate (CDS)')}</dt><dd className="text-right font-semibold text-gray-900">{er !== null ? `${pct(er)}${s.ed_cds_year ? ` · ${s.ed_cds_year}` : ''}` : '—'}</dd>
                    <dt className="text-gray-500">{t('전체 합격률', 'Overall admit rate')}</dt><dd className="text-right font-semibold text-gray-900">{pct(s.overall_accept_rate) ?? '—'}</dd>
                    <dt className="text-gray-500">{t('국제학생 합격률', 'Intl admit rate')}</dt><dd className="text-right font-semibold text-gray-900">{pct(s.intl_accept_rate) ?? '—'}</dd>
                    <dt className="text-gray-500">SAT {t('중간 50%', 'mid-50%')}</dt><dd className="text-right font-semibold text-gray-900">{s.sat_mid50_low && s.sat_mid50_high ? `${s.sat_mid50_low}–${s.sat_mid50_high}` : '—'}</dd>
                    <dt className="text-gray-500">{t('1년 총비용', 'Yearly cost')}</dt><dd className="text-right font-semibold text-gray-900">{cost?.total ? fmt$(cost.total) : '—'}</dd>
                    <dt className="text-gray-500">{t('규모·위치', 'Size & place')}</dt><dd className="text-right font-semibold text-gray-900">{[s.ugds ? t(`학부 ${s.ugds.toLocaleString()}명`, `${s.ugds.toLocaleString()} undergrads`) : null, s.city && s.state ? `${s.city}, ${s.state}` : s.state].filter(Boolean).join(' · ') || '—'}</dd>
                  </dl>
                  {good.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[11.5px] font-bold text-green-700">{t(`나에게 맞는 점 ${good.length}`, `In your favor (${good.length})`)}</p>
                      <ul className="mt-1 flex flex-col gap-1">{good.map((x, i) => <li key={i} className="flex gap-1.5 text-[12px] leading-snug text-gray-700"><Check size={13} className="mt-0.5 shrink-0 text-green-600" />{t(x.ko, x.en)}</li>)}</ul>
                    </div>
                  )}
                  {care.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[11.5px] font-bold text-amber-700">{t(`고려할 점 ${care.length}`, `To weigh (${care.length})`)}</p>
                      <ul className="mt-1 flex flex-col gap-1">{care.map((x, i) => <li key={i} className="flex gap-1.5 text-[12px] leading-snug text-gray-700"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />{t(x.ko, x.en)}</li>)}</ul>
                    </div>
                  )}
                  <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="mt-2.5 text-[12px] font-semibold text-blue-600 underline">{t('학교 상세 보기 →', 'School details →')}</button>
                </div>
              )
            })}
          </div>
        )}
        {compared.length > 0 && (
          <div className="mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-[12.5px] leading-relaxed text-blue-950">
            <p className="font-bold">{t('ED 결정 전 스스로 확인할 것', 'Ask yourself before choosing ED')}</p>
            <ol className="mt-1 list-decimal pl-4">
              <li>{t('다른 학교에 다 붙어도 이 학교를 고를 만큼 1지망인가요?', 'Would you still pick this school if every other one admitted you?')}</li>
              <li>{t('합격하면 이 비용을 가족이 감당할 수 있나요? (재정지원이 필요하면 학교의 Net Price Calculator를 먼저 돌려 보세요)', 'Can your family afford it if admitted? (If you need aid, run the school’s Net Price Calculator first.)')}</li>
              <li>{t('11월 초까지 에세이·추천서·시험 점수를 제대로 준비할 수 있나요? 아니면 ED2가 나은가요?', 'Can your essays, recommendations and scores be ready by early November — or is ED2 better?')}</li>
            </ol>
            <p className="mt-1.5 text-[11.5px] text-blue-900/80">{t('ED 합격률은 지원자 구성(체육 특기생 등)이 RD와 달라서 그대로 비교하기 어려워요. 숫자보다 "정말 1지망인지"가 먼저예요.', 'ED admit rates reflect a different applicant pool than RD, so compare with care — being sure it’s your first choice comes first.')}</p>
          </div>
        )}

        <h2 className="mt-8 text-sm font-bold text-gray-900">{t('출처', 'Sources')}</h2>
        <ul className="mt-1.5 flex flex-col gap-1 text-[12px]">
          {SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 underline">{s.label}<ExternalLink size={10} /></a></li>)}
          <li className="text-gray-500">{t('학교별 지원 방식·시기: 각 대학 공식 입학처 (학교 상세 페이지에 출처 표시)', 'Per-school plans and timing: each college’s admissions site (linked on school pages)')}</li>
        </ul>
      </div>
    </div>
  )
}
