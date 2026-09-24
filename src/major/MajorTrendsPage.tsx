import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Users, Briefcase, Sparkles, ExternalLink, Pin } from 'lucide-react'
import { t } from '../i18n'
import { goBack, navigate } from '../lib/router'
import VerifiedBadge from '../ui/VerifiedBadge'
import data from '../data/majorTrends.json'

// 전공 트렌드 — 미 교육부 통계청(NCES) 학위 수여 추이 + 뉴욕 연준 최근 졸업생 전공별 취업 지표 (공식 데이터만, 2026-09-24 확인)
interface Field { en: string; ko: string; latest: number; base: number; pct: number; keys: string[] }
interface Outcome { en: string; ko: string; unemployment: number; underemployment: number; wage_early: number; wage_mid: number; keys: string[] }
const D = data as unknown as {
  verified_at: string
  nces: { url: string; table: string; latest_year: string; base_year: string; total_latest: number; total_base: number; fields: Field[]; detail: (Field & { url: string })[]; detail_years: [string, string] }
  nyfed: { url: string; released: string; vintage: string; overall: { unemployment: number; underemployment: number; wage_early: number; wage_mid: number }; majors: Outcome[] }
}
const N = D.nces
const Y = D.nyfed
const MIN_BASE = 5000 // 작은 분야는 % 변화가 과장돼 순위에서 제외
const popular = [...N.fields].sort((a, b) => b.latest - a.latest).slice(0, 10)
const ranked = N.fields.filter((f) => f.base >= MIN_BASE)
const rising = [...ranked].sort((a, b) => b.pct - a.pct).slice(0, 6)
const falling = [...ranked].sort((a, b) => a.pct - b.pct).slice(0, 6)
// 눈여겨볼 전공: 초봉 $65K 이상 + 실업률이 전체 평균보다 낮고 + 학위 수 상위 5개 분야(경영·보건·사회과학·생명과학·심리)에 속하지 않는 전공
const POPULAR_FAMILY = /business|management|marketing|finance|accounting|nursing|health|pharmacy|psychology|biology|economics|political|sociology|history|computer|mechanical|electrical/i
const gems = Y.majors
  .filter((m) => m.wage_early >= 65000 && m.unemployment < Y.overall.unemployment && !POPULAR_FAMILY.test(m.en))
  .sort((a, b) => b.wage_early - a.wage_early)

const k$ = (n: number) => `$${Math.round(n / 1000)}K`
const fmt = (n: number) => n.toLocaleString('en-US')
type Tab = 'popular' | 'trend' | 'jobs' | 'gems'
type Sort = 'wage' | 'unemp' | 'under'

function MajorLink({ keys }: { keys: string[] }) {
  if (!keys.length) return null
  return <button onClick={() => navigate(`/major/${keys[0]}`)} className="shrink-0 text-[11px] font-medium text-blue-600 underline">{t('전공 가이드', 'Guide')}</button>
}

export default function MajorTrendsPage() {
  const [tab, setTab] = useState<Tab>('popular')
  const [sort, setSort] = useState<Sort>('wage')
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    document.title = t('미국 대학 전공 트렌드 — 인기 전공·뜨는 전공·취업 잘되는 전공 (공식 통계) | 미국 대입 로드맵', 'US college major trends — popular, rising and high-outcome majors (official data) | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const jobs = useMemo(() => [...Y.majors].sort((a, b) => sort === 'wage' ? b.wage_early - a.wage_early : sort === 'unemp' ? a.unemployment - b.unemployment : a.underemployment - b.underemployment), [sort])
  const maxLatest = popular[0].latest

  const tabBtn = (k: Tab, icon: typeof Users, ko: string, en: string) => {
    const Icon = icon
    return <button onClick={() => setTab(k)} className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-1 py-2 text-[12px] font-semibold ${tab === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}><Icon size={16} strokeWidth={2} />{t(ko, en)}</button>
  }
  const pct = (p: number) => <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums ${p >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{p >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{p > 0 ? '+' : ''}{p}%</span>

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/majors')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('전공 트렌드', 'Major trends')}</h1>
        </div>
        <VerifiedBadge className="mt-3" date={D.verified_at} sources={t('미 교육부 통계청(NCES) · 뉴욕 연방준비은행', 'NCES · Federal Reserve Bank of New York')} />
        <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-900">
          {t('미국 전체 대학의 공식 통계예요. 인기·연봉이 높다고 나에게 맞는 전공은 아니에요 — 흥미와 적성이 먼저고, 이 숫자는 참고용이에요.', 'Official nationwide statistics. Popular or high-paying doesn’t mean right for you — interest and fit come first; use these numbers as context.')}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {tabBtn('popular', Users, '인기 전공', 'Popular')}
          {tabBtn('trend', TrendingUp, '뜨는·지는', 'Rising/falling')}
          {tabBtn('jobs', Briefcase, '취업 지표', 'Outcomes')}
          {tabBtn('gems', Sparkles, '눈여겨볼', 'Hidden gems')}
        </div>

        {tab === 'popular' && (
          <section className="mt-4">
            <p className="text-sm font-semibold text-gray-900">{t(`가장 많이 택하는 전공 분야 — ${N.latest_year} 학사 학위 수`, `Most-chosen fields — bachelor’s degrees, ${N.latest_year}`)}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{t(`전체 ${fmt(N.total_latest)}명 중`, `of ${fmt(N.total_latest)} total`)}</p>
            <ol className="mt-2 flex flex-col gap-1.5">
              {popular.map((f, i) => (
                <li key={f.en} className="rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-gray-200">
                  <div className="flex items-baseline gap-2">
                    <span className="w-5 shrink-0 text-xs font-bold text-gray-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{t(f.ko, f.en)}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{fmt(f.latest)}</span>
                  </div>
                  <div className="ml-7 mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${(f.latest / maxLatest) * 100}%` }} /></span>
                    <span className="shrink-0 text-[11px] text-gray-400">{t(`${N.base_year} 대비`, `vs ${N.base_year}`)}</span> {pct(f.pct)}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === 'trend' && (
          <section className="mt-4 grid gap-4 md:grid-cols-2">
            {[[rising, t('빠르게 느는 분야', 'Fastest-growing'), 'text-emerald-700'] as const, [falling, t('줄어드는 분야', 'Shrinking'), 'text-rose-700'] as const].map(([list, title, cls]) => (
              <div key={title}>
                <p className={`text-sm font-bold ${cls}`}>{title}</p>
                <p className="text-[11px] text-gray-500">{t(`학사 학위 수, ${N.base_year} → ${N.latest_year}`, `Bachelor’s degrees, ${N.base_year} → ${N.latest_year}`)}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {list.map((f) => (
                    <li key={f.en} className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-gray-200">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{t(f.ko, f.en)}</span>
                        <span className="text-[11px] tabular-nums text-gray-400">{fmt(f.base)} → {fmt(f.latest)}</span>
                      </span>
                      {pct(f.pct)}
                      <MajorLink keys={f.keys} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="md:col-span-2">
              <button onClick={() => setShowDetail((v) => !v)} className="text-xs font-semibold text-gray-600 underline">{showDetail ? t('세부 전공 접기', 'Hide detailed fields') : t(`세부 전공 보기 (${D.nces.detail_years[0]} → ${D.nces.detail_years[1]})`, `Detailed fields (${D.nces.detail_years[0]} → ${D.nces.detail_years[1]})`)}</button>
              {showDetail && (
                <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
                  {[...N.detail].sort((a, b) => b.pct - a.pct).map((f) => (
                    <li key={f.en} className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 ring-1 ring-gray-200">
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{t(f.ko, f.en)} <span className="text-[11px] tabular-nums text-gray-400">{fmt(f.base)} → {fmt(f.latest)}</span></span>
                      {pct(f.pct)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] text-gray-400">{t(`2012-13년 학위가 ${fmt(MIN_BASE)}명 미만인 작은 분야는 변화율이 과장돼 순위에서 뺐어요.`, `Fields under ${fmt(MIN_BASE)} degrees in 2012-13 are excluded (small bases exaggerate % change).`)}</p>
            </div>
          </section>
        )}

        {tab === 'jobs' && (
          <section className="mt-4">
            <p className="text-sm font-semibold text-gray-900">{t('최근 졸업생(22–27세) 전공별 취업 지표', 'Recent graduates (ages 22–27) by major')}</p>
            <div className="mt-2 rounded-xl bg-blue-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-blue-900">
              {t(`전체 평균: 실업률 ${Y.overall.unemployment}%, 불완전 취업 ${Y.overall.underemployment}%, 초봉 ${k$(Y.overall.wage_early)}, 중견(35–45세) ${k$(Y.overall.wage_mid)}. 초봉이 높은 컴퓨터과학·컴퓨터공학은 실업률도 높은 편이라, 한 가지 숫자만 보면 안 돼요.`, `Overall: unemployment ${Y.overall.unemployment}%, underemployment ${Y.overall.underemployment}%, early-career pay ${k$(Y.overall.wage_early)}, mid-career ${k$(Y.overall.wage_mid)}. Computer science and computer engineering pay the most early on but also have higher unemployment — don’t judge by one number.`)}
            </div>
            <div className="mt-3 flex gap-1.5">
              {([['wage', '초봉 높은 순', 'Highest pay'], ['unemp', '실업률 낮은 순', 'Lowest unemployment'], ['under', '불완전 취업 낮은 순', 'Lowest underemployment']] as const).map(([k, ko, en]) => (
                <button key={k} onClick={() => setSort(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${sort === k ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{t(ko, en)}</button>
              ))}
            </div>
            <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-gray-200">
              <div className="grid grid-cols-[1fr_52px_52px_58px] gap-1 bg-gray-100 px-3 py-2 text-[10.5px] font-semibold text-gray-500">
                <span>{t('전공', 'Major')}</span><span className="text-right">{t('초봉', 'Pay')}</span><span className="text-right">{t('실업', 'Unemp.')}</span><span className="text-right">{t('불완전', 'Under.')}</span>
              </div>
              {jobs.map((m, i) => (
                <div key={m.en} className={`grid grid-cols-[1fr_52px_52px_58px] items-center gap-1 px-3 py-2 text-[13px] ${i % 2 ? 'bg-gray-50/60' : 'bg-white'}`}>
                  <span className="min-w-0 truncate text-gray-900">{m.keys.length ? <button onClick={() => navigate(`/major/${m.keys[0]}`)} className="truncate text-left underline decoration-gray-300 underline-offset-2">{t(m.ko, m.en)}</button> : t(m.ko, m.en)}</span>
                  <span className={`text-right font-semibold tabular-nums ${m.wage_early > Y.overall.wage_early ? 'text-emerald-700' : 'text-gray-700'}`}>{k$(m.wage_early)}</span>
                  <span className={`text-right tabular-nums ${m.unemployment < Y.overall.unemployment ? 'text-emerald-700' : 'text-rose-700'}`}>{m.unemployment}%</span>
                  <span className={`text-right tabular-nums ${m.underemployment < Y.overall.underemployment ? 'text-emerald-700' : 'text-rose-700'}`}>{m.underemployment}%</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{t('초록 = 전체 평균보다 좋음, 빨강 = 평균보다 나쁨. 불완전 취업 = 학사 학위가 필요 없는 일을 하는 비율. 초봉은 학사만 가진 풀타임 근로자 중앙값이에요.', 'Green = better than overall, red = worse. Underemployment = working in jobs that don’t require a degree. Pay = median for full-time workers with only a bachelor’s.')}</p>
          </section>
        )}

        {tab === 'gems' && (
          <section className="mt-4">
            <p className="text-sm font-semibold text-gray-900">{t('덜 알려졌지만 지표가 좋은 전공', 'Less-talked-about majors with strong outcomes')}</p>
            <p className="mt-1 rounded-xl bg-white px-3.5 py-2.5 text-[12px] leading-relaxed text-gray-600 ring-1 ring-gray-200">
              <span className="font-semibold text-gray-900">{t('기준: ', 'Criteria: ')}</span>
              {t(`초봉 $65K 이상 + 실업률이 전체 평균(${Y.overall.unemployment}%)보다 낮고 + 가장 많이 택하는 분야(경영·보건·심리·생명과학·사회과학·컴퓨터)과 공대 인기 전공(기계·전기)을 뺀 전공이에요.`, `Early-career pay $65K+, unemployment below the overall ${Y.overall.unemployment}%, and outside the most-chosen fields (business, health, psychology, biology, social sciences, computing) and the most popular engineering fields (mechanical, electrical).`)}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {gems.map((m) => (
                <li key={m.en} className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-3 ring-1 ring-gray-200">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">{t(m.ko, m.en)}</span>
                    <span className="text-[11px] text-gray-500">{t(`초봉 ${k$(m.wage_early)} · 실업률 ${m.unemployment}% · 불완전 취업 ${m.underemployment}%`, `Pay ${k$(m.wage_early)} · unemployment ${m.unemployment}% · underemployment ${m.underemployment}%`)}</span>
                  </span>
                  <MajorLink keys={m.keys} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-gray-400">{t('공학 안에서도 기계·전기·컴퓨터보다 덜 주목받는 항공우주·토목·건설 분야가 이 기준에 들어와요. 데이터에 없는 세부 전공(예: 보험계리, 원자력공학)은 각 전공 가이드의 직업 전망(BLS)을 참고하세요.', 'Within engineering, fields less spotlighted than mechanical, electrical or computer — aerospace, civil, construction — show up here. For majors not in this dataset (e.g., actuarial science, nuclear engineering), see each major guide’s BLS outlook.')}</p>
          </section>
        )}

        <div className="mt-6 flex flex-col gap-1 text-[11px] text-gray-400">
          <p><Pin size={11} className="mr-1 inline -mt-0.5" />{t('출처', 'Sources')}:</p>
          <a href={N.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">{t(`미 교육부 통계청(NCES) Digest ${N.table} — 학사 학위 수 (${N.latest_year}은 잠정치)`, `NCES Digest ${N.table} — bachelor’s degrees (${N.latest_year} provisional)`)}<ExternalLink size={10} /></a>
          <a href={Y.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">{t('뉴욕 연방준비은행 — The Labor Market for Recent College Graduates (2026년 2월 공개, 2024년 미국 지역사회조사 기준)', 'Federal Reserve Bank of New York — The Labor Market for Recent College Graduates (Feb 2026, 2024 ACS)')}<ExternalLink size={10} /></a>
        </div>
      </div>
    </div>
  )
}
