import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { t } from '../i18n'
import { goBack, navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import schoolsIndex from '../data/schools.index.json'
import data from '../data/english.json'
import SchoolLogo from '../browse/SchoolLogo'
import { PROCESS, usHsLine, type EnglishReq } from '../browse/EnglishBlock'
import VerifiedBadge from '../ui/VerifiedBadge'

// 영어 시험 기준 비교 + 자주 듣는 말 팩트 체크 — 각 대학 공식 입학처 페이지 기준 (2026-09-24 확인, 사용자 승인)
// 공식 페이지를 직접 확인 못 해 비워 둔 학교(Williams·UVA·UChicago)는 통계·목록에서 뺌
const rows = (data as { verified_at: string; schools: (EnglishReq & { name: string })[] }).schools.filter((r) => r.requirement || r.toefl_min || r.waiver_process !== 'unclear' || r.waiver_conditions_ko)
const nameOf = new Map((schoolsIndex as { id: number; name: string; name_ko: string | null; usnews_rank: number | null }[]).map((s) => [s.id, s]))
const count = (k: EnglishReq['waiver_process']) => rows.filter((r) => r.waiver_process === k).length
const scoreSchools = rows.filter((r) => r.sat_ebrw_waiver)
const satMin = Math.min(...scoreSchools.map((r) => r.sat_ebrw_waiver!))
const satMax = Math.max(...scoreSchools.map((r) => r.sat_ebrw_waiver!))
// 미국 고등학교(보딩스쿨 포함) 재학 시 면제 — 기간별 학교 수
const usOk = rows.filter((r) => r.us_hs === 'explicit' || r.us_hs === 'english_medium')
const usYears = (y: number) => usOk.filter((r) => r.us_hs_years === y).length
const usNo = rows.filter((r) => r.us_hs === 'no_waiver').length

type Proc = 'all' | 'request' | 'auto' | 'none' | 'unclear' | 'us'

export default function EnglishGuidePage({ profile }: { profile: ProfileRow | null }) {
  const [proc, setProc] = useState<Proc>('all')
  const [scoreOnly, setScoreOnly] = useState(false)
  const [mine, setMine] = useState(false)
  const [q, setQ] = useState('')
  const [faq, setFaq] = useState<number | null>(profile?.school_in_us ? 3 : 0)
  const [usView, setUsView] = useState<boolean>(!!profile?.school_in_us)
  const targets = profile?.target_school_ids ?? []

  useEffect(() => {
    document.title = t('미국 대학 영어 시험(TOEFL·IELTS·Duolingo) 기준과 면제 조건 | 미국 대입 로드맵', 'US college English test requirements & waivers (TOEFL, IELTS, Duolingo) | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows
      .filter((r) => proc === 'all'
        || (proc === 'request' && (r.waiver_process === 'request_required' || r.waiver_process === 'counselor_confirmation'))
        || (proc === 'auto' && (r.waiver_process === 'automatic' || r.waiver_process === 'office_review'))
        || (proc === 'none' && r.waiver_process === 'no_waiver')
        || (proc === 'unclear' && r.waiver_process === 'unclear'))
      .filter((r) => !scoreOnly || r.sat_ebrw_waiver || r.act_english_waiver)
      .filter((r) => proc !== 'us' || r.us_hs === 'explicit' || r.us_hs === 'english_medium')
      .filter((r) => !mine || targets.includes(r.id))
      .filter((r) => !needle || `${r.name} ${nameOf.get(r.id)?.name_ko ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => (nameOf.get(a.id)?.usnews_rank ?? 999) - (nameOf.get(b.id)?.usnews_rank ?? 999))
  }, [proc, scoreOnly, mine, q, targets])

  const faqs: [string, string, string, string][] = [
    [
      '영어로 수업하는 학교에 4년 다니면 자동으로 면제돼요?', 'Four years at an English-medium school = automatic waiver?',
      `학교마다 달라요. 확인한 대학 ${rows.length}곳 중 ${count('request_required')}곳은 이메일·포털 양식으로 직접 면제를 요청해야 하고, ${count('counselor_confirmation')}곳은 카운슬러·학교 확인서가 필요해요. "따로 신청 안 해도 된다"고 명시한 곳은 ${count('automatic')}곳뿐이고, ${count('unclear')}곳은 면제 조건만 적고 신청이 필요한지는 안 적어 두었어요. ${count('no_waiver')}곳(예: USC, Illinois, Grinnell)은 면제가 아예 없어요. 그래서 "4년 다녔으니 괜찮겠지"가 아니라, 지원하는 학교마다 방법을 확인하는 게 안전해요.`,
      `It depends on the school. Of the ${rows.length} colleges checked, ${count('request_required')} require you to request the waiver (email or portal form) and ${count('counselor_confirmation')} need a counselor/school letter. Only ${count('automatic')} say no request is needed, ${count('unclear')} list who is exempt but not whether to request it, and ${count('no_waiver')} (e.g., USC, Illinois, Grinnell) grant no waiver at all. Check each school’s process rather than assuming.`,
    ],
    [
      '3년이에요, 4년이에요?', 'Is it three years or four?',
      '둘 다 맞아요 — 학교마다 달라요. 2년(예: Yale, Dartmouth, Rice, Case Western), 3년(예: Princeton, Penn, NYU, Tufts, UC), 4년(예: Cornell, Wisconsin, Emory, George Washington, Richmond)이 모두 있어요. 또 어디서 다녔는지도 중요해요 — "영어로 수업하는 학교"면 나라와 상관없이 인정하는 곳도 있지만, UT Austin·Illinois·Ohio State·Texas A&M처럼 미국 고등학교나 지정된 영어권 국가에서 다닌 경우만 인정하는 곳도 있어요. 이런 학교는 한국 국제학교 재학만으로는 면제가 안 돼요.',
      'Both — it varies. You’ll see two years (e.g., Yale, Dartmouth, Rice, Case Western), three (e.g., Princeton, Penn, NYU, Tufts, UC) and four (e.g., Cornell, Wisconsin, Emory, George Washington, Richmond). Location matters too: some accept any English-medium school, while others (e.g., UT Austin, Illinois, Ohio State, Texas A&M) only count U.S. high schools or listed English-speaking countries — so an international school in Korea alone won’t qualify there.',
    ],
    [
      'SAT 영어 점수로 대신할 수 있어요?', 'Can an SAT score replace the English test?',
      `일부 학교는 돼요. ${scoreSchools.length}곳이 SAT 영어(EBRW) 점수를 영어 시험 대신 인정한다고 공식 페이지에 적어 두었고, 기준은 ${satMin}~${satMax}점으로 학교마다 달라요 (예: Columbia·Emory·Barnard 700, Notre Dame·Boston College·George Washington 650, Vanderbilt·Case Western 630). ACT English 점수를 인정하는 곳도 비슷하게 있어요. 아래 "SAT·ACT로 대체 가능만" 스위치로 모아 볼 수 있어요.`,
      `At some schools. ${scoreSchools.length} colleges officially accept an SAT Evidence-Based Reading and Writing score instead, with cutoffs from ${satMin} to ${satMax} (e.g., Columbia, Emory, Barnard 700; Notre Dame, Boston College, George Washington 650; Vanderbilt, Case Western 630). Several accept ACT English too. Use the “SAT/ACT can replace it” switch below.`,
    ],
    [
      '미국 고등학교·보딩스쿨에 다니면 면제돼요?', 'Does a U.S. high school or boarding school count?',
      `대부분 돼요, 다만 기간이 달라요. ${usOk.length}곳이 미국 고등학교 재학을 면제 조건으로 인정해요 — 2년 ${usYears(2)}곳, 3년 ${usYears(3)}곳, 4년 ${usYears(4)}곳이고, 나머지는 "고등학교 전체" 같은 조건이라 원문 확인이 필요해요. "졸업해야 함"(UT Austin), "ESOL 수업 없이"(Boston College), "10~12학년을 미국에서"(Illinois), "4년 모두 미국 고교"(Texas A&M)처럼 조건이 붙는 곳도 많아요. 반대로 ${usNo}곳(예: USC, CMU, Grinnell, 일부 주립대)은 미국 고교에 다녀도 면제가 안 되거나, 특정 국가 시민권자만 면제해요. 아래 "미국 고교 기준으로 보기"를 켜면 학교별로 볼 수 있어요.`,
      `Mostly yes, but the length differs. ${usOk.length} colleges accept U.S. high school attendance as a waiver route — ${usYears(2)} after 2 years, ${usYears(3)} after 3, ${usYears(4)} after 4; the rest say “all of high school” or similar, so check the wording. Many add conditions: graduating from a U.S. high school (UT Austin), no ESOL classes (Boston College), grades 10–12 in the U.S. (Illinois), all four years in the U.S. (Texas A&M). ${usNo} (e.g., USC, CMU, Grinnell, some public universities) don’t waive for U.S. high school students or only exempt citizens of listed countries. Turn on “View for U.S. high school students” below.`,
    ],
  ]

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${on ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{label}</button>
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('영어 시험 기준·면제', 'English tests & waivers')}</h1>
        </div>
        <VerifiedBadge className="mt-3" date={(data as { verified_at: string }).verified_at} sources={t('각 대학 입학처 공식 페이지', 'College admissions pages')} />

        {/* 팩트 체크 */}
        <section className="mt-4 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">{t('자주 듣는 말, 사실일까?', 'Common claims, fact-checked')}</p>
          <ul className="mt-1 divide-y divide-gray-100">
            {faqs.map(([qk, qe, ak, ae], i) => (
              <li key={i}>
                <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                  <span className="text-[15px] font-semibold text-gray-900">{t(qk, qe)}</span>
                  <ChevronDown size={16} className={`shrink-0 text-gray-400 ${faq === i ? 'rotate-180' : ''}`} />
                </button>
                {faq === i && <p className="-mt-1 pb-3 text-[13px] leading-relaxed text-gray-700">{t(ak, ae)}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* 필터 */}
        <div className="relative mt-5">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('학교 이름으로 찾기', 'Search by school name')} className="w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-600 focus:outline-none" />
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {chip(proc === 'all', t('전체', 'All'), () => setProc('all'))}
          {chip(proc === 'request', t('면제 요청 필요', 'Request needed'), () => setProc('request'))}
          {chip(proc === 'auto', t('자동·입학처 판단', 'Automatic'), () => setProc('auto'))}
          {chip(proc === 'none', t('면제 없음', 'No waiver'), () => setProc('none'))}
          {chip(proc === 'unclear', t('신청 여부 안내 없음', 'Steps not stated'), () => setProc('unclear'))}
          {chip(proc === 'us', t('미국 고교 면제 가능', 'U.S. high school waiver'), () => { setProc('us'); setUsView(true) })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
          <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={usView} onChange={(e) => setUsView(e.target.checked)} className="h-4 w-4 accent-blue-600" />{t('미국 고교 기준으로 보기', 'View for U.S. high school students')}</label>
          <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={scoreOnly} onChange={(e) => setScoreOnly(e.target.checked)} className="h-4 w-4 accent-blue-600" />{t('SAT·ACT로 대체 가능만', 'SAT/ACT can replace it')}</label>
          {targets.length > 0 && <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-blue-600" />{t('내 목표 학교만', 'My targets only')}</label>}
        </div>

        <details className="mt-3 rounded-xl bg-white px-3.5 py-2.5 text-xs text-gray-600 ring-1 ring-gray-200">
          <summary className="cursor-pointer font-semibold text-gray-700">{t('표시 읽는 법', 'How to read this list')}</summary>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 leading-relaxed">
            <li>{t('TOEFL "80+" = 학교가 공개한 최저 점수예요.', 'TOEFL “80+” = the minimum score the school publishes.')}</li>
            <li>{t('"비공개" = 최저 점수를 공개하지 않았다는 뜻이에요. 시험이 필요 없다는 뜻이 아니에요 — 면제 조건에 해당하지 않으면 내야 해요.', '“n/p” = no minimum published. It does NOT mean no test — you still need one unless you meet a waiver condition.')}</li>
            <li>{t('"권장만" = 최저 점수 대신 권장·평균 점수만 공개했어요 (학교를 누르면 보여요).', '“rec. only” = only a recommended/typical score is published (tap the school).')}</li>
            <li>{t('"선택·불필요" = 영어 시험 제출이 필수가 아닌 학교예요.', '“optional” = English tests aren’t required.')}</li>
            <li>{t('"신청 여부 안내 없음" = 누가 면제되는지는 적혀 있지만, 면제를 받으려면 따로 요청해야 하는지 자동인지는 안 적혀 있어요. 해당된다면 입학처에 물어보는 게 안전해요.', '“Steps not stated” = the page says who is exempt but not whether you must request it. Ask admissions if you qualify.')}</li>
          </ul>
        </details>
        <p className="mt-3 text-xs text-gray-500">{t(`${list.length}개 학교`, `${list.length} schools`)}</p>
        <div className="mt-1.5 flex flex-col gap-2">
          {list.map((r) => {
            const s = nameOf.get(r.id)
            const P = PROCESS[r.waiver_process]
            const PIcon = P.icon
            return (
              <button key={r.id} onClick={() => navigate(`/schools/${slugify(r.name)}`)} className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-3.5 py-3 text-left active:bg-gray-50">
                <SchoolLogo schoolId={r.id} name={r.name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{t(s?.name_ko ?? r.name, r.name)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {usView ? (() => {
                      const L = usHsLine(r)
                      return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${L.ok === true ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : L.ok === false ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-gray-50 text-gray-600 ring-gray-200'}`}>{t('미국 고교: ', 'U.S. HS: ')}{r.us_hs_years && L.ok ? t(`${r.us_hs_years}년 이상`, `${r.us_hs_years}+ yrs`) : t(L.ko.split(' — ')[0], L.en.split(' — ')[0])}</span>
                    })() : <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${P.cls}`}><PIcon size={11} strokeWidth={2.2} />{t(P.ko.split(' — ')[0], P.en.split(' — ')[0])}</span>}
                    {r.sat_ebrw_waiver && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-200">SAT {r.sat_ebrw_waiver}+</span>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[10px] text-gray-400">TOEFL</span>
                  <span className="block text-sm font-bold tabular-nums text-gray-900">{r.toefl_min != null ? `${r.toefl_min}+` : r.requirement === 'not_required' || r.waiver_process === 'not_applicable' ? t('선택·불필요', 'optional') : r.toefl_recommended ? t('권장만', 'rec. only') : t('비공개', 'n/p')}</span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
          {t('각 대학 입학처 공식 페이지에서 확인한 내용이에요 (2026년 9월). TOEFL은 2026년 1월부터 1–6점 새 척도가 함께 쓰여서, 학교에 따라 새 척도로만 기준을 적은 곳이 있어요. 기준은 해마다 바뀌니 지원 전에 공식 페이지를 꼭 다시 확인하세요. Williams·UVA·UChicago는 공식 페이지를 직접 확인하지 못해 비워 두었어요.', 'Checked on each college’s official admissions pages (September 2026). Since January 2026 TOEFL also uses a new 1–6 scale, and some schools list only that. Requirements change yearly — re-check before applying. Williams, UVA and UChicago are left blank because their official pages couldn’t be verified directly.')}
        </p>
      </div>
    </div>
  )
}
