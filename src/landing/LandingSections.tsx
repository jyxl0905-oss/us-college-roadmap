import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Plus, Eye } from 'lucide-react'
import { t, localizeRows } from '../i18n'
import { navigate } from '../lib/router'
import { supabase } from '../lib/supabase'
import { currentSeason } from '../lib/academics'
import type { ChecklistItem, Season } from '../lib/types'
import { aoLines } from '../report/AoBox'
import schoolsIndex from '../data/schools.index.json'
import costData from '../data/cost.json'
import apData from '../data/ap.json'

// 첫 화면 추가 섹션 (2026-09) — 기존 랜딩은 그대로 두고 사이에 끼워 넣는 고급형 섹션들.
// 원칙: 숫자는 전부 사이트 데이터에서 계산, 합격 확률·보장 표현 금지, 가짜 후기·사용자 수 금지.

const SEASON_KO: Record<Season, [string, string]> = { fall: ['가을', 'fall'], spring: ['봄', 'spring'], summer: ['여름', 'summer'] }

// 섹션 머리 — 번호 + 자간 넓은 작은 제목
export function Eyebrow({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
      <span className="text-blue-600">{n}</span>
      <span className="h-px w-6 bg-gray-300" />
      {children}
    </p>
  )
}

// 01 — 내 학년 눌러보기: AO가 보는 것 + 이번 시즌 체크리스트 맛보기 (1개만 보이고 나머지는 흐림)
export function GradePeek({ onStart }: { onStart: () => void }) {
  const [grade, setGrade] = useState(11)
  const [items, setItems] = useState<ChecklistItem[] | null>(null)
  const season = currentSeason()

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.from('checklist_items').select('*').eq('season', season).then(({ data }) => {
      if (alive && data) setItems(localizeRows(data as ChecklistItem[]))
    })
    return () => { alive = false }
  }, [season])

  // 전공·티어·카운슬러 조건이 없는 공통 항목만 (국제학생 기준)
  const list = (items ?? [])
    .filter((i) => i.grade === grade && i.major_category === null && i.tier_condition === null && !i.no_counselor_only)
    .sort((a, b) => a.sort_order - b.sort_order)
  const [sKo, sEn] = SEASON_KO[season]

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-9">
      <div className="md:grid md:grid-cols-[0.85fr_1.15fr] md:gap-12">
        <div>
          <Eyebrow n="01">{t('내 학년이라면', 'Your grade')}</Eyebrow>
          <h2 className="mt-4 text-[26px] font-bold leading-[1.25] tracking-[-0.035em] text-gray-900 md:text-[34px]">
            {t('지금 학년에', 'What admissions')}
            <br />
            <span className="font-light text-gray-400">{t('AO가 보는 것', 'officers look at now')}</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">{t('학년을 눌러 보세요. 입학사정관(AO)이 이 시기에 무엇을 보는지와 이번 시즌 할 일을 바로 보여드려요.', 'Pick a grade to see what admissions officers focus on at that stage — and what to do this season.')}</p>
          <div role="tablist" aria-label={t('학년 선택', 'Choose grade')} className="mt-6 grid w-full grid-cols-4 rounded-full border border-gray-200 bg-gray-50 p-1 md:inline-grid md:w-auto">
            {[9, 10, 11, 12].map((g) => (
              <button
                key={g}
                role="tab"
                aria-selected={grade === g}
                onClick={() => setGrade(g)}
                className={`whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold transition-colors md:px-4 ${grade === g ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {t(`${g}학년`, `Grade ${g}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 md:mt-0">
          <div className="rounded-2xl bg-blue-600 px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200">{t(`AO가 지금 보는 것 · ${grade}학년`, `What AOs look at · grade ${grade}`)}</p>
            <div className="mt-2.5 space-y-2">
              {aoLines(grade).map((line) => <p key={line} className="text-[14px] leading-relaxed">{line}</p>)}
            </div>
          </div>

          {list.length > 0 && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
                <p className="text-xs font-semibold text-gray-500">{t(`이번 시즌 체크리스트 · ${grade}학년 ${sKo}`, `This season’s checklist · grade ${grade}, ${sEn}`)}</p>
                <p className="text-xs text-gray-400">{t(`공통 항목 ${list.length}개`, `${list.length} core items`)}</p>
              </div>
              <ul className="mt-1">
                {list.slice(0, 3).map((it, i) => (
                  <li key={it.id} aria-hidden={i > 0} className={`flex items-start gap-3 border-b border-gray-50 py-2.5 text-sm text-gray-800 ${i > 0 ? 'select-none blur-[4px]' : ''}`}>
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
                    {it.title}
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                {t('내 전공·목표 학교 기준으로 전부 보기', 'See all, tailored to your major and targets')} <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// 02 — 알고 계셨나요: 사이트 데이터에서 계산한 사실 4개
const schools = schoolsIndex as { need_blind_intl?: boolean }[]
const totals = (costData as { schools: { total: number | null }[] }).schools.map((s) => s.total).filter((n): n is number => n != null)
const costMin = Math.min(...totals)
const costMax = Math.max(...totals)
const needBlind = schools.filter((s) => s.need_blind_intl).length
const apTop = (apData as { scores_year: number; courses: { name: string; category: string; scores?: number[] }[] }).courses
  .filter((c) => Array.isArray(c.scores) && c.category !== 'World Languages and Cultures')
  .sort((a, b) => b.scores![0] - a.scores![0])[0]
const scoresYear = (apData as { scores_year: number }).scores_year
const k = (n: number) => `$${Math.round(n / 1000)}K`

export function Facts() {
  const facts: { big: ReactNode; cap: string; src: string; to: string }[] = [
    { big: t('불가', 'Ineligible'), cap: t('국제학생(F-1)의 연방 학자금 — Pell Grant·연방 근로장학·연방 대출', 'Federal student aid for F-1 international students — Pell, Work-Study, federal loans'), src: 'U.S. Dept. of Education', to: '/guide/cost?tab=aid' },
    { big: `${(costMax / costMin).toFixed(1)}×`, cap: t(`국제학생 1년 비용, 가장 낮은 곳 ${k(costMin)}와 가장 높은 곳 ${k(costMax)}의 차이`, `Gap in yearly cost for international students: ${k(costMin)} vs ${k(costMax)}`), src: t(`${totals.length}개교 공식 COA`, `Official COA, ${totals.length} schools`), to: '/guide/cost' },
    { big: <>{needBlind}<span className="text-[0.45em] font-normal text-gray-400">/{schools.length}</span></>, cap: t('국제학생 재정지원 신청을 합격 심사에 반영하지 않는(need-blind) 학교', 'Schools that are need-blind for international applicants'), src: t('각 대학 공식 발표', 'Each college’s official policy'), to: '/schools' },
    ...(apTop ? [{ big: `${apTop.scores![0]}%`, cap: t(`${apTop.name} 응시자 중 5점 비율 — 외국어 제외 1위`, `Share of ${apTop.name} takers scoring a 5 — highest outside world languages`), src: `College Board ${scoresYear}`, to: '/guide/ap' }] : []),
  ]
  return (
    <section>
      <Eyebrow n="02">{t('알고 계셨나요', 'Did you know')}</Eyebrow>
      <div className="mt-5 grid grid-cols-2 border-t border-gray-200 md:grid-cols-4">
        {facts.map((f, i) => (
          <button
            key={i}
            onClick={() => navigate(f.to)}
            className={`group flex flex-col items-start px-1 pb-2 pt-5 text-left md:px-6 ${i % 2 === 1 ? 'border-l border-gray-100 pl-4' : ''} ${i >= 2 ? 'border-t border-gray-100 md:border-t-0' : ''} ${i >= 1 ? 'md:border-l md:border-gray-100' : ''} md:first:pl-0`}
          >
            <span className="text-[38px] font-light leading-none tracking-[-0.04em] text-gray-900 md:text-[46px]">{f.big}</span>
            <span className="mt-3 text-[13px] leading-snug text-gray-600">{f.cap}</span>
            <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] tracking-wide text-gray-400 group-hover:text-blue-600">{f.src}<ArrowUpRight size={11} /></span>
          </button>
        ))}
      </div>
    </section>
  )
}

// 03 — 이런 고민이라면 / 04 — 자주 묻는 질문
export function PainAndFaq() {
  const pains: [string, string, () => void][] = [
    [t('"9학년 때 뭐 했더라?"', '"What did I even do in 9th grade?"'), t('내 원서에 지금부터 기록', 'Log it in My App from today'), () => document.getElementById('feature-app')?.scrollIntoView({ behavior: 'smooth', block: 'center' })],
    [t('"내 SAT, 목표 학교에선 어느 정도?"', '"How does my SAT compare at my target schools?"'), t('합격자 중간 50% 범위 위 내 위치', 'Your spot on the admitted middle-50% range'), () => navigate('/demo')],
    [t('"AP는 뭘 들어야 하지?"', '"Which APs should I take?"'), t('전공별 추천 AP · 점수 분포', 'APs by major · score distributions'), () => navigate('/guide/ap')],
    [t('"국제학생이면 1년에 얼마 들지?"', '"What does a year cost as an international student?"'), t(`${totals.length}개교 비용·재정지원 비교`, `Costs and aid across ${totals.length} schools`), () => navigate('/guide/cost')],
    [t('"ED·EA 마감이 언제였지?"', '"When are the ED and EA deadlines?"'), t('학교별 지원 시기·마감 캘린더', 'Deadlines by school and calendar'), () => navigate('/schools')],
  ]
  const faqs: [string, string][] = [
    [t('정말 전부 무료예요?', 'Is it really all free?'), t('네. 모든 기능이 무료이고, 광고도 유료 전환도 없어요.', 'Yes. Every feature is free, with no ads and no paid tier.')],
    [t('합격 가능성도 알려주나요?', 'Does it predict my chances?'), t('아니요. 합격 확률은 계산하지 않아요. 대신 목표 학교 합격자의 중간 50% 범위 안에서 내 점수가 어디쯤인지와, 학교가 공식적으로 중요하게 보는 것을 보여줘요.', 'No. We never calculate admission odds. Instead we show where your scores sit within each school’s admitted middle-50% range and what the school officially says it values.')],
    [t('데이터는 어디서 오나요?', 'Where does the data come from?'), t('Common Data Set, College Board, 미 교육부, 각 대학 입학처·재정지원처의 공식 자료만 써요. 항목마다 출처 링크가 있고, 확인되지 않은 값은 "미공개"로 둬요.', 'Only official sources — Common Data Sets, the College Board, the U.S. Department of Education and each college’s admissions and aid pages. Every figure links to its source; anything unverified is marked “not published”.')],
    [t('시작하려면 뭘 하면 되나요?', 'How do I start?'), t('Google로 시작한 뒤 학년·전공·목표 학교 같은 질문에 답하면 바로 내 리포트와 이번 시즌 체크리스트가 나와요. 로그인 없이 예시 리포트부터 볼 수도 있어요.', 'Start with Google, answer a few questions about your grade, major and target schools, and you get your report and this season’s checklist right away. You can also browse a sample report without logging in.')],
  ]
  return (
    <section className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-14">
      <div>
        <Eyebrow n="03">{t('이런 고민이라면', 'If this sounds familiar')}</Eyebrow>
        <div className="mt-5 border-t border-gray-200">
          {pains.map(([q, a, go]) => (
            <button key={q} onClick={go} className="group flex w-full items-center justify-between gap-4 border-b border-gray-100 py-4 text-left">
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-gray-900">{q}</span>
                <span className="mt-0.5 block text-[13px] text-gray-500 group-hover:text-blue-600">{a}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Eyebrow n="04">{t('자주 묻는 질문', 'FAQ')}</Eyebrow>
        <div className="mt-5 border-t border-gray-200">
          {faqs.map(([q, a]) => (
            <details key={q} className="group border-b border-gray-100">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                {q}
                <Plus size={16} className="shrink-0 text-gray-400 transition-transform group-open:rotate-45" />
              </summary>
              <p className="-mt-1 pb-4 pr-8 text-sm leading-relaxed text-gray-500">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// 스크롤하면 따라오는 시작 버튼 — 폰: 하단 바 / 컴퓨터: 오른쪽 아래 알약 버튼. 첫 화면 버튼이 보일 땐 숨김
export function StickyCta({ anchorId, endId, onStart, googleIcon }: { anchorId: string; endId: string; onStart: () => void; googleIcon: ReactNode }) {
  const [pastHero, setPastHero] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  useEffect(() => {
    const hero = document.getElementById(anchorId)
    const end = document.getElementById(endId)
    if (!hero || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0)
        else setAtEnd(e.isIntersecting)
      }
    })
    io.observe(hero)
    if (end) io.observe(end)
    return () => io.disconnect()
  }, [anchorId, endId])
  const show = pastHero && !atEnd

  return (
    <div aria-hidden={!show} className={`no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className={`${show ? 'pointer-events-auto' : ''} border-t border-gray-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden`}>
        <div className="mx-auto flex max-w-md gap-2">
          <button tabIndex={show ? 0 : -1} onClick={onStart} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white active:bg-gray-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">{googleIcon}</span>
            {t('Google로 무료 시작', 'Start free with Google')}
          </button>
          <button tabIndex={show ? 0 : -1} onClick={() => navigate('/demo')} aria-label={t('예시 보기', 'See a sample')} className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 text-gray-700 active:bg-gray-50">
            <Eye size={18} strokeWidth={1.9} />
          </button>
        </div>
      </div>
      <div className="pointer-events-none hidden justify-end px-8 pb-8 md:flex">
        <button tabIndex={show ? 0 : -1} onClick={onStart} className={`${show ? 'pointer-events-auto' : ''} flex items-center gap-2.5 rounded-full bg-gray-900 py-2.5 pl-2.5 pr-5 text-sm font-bold text-white shadow-[0_12px_32px_-8px_rgba(11,22,51,0.45)] hover:bg-gray-800`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">{googleIcon}</span>
          {t('Google로 무료 시작', 'Start free with Google')}
        </button>
      </div>
    </div>
  )
}

// 03. 왜 무료인가 — /about 요약 (수치: IECA 2022·CNBC 2024, 서비스 소개 페이지와 동일)
export function WhyFree() {
  return (
    <section>
      <button onClick={() => navigate('/about')} className="group block w-full overflow-hidden rounded-3xl bg-gray-900 px-6 py-8 text-left text-white md:px-10 md:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">{t('왜 무료인가요', 'Why it’s free')}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 md:max-w-2xl">
          {[
            ['$6,304', t('컨설팅 평균 패키지', 'Avg. consulting package'), 'text-white'],
            ['$120,000', t('비싸면 1년에', 'Top firms, per year'), 'text-white'],
            [t('0원', '$0'), t('이 서비스', 'This service'), 'text-emerald-300'],
          ].map(([n, l, c]) => (
            <div key={l}>
              <p className={`text-[18px] font-extrabold tabular-nums tracking-tight sm:text-[24px] md:text-[34px] ${c}`}>{n}</p>
              <p className="text-[11px] text-gray-400 md:text-xs">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-[15px]">
          {t('좋은 입시 정보가 가정 형편에 따라 갈리지 않도록 — 컨설팅을 받기 어려운 학생도 같은 공식 자료로 준비할 수 있게 모든 기능을 무료로 만들었어요.', 'So good admissions information doesn’t depend on what a family can pay — every feature is free, so students who can’t afford consulting prepare with the same official information.')}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-200 group-hover:underline">{t('서비스 소개 자세히 보기', 'Read more about us')} <ArrowRight size={15} /></span>
        <p className="mt-3 text-[10.5px] text-gray-500">{t('IECA 2022 회원 평균 · CNBC 2024 (뉴욕 Command Education)', 'IECA 2022 member average · CNBC 2024 (Command Education, NYC)')}</p>
      </button>
    </section>
  )
}
