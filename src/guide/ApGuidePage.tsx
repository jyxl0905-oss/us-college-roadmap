import { useEffect, useMemo, useState } from 'react'
import { t } from '../i18n'
import { goBack, navigate } from '../lib/router'
import apData from '../data/ap.json'

// AP 가이드 — 전 과목(배우는 내용·선수 과목·시험 형식·점수 분포) + 최근 정책 변화. 모든 내용 College Board 공식 출처 (2026-09-24 확인, 사용자 승인)
interface ApCourse {
  key: string
  name: string
  category: string
  status: 'existing' | 'new' | 'pilot'
  launch_year: number | null
  learn_en: string
  learn_ko: string
  prereq: string | null
  exam_format: string | null
  exam_mode: string | null
  source_url: string
  scores: number[] | null // [5,4,3,2,1] %
}
interface ApPolicy { topic: string; effective: string; summary_en: string; summary_ko: string; source_url: string; source_date: string | null }

const data = apData as unknown as { scores_year: number; scores_source: string; verified_at: string; courses: ApCourse[]; policy: ApPolicy[] }

const CATEGORIES: { key: string; ko: string; en: string }[] = [
  { key: 'Math and Computer Science', ko: '수학·컴퓨터', en: 'Math & CS' },
  { key: 'Sciences', ko: '과학', en: 'Sciences' },
  { key: 'English', ko: '영어', en: 'English' },
  { key: 'History and Social Sciences', ko: '역사·사회', en: 'History & Social Sciences' },
  { key: 'World Languages and Cultures', ko: '외국어', en: 'World Languages' },
  { key: 'Arts', ko: '예술', en: 'Arts' },
  { key: 'AP Capstone', ko: '캡스톤', en: 'Capstone' },
  { key: 'AP Career Kickstart', ko: '직업 연계', en: 'Career Kickstart' },
]

const MODE: Record<string, { ko: string; en: string }> = {
  digital: { ko: '💻 완전 디지털', en: '💻 Fully digital' },
  hybrid: { ko: '💻✍️ 디지털 + 서술형 종이', en: '💻✍️ Digital + paper FRQ' },
  mixed: { ko: '💻📁 디지털 시험 + 과제 제출', en: '💻📁 Digital exam + submitted task' },
  portfolio: { ko: '📁 작품·과제 제출', en: '📁 Portfolio / task' },
  paper: { ko: '✍️ 종이 시험', en: '✍️ Paper' },
}

// 정책 항목 묶음 (주제 키워드 기준)
const POLICY_GROUPS: { ko: string; en: string; match: RegExp }[] = [
  { ko: '💻 디지털 시험 전환', en: '💻 Digital testing', match: /digital testing/i },
  { ko: '📝 시험·과정 개편', en: '📝 Exam & course changes', match: /english|psychology|physics|calculus|history|statistics|frameworks|world language|capstone|start times|frq|scoring/i },
  { ko: '🆕 신설·시범 과목', en: '🆕 New & pilot courses', match: /new course|pilot|discontinued/i },
  { ko: '💵 응시료·신청 마감·시험 일정', en: '💵 Fees, deadlines & dates', match: /fee|deadline|exam dates|outside the us/i },
  { ko: '📊 점수 발표·발송·상', en: '📊 Scores & awards', match: /score|scholar/i },
]

// 한글 검색어 → 과목 이름에 들어가는 영어 단어 (예: '물리' → Physics 4과목 전부)
const KO_SEARCH: [RegExp, RegExp][] = [
  [/물리/, /physics/i], [/미적|캘큘|calc/, /calculus/i], [/프리캘|precalc/, /precalculus/i], [/화학/, /chemistry/i], [/생물/, /biology/i],
  [/통계/, /statistics/i], [/심리/, /psychology/i], [/경제|macro|micro/, /economics/i], [/미국사/, /united states history/i],
  [/세계사/, /world history/i], [/유럽사/, /european history/i], [/역사/, /history/i], [/정치|정부/, /government/i], [/지리/, /geography/i],
  [/환경/, /environmental/i], [/컴퓨터|코딩|프로그래밍|cs/, /computer science|cybersecurity|networking/i], [/영어/, /english/i],
  [/스페인/, /spanish/i], [/중국/, /chinese/i], [/일본/, /japanese/i], [/프랑스/, /french/i], [/독일/, /german/i], [/라틴/, /latin/i],
  [/이탈리아/, /italian/i], [/미술|드로잉|디자인/, /art|drawing|design/i], [/음악/, /music/i], [/경영|금융|비즈니스/, /business/i],
  [/보안|사이버/, /cybersecurity/i], [/흑인|아프리카/, /african american/i], [/세미나/, /seminar/i], [/리서치|연구/, /research/i],
]

// 점수 순위 — 공식 점수 분포를 정렬만 함 (난이도 등급 아님)
type Metric = 'five' | 'fourFive' | 'threePlus' | 'one'
const METRICS: { key: Metric; ko: string; en: string; value: (s: number[]) => number }[] = [
  { key: 'five', ko: '5점 비율', en: '% scoring 5', value: (s) => s[0] },
  { key: 'fourFive', ko: '4·5점 비율', en: '% scoring 4–5', value: (s) => s[0] + s[1] },
  { key: 'threePlus', ko: '3점 이상 비율', en: '% scoring 3+', value: (s) => s[0] + s[1] + s[2] },
  { key: 'one', ko: '1점 비율', en: '% scoring 1', value: (s) => s[4] },
]

const SCORE_COLORS = ['#16a34a', '#65a30d', '#ca8a04', '#ea580c', '#dc2626'] // 5→1

function ScoreBar({ scores }: { scores: number[] }) {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label={t(`점수 분포: 5점 ${scores[0]}%, 4점 ${scores[1]}%, 3점 ${scores[2]}%, 2점 ${scores[3]}%, 1점 ${scores[4]}%`, `Score distribution: 5 ${scores[0]}%, 4 ${scores[1]}%, 3 ${scores[2]}%, 2 ${scores[3]}%, 1 ${scores[4]}%`)}>
        {scores.map((p, i) => (
          <div key={i} style={{ width: `${p}%`, background: SCORE_COLORS[i] }} />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-gray-500">
        {scores.map((p, i) => (
          <span key={i}><span className="mr-0.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: SCORE_COLORS[i] }} />{5 - i}{t('점', '')} {p}%</span>
        ))}
        <span className="font-semibold text-gray-700">{t(`3점 이상 ${scores[0] + scores[1] + scores[2]}%`, `3+ ${scores[0] + scores[1] + scores[2]}%`)}</span>
      </div>
    </div>
  )
}

export default function ApGuidePage() {
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'courses' | 'rank' | 'policy'>('courses')
  const [metric, setMetric] = useState<Metric>('five')
  const [noLang, setNoLang] = useState(false)

  useEffect(() => {
    document.title = t('AP 과목 가이드 — 새 AP·정책 변화·점수 분포 | 미국 대입 로드맵', 'AP course guide — new APs, policy changes, score distributions | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const courses = useMemo(() => {
    const qq = q.trim().toLowerCase().replace(/^ap\s*/, '')
    const order = (c: ApCourse) => { const i = CATEGORIES.findIndex((x) => x.key === c.category); return i < 0 ? 99 : i }
    return [...data.courses].sort((a, b) => order(a) - order(b)).filter((c) =>
      (cat === 'all' || (cat === 'new' ? c.status !== 'existing' : c.category === cat)) &&
      (!qq || c.name.toLowerCase().includes(qq) || c.learn_ko.includes(q.trim()) || KO_SEARCH.some(([ko, en]) => ko.test(qq) && en.test(c.name))),
    )
  }, [cat, q])
  const newCourses = data.courses.filter((c) => c.status !== 'existing')

  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-sm ${on ? 'bg-gray-900 font-semibold text-white' : 'border border-gray-200 bg-white text-gray-600'}`

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/guide/courses')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('AP 과목 가이드', 'AP course guide')}</h1>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {t(`AP ${data.courses.length - newCourses.filter((c) => c.status === 'pilot').length}개 과목의 배우는 내용·시험 형식·점수 분포와 최근 정책 변화를 College Board 공식 자료로 정리했어요.`, `What you learn, exam format and score distribution for every AP course, plus recent policy changes — all from official College Board sources.`)}
        </p>

        {/* 새 AP 한눈에 */}
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3.5">
          <p className="text-sm font-semibold text-gray-900">🆕 {t('최근 새로 생긴 AP', 'Recently added APs')}</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-gray-800">
            {newCourses.map((c) => (
              <li key={c.key}>
                <button onClick={() => { setTab('courses'); setCat('new'); setQ(''); window.setTimeout(() => document.getElementById(`ap-${c.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} className="text-left underline decoration-blue-300 underline-offset-2">
                  {c.name}
                </button>
                <span className="ml-1.5 text-xs text-gray-500">
                  {c.status === 'pilot'
                    ? t(`시범 운영 · ${c.launch_year ?? ''}-${String((c.launch_year ?? 0) + 1).slice(2)} 정식 개설 예정`, `pilot · full launch ${c.launch_year ?? ''}-${String((c.launch_year ?? 0) + 1).slice(2)}`)
                    : t(`${c.launch_year}-${String((c.launch_year ?? 0) + 1).slice(2)} 신설`, `new in ${c.launch_year}-${String((c.launch_year ?? 0) + 1).slice(2)}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 탭 */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button onClick={() => setTab('courses')} className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${tab === 'courses' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>{t('과목별 보기', 'Courses')}</button>
          <button onClick={() => setTab('rank')} className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${tab === 'rank' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>{t('점수 순위', 'Score ranks')}</button>
          <button onClick={() => setTab('policy')} className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${tab === 'policy' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>{t('정책 변화', 'Policy changes')}</button>
        </div>

        {tab === 'courses' ? (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('과목 검색 (예: Calculus, 물리)', 'Search (e.g. Calculus, Physics)')}
              className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCat('all')} className={chip(cat === 'all')}>{t('전체', 'All')}</button>
              <button onClick={() => setCat('new')} className={chip(cat === 'new')}>🆕 {t('신설·시범', 'New')}</button>
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setCat(c.key)} className={chip(cat === c.key)}>{t(c.ko, c.en)}</button>
              ))}
            </div>

            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              {t(
                `점수 분포는 ${data.scores_year}년 5월 시험, 전 세계 응시자 기준이에요. 응시자 구성이 과목마다 달라요 — 예를 들어 중국어·일본어는 모국어 화자가 많이 응시해 5점 비율이 높아요. 과목의 쉽고 어려움을 비교하는 자료가 아니에요.`,
                `Score distributions are for the May ${data.scores_year} exams, all students worldwide. Test-taker populations differ by subject — e.g. Chinese and Japanese have many native speakers, so 5s are more common. This is not a measure of how easy a course is.`,
              )}
            </p>

            <div className="mt-3 flex flex-col gap-2.5">
              {courses.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{t('검색 결과가 없어요', 'No results')}</p>}
              {courses.map((c) => (
                <div key={c.key} id={`ap-${c.key}`} className="scroll-mt-20 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    {c.status === 'new' && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">NEW {c.launch_year}</span>}
                    {c.status === 'pilot' && <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-bold text-white">{t('시범 운영', 'PILOT')}</span>}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700">{t(c.learn_ko, c.learn_en)}</p>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
                    <p><span className="font-medium text-gray-500">{t('권장 선수 과목 (공식 원문)', 'Prerequisites')}:</span> {!c.prereq ? t('공식 안내 없음', 'Not published') : /^none\.?$/i.test(c.prereq.trim()) ? t('없음', 'None') : c.prereq}</p>
                    {c.exam_format && <p><span className="font-medium text-gray-500">{t('시험 구성 (공식 원문)', 'Exam')}:</span> {c.exam_format}</p>}
                    {c.exam_mode && MODE[c.exam_mode] && <p><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{t(MODE[c.exam_mode].ko, MODE[c.exam_mode].en)}</span></p>}
                  </div>
                  <div className="mt-2.5">
                    {c.scores ? (
                      <ScoreBar scores={c.scores} />
                    ) : (
                      <p className="text-[11px] text-gray-400">{t('아직 시험 결과가 없어요 (첫 시험 전)', 'No exam results yet (before first exam)')}</p>
                    )}
                  </div>
                  <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-blue-600 underline">{t('College Board 공식 페이지 ↗', 'Official College Board page ↗')}</a>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">
              {t('점수 분포 출처', 'Score source')}: <a href={data.scores_source} target="_blank" rel="noreferrer" className="underline">College Board — AP Score Distributions ↗</a> · {t(`${data.verified_at} 확인, 매년 바뀌어요`, `checked ${data.verified_at}, changes yearly`)}
            </p>
          </>
        ) : tab === 'rank' ? (
          (() => {
            const m = METRICS.find((x) => x.key === metric)!
            const rows = data.courses
              .filter((c) => c.scores && (!noLang || c.category !== 'World Languages and Cultures'))
              .map((c) => ({ c, v: m.value(c.scores!) }))
              .sort((a, b) => b.v - a.v || a.c.name.localeCompare(b.c.name))
            const max = Math.max(...rows.map((r) => r.v), 1)
            return (
              <>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                  {METRICS.map((x) => (
                    <button key={x.key} onClick={() => setMetric(x.key)} className={chip(metric === x.key)}>{t(x.ko, x.en)} {t('높은 순', '↓')}</button>
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={noLang} onChange={(e) => setNoLang(e.target.checked)} className="h-4 w-4" />
                  {t('외국어 과목 빼고 보기 (모국어 화자 응시 영향)', 'Hide world languages (native-speaker effect)')}
                </label>
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                  {t(
                    `${data.scores_year}년 5월 시험, 전 세계 응시자의 공식 점수 비율을 정렬한 거예요. 과목 난이도 등급이 아니에요 — 어떤 학생들이 응시하는지(선수 과목·학교·모국어 등)에 따라 비율이 크게 달라져요. 과목 선택은 전공·흥미·학교 개설 과목을 기준으로 하세요.`,
                    `Official May ${data.scores_year} score percentages (all students worldwide), sorted. This is not a difficulty rating — rates depend heavily on who takes each exam (prerequisites, schools, native speakers). Choose courses by your major, interests and what your school offers.`,
                  )}
                </p>
                <ol className="mt-3 flex flex-col gap-1.5">
                  {rows.map(({ c, v }, i) => (
                    <li key={c.key}>
                      <button
                        onClick={() => { setTab('courses'); setCat('all'); setQ(''); window.setTimeout(() => document.getElementById(`ap-${c.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
                        className="flex w-full items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-left ring-1 ring-gray-200 active:bg-gray-50"
                      >
                        <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-400">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-gray-900">{c.name.replace(/^AP /, '')}</span>
                          <span className="mt-1 block h-1.5 rounded-full bg-gray-100">
                            <span className="block h-1.5 rounded-full" style={{ width: `${(v / max) * 100}%`, background: metric === 'one' ? SCORE_COLORS[4] : SCORE_COLORS[metric === 'five' ? 0 : metric === 'fourFive' ? 1 : 2] }} />
                          </span>
                        </span>
                        <span className="w-11 shrink-0 text-right text-sm font-semibold text-gray-800">{v}%</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] text-gray-400">
                  {t('출처', 'Source')}: <a href={data.scores_source} target="_blank" rel="noreferrer" className="underline">College Board — AP Score Distributions ↗</a> · {t(`${data.verified_at} 확인`, `checked ${data.verified_at}`)}
                </p>
              </>
            )
          })()
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {POLICY_GROUPS.map((g, gi) => {
              const used = new Set(POLICY_GROUPS.slice(0, gi).flatMap((pg) => data.policy.filter((p) => pg.match.test(p.topic)).map((p) => p.topic)))
              const items = data.policy.filter((p) => g.match.test(p.topic) && !used.has(p.topic))
              if (items.length === 0) return null
              return (
                <div key={g.en}>
                  <h2 className="font-semibold text-gray-900">{t(g.ko, g.en)}</h2>
                  <div className="mt-2 flex flex-col gap-2">
                    {items.map((p) => (
                      <div key={p.topic} className="rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200">
                        <p className="text-[11px] font-semibold text-blue-700">{p.effective}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-gray-800">{t(p.summary_ko, p.summary_en)}</p>
                        <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="text-[11px] text-gray-400">{t(`${data.verified_at} 기준 College Board 공식 자료예요. 응시료·마감·일정은 해마다 바뀌니 신청 전 학교 AP 코디네이터와 공식 페이지에서 꼭 확인하세요.`, `Official College Board information as of ${data.verified_at}. Fees, deadlines and dates change every year — confirm with your school’s AP coordinator and the official pages before registering.`)}</p>
          </div>
        )}

        <button onClick={() => navigate('/guide/courses')} className="mt-6 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">
          {t('학년별 수업 난이도 가이드 보기 →', 'See the course rigor guide by grade →')}
        </button>
      </div>
    </div>
  )
}
