import { directAdmitParent } from '../data/majors'
import { useEffect, useMemo, useState } from 'react'
import type { School, Tier } from '../lib/types'
import { loadSchools } from '../lib/schoolsCache'
import { navigate, slugify, goBack } from '../lib/router'
import { regionLabels, schoolRegion, type Region } from './region'
import SchoolLogo from './SchoolLogo'
import { readCompareIds, writeCompareIds, toggleCompareId } from './compareSet'
import { uniGroupOf, uniGroupTitles, uniGroups } from './rankGroups'
import { saveProfile, type ProfileRow } from '../lib/profile'
import { setPrefillSchoolIds } from './prefill'
import FitPicker from './FitPicker'
import { t, bilingual } from '../i18n'

const lacTierTitles: Record<Tier, string> = bilingual(
  { 1: 'LAC Top 12', 2: 'LAC 13–24위', 3: 'LAC 25–35위' },
  { 1: 'LAC Top 12', 2: 'LAC ranked 13–24', 3: 'LAC ranked 25–35' },
)

interface SchoolsListPageProps {
  profile: ProfileRow | null // 로그인 시 전공 direct-admit 필터 노출
  userId: string | null
  onProfileChange: (p: ProfileRow) => void
}

// F1: 대학 둘러보기 리스트 — 비로그인 전체 접근
export default function SchoolsListPage({ profile, userId, onProfileChange }: SchoolsListPageProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'university' | 'lac'>('university') // 종합대 / 리버럴 아츠 칼리지
  const [lacInfoOpen, setLacInfoOpen] = useState(false)
  const [sortByIntl, setSortByIntl] = useState(false)
  const [needBlindOnly, setNeedBlindOnly] = useState(false)
  const [testPolicy, setTestPolicy] = useState<'all' | 'test-required' | 'test-optional' | 'test-free'>('all')
  const [region, setRegion] = useState<'all' | Region>('all')
  const [directAdmitMine, setDirectAdmitMine] = useState(false)
  const [compareIds, setCompareIdsState] = useState<number[]>(readCompareIds) // F2: 최대 3개, 세션 유지
  const setCompareIds = (ids: number[]) => {
    writeCompareIds(ids)
    setCompareIdsState(ids)
  }
  const toggleCompare = (id: number) => setCompareIds(toggleCompareId(compareIds, id))
  const [targetPending, setTargetPending] = useState(false)
  const [fitPromptId, setFitPromptId] = useState<number | null>(null) // 방금 목표에 추가한 학교 — 티어 선택 유도

  // ＋ 추가: 로그인 시 목표 학교에 추가/제거 (상세 페이지와 같은 로직), 비로그인 시 이 학교로 온보딩 시작
  const toggleTarget = async (s: School) => {
    if (!profile || !userId) {
      setPrefillSchoolIds([s.id])
      navigate('/')
      return
    }
    if (targetPending) return
    setTargetPending(true)
    const base = profile.target_mode === 'schools' ? profile.target_school_ids : []
    const isTargeted = base.includes(s.id)
    const updated: ProfileRow = {
      ...profile,
      target_mode: 'schools',
      target_tier: null,
      target_school_ids: isTargeted ? base.filter((id) => id !== s.id) : [...base, s.id],
    }
    try {
      await saveProfile(userId, updated)
      onProfileChange(updated)
      setFitPromptId(isTargeted ? null : s.id)
    } catch {
      alert(t('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.', 'Could not save. Check your connection and try again.'))
    } finally {
      setTargetPending(false)
    }
  }

  useEffect(() => {
    loadSchools().then(setSchools)
  }, [])

  // 검색용 페이지 제목
  useEffect(() => {
    document.title = '미국 명문대 합격률·합격 전략 — 대학 136+ 공식 데이터 | 미국 대입 로드맵'
    return () => { document.title = '미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴' }
  }, [])

  // 긴 목록 스크롤 보조: 위로 가기 버튼 표시 여부
  const [showTop, setShowTop] = useState(false)
  useEffect(() => {
    const on = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const myMajor = profile?.major_primary && profile.major_primary !== 'undecided' ? profile.major_primary : null

  // 종합대/LAC 외의 조건은 공통 — 탭 전환 판단에도 같은 기준을 씀
  const passesFilters = (s: School, q: string) => {
    if (q && !s.name.toLowerCase().includes(q) && !s.name_ko.toLowerCase().includes(q)) return false
    if (needBlindOnly && s.need_blind_intl !== true) return false
    if (testPolicy !== 'all' && s.test_policy !== testPolicy) return false
    if (region !== 'all' && schoolRegion(s) !== region) return false
    if (directAdmitMine && myMajor && !s.direct_admit_majors.includes(directAdmitParent(myMajor) as string)) return false
    return true
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return schools.filter((s) => (s.kind ?? 'university') === kind && passesFilters(s, q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, kind, query, needBlindOnly, testPolicy, region, directAdmitMine, myMajor])

  // 검색어가 지금 탭에는 없고 반대 탭에 있으면 자동 전환 (LAC 탭에서 '하버드'를 찾으면 종합대로)
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q || filtered.length > 0) return
    const other = kind === 'lac' ? 'university' : 'lac'
    if (schools.some((s) => (s.kind ?? 'university') === other && passesFilters(s, q))) setKind(other)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filtered.length, kind, schools])

  // 종합대는 순위 5그룹(usnews_rank), LAC은 기존 3그룹(tier)
  const groups: number[] = kind === 'lac' ? [1, 2, 3] : uniGroups
  const groupOf = (s: School) => (kind === 'lac' ? s.tier : uniGroupOf(s.usnews_rank))
  const groupTitle = (g: number) => (kind === 'lac' ? lacTierTitles[g as Tier] : uniGroupTitles[g as 1 | 2 | 3 | 4 | 5])
  const sortGroup = (list: School[]) =>
    [...list].sort((a, b) =>
      sortByIntl
        ? (b.intl_accept_rate ?? -1) - (a.intl_accept_rate ?? -1)
        : (kind === 'lac' ? (a.lac_rank ?? 999) - (b.lac_rank ?? 999) : a.usnews_rank - b.usnews_rank),
    )

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
      on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
    }`

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className={`mx-auto max-w-md px-5 py-6 md:max-w-3xl lg:max-w-6xl ${compareIds.length > 0 ? 'pb-28' : 'pb-16'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('대학 둘러보기', 'Browse Colleges')}</h1>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('학교 이름 검색 (예: NYU, 하버드)', 'Search schools (e.g., NYU, Harvard)')}
          className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
        />

        {/* 종합대 / 리버럴 아츠 칼리지 전환 */}
        {schools.some((s) => s.kind === 'lac') && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setKind('university')} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold ${kind === 'university' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
              {t('종합대학', 'Universities')} <span className="ml-1 text-xs font-normal opacity-70">{schools.filter((s) => (s.kind ?? 'university') === 'university').length}</span>
            </button>
            <button onClick={() => setKind('lac')} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold ${kind === 'lac' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
              {t('리버럴 아츠 칼리지', 'Liberal Arts Colleges')} <span className="ml-1 text-xs font-normal opacity-70">{schools.filter((s) => s.kind === 'lac').length}</span>
            </button>
          </div>
        )}
        {schools.some((s) => s.kind === 'lac') && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-white">
            <button onClick={() => setLacInfoOpen((v) => !v)} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-medium text-gray-800">
              <span>🎓 {t('종합대학 vs 리버럴 아츠 칼리지 — 뭐가 다른가요?', 'Universities vs Liberal Arts Colleges — what’s the difference?')}</span>
              <span className="text-gray-400">{lacInfoOpen ? '▴' : '▾'}</span>
            </button>
            {lacInfoOpen && (
              <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-2 text-sm leading-relaxed text-gray-700">
                <p>{t('리버럴 아츠 칼리지(LAC)는 학부 교육에만 집중하는 소규모 대학이에요. 대학원·전문대학원이 거의 없고, 학생 수가 보통 1,500~3,000명이라 교수가 직접 가르치고 수업도 작아요. "유명한 대학"만 찾다가 놓치기 쉬운데, 미국 안에서는 종합대 못지않게 인정받아요.', 'Liberal arts colleges (LACs) are small schools focused entirely on undergraduate teaching. They have few or no graduate/professional schools, usually 1,500–3,000 students, professors teach classes themselves, and classes are small. Easy to miss if you only look for famous names — but well respected within the US.')}</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-xs">
                    <thead><tr className="text-left text-gray-400"><th className="py-1 pr-2"></th><th className="pr-2">{t('종합대학', 'University')}</th><th>{t('리버럴 아츠 칼리지', 'LAC')}</th></tr></thead>
                    <tbody className="[&_td]:py-1 [&_td]:pr-2 [&_td]:align-top">
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('규모', 'Size')}</td><td>{t('학부 5,000~40,000명 + 대학원', '5,000–40,000 undergrads + grad schools')}</td><td>{t('학부 1,500~3,000명, 대학원 거의 없음', '1,500–3,000 undergrads, few/no grad schools')}</td></tr>
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('수업', 'Classes')}</td><td>{t('대형 강의 + 조교(TA) 세션 많음', 'Large lectures + TA sections common')}</td><td>{t('소규모 토론식, 교수가 직접', 'Small, discussion-based, taught by professors')}</td></tr>
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('전공', 'Majors')}</td><td>{t('공학·간호·경영 등 전문 단과대 많음', 'Many professional schools: engineering, nursing, business')}</td><td>{t('기초 학문 중심(수학·과학·인문·사회). 공학·경영 학부는 드묾(예외 있음)', 'Core disciplines (math, sciences, humanities, social sciences). Engineering/business rare (with exceptions)')}</td></tr>
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('연구', 'Research')}</td><td>{t('대학원생 중심 연구실, 학부생 참여는 경쟁', 'Grad-student-led labs; undergrad spots competitive')}</td><td>{t('학부생이 교수 연구에 직접 참여하기 쉬움', 'Undergrads easily join faculty research')}</td></tr>
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('졸업 후', 'After graduation')}</td><td>{t('취업 브랜드·동문 네트워크 큼', 'Big brand recognition & alumni network')}</td><td>{t('대학원(PhD·의대·로스쿨) 진학률 높음, 미국 내 평판 좋음', 'High PhD/med/law school placement; strong US reputation')}</td></tr>
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('국제학생 지원금', 'Intl. aid')}</td><td>{t('학교마다 큰 차이 (주립대는 거의 없음)', 'Varies widely (publics: almost none)')}</td><td>{t('상위권은 후한 편 — 일부는 국제학생 need-blind', 'Top LACs are generous — some need-blind for internationals')}</td></tr>
                      <tr className="border-t border-gray-100"><td className="font-medium text-gray-500">{t('한국 인지도', 'Recognition in Korea')}</td><td>{t('높음', 'High')}</td><td>{t('낮음 — 설명이 필요할 수 있음', 'Low — you may need to explain it')}</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500">{t('이런 학생에게 맞아요: 작은 수업·교수와의 관계를 중시하거나, 전공을 넓게 탐색하고 싶거나, 대학원 진학을 생각하거나, 국제학생 재정지원이 중요한 경우. 반대로 공학·간호처럼 전문 학부가 필요하면 종합대가 맞아요. LAC 순위는 US News의 별도 랭킹(National Liberal Arts Colleges)이라 종합대 순위와 직접 비교되지 않아요.', 'A fit if you value small classes and close faculty relationships, want to explore majors broadly, plan on grad school, or need international financial aid. If you need a professional program (engineering, nursing), a university fits better. LAC ranks come from US News’ separate National Liberal Arts Colleges list and are not directly comparable to university ranks.')}</p>
              </div>
            )}
          </div>
        )}

        {/* 필터 칩 */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSortByIntl(!sortByIntl)} className={chip(sortByIntl)}>
            {t('국제학생 합격률순', 'Sort by intl. accept rate')}
          </button>
          <button onClick={() => setNeedBlindOnly(!needBlindOnly)} className={chip(needBlindOnly)}>
            {t('Need-blind만', 'Need-blind only')}
          </button>
          {myMajor && (
            <button onClick={() => setDirectAdmitMine(!directAdmitMine)} className={chip(directAdmitMine)}>
              {t('내 전공 직접 선발', 'Direct admit for my major')}
            </button>
          )}
          <select
            value={testPolicy}
            onChange={(e) => setTestPolicy(e.target.value as typeof testPolicy)}
            className="shrink-0 rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600"
          >
            <option value="all">{t('시험 정책 전체', 'All test policies')}</option>
            <option value="test-required">{t('SAT/ACT 필수', 'SAT/ACT required')}</option>
            <option value="test-optional">Test-optional</option>
            <option value="test-free">{t('시험 미반영', 'Test-free')}</option>
          </select>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as typeof region)}
            className="shrink-0 rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600"
          >
            <option value="all">{t('지역 전체', 'All regions')}</option>
            {(Object.keys(regionLabels) as Region[]).map((r) => (
              <option key={r} value={r}>
                {regionLabels[r]}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigate('/map')}
            className="shrink-0 rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 active:bg-gray-50"
          >
            🗺️ {t('지도로 보기', 'Map view')}
          </button>
        </div>

        {/* F2 안내: 비교 진입점 */}
        {schools.length > 0 && compareIds.length === 0 && (
          <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800">
            ⚖️ {t('카드의', 'Tap')} <span className="font-semibold">{t('[＋ 비교]', '[＋ Compare]')}</span>{t('를 눌러 2~3개 학교를 나란히 비교할 수 있어요.', ' on a card to compare 2–3 schools side by side.')}
          </p>
        )}

        {schools.length === 0 && <p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>}

        {schools.length > 0 && filtered.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {groups.map((g) => {
              const n = filtered.filter((s) => groupOf(s) === g).length
              if (n === 0) return null
              return (
                <button
                  key={g}
                  onClick={() => document.getElementById(`tier-${g}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 active:bg-gray-200"
                >
                  ↓ {groupTitle(g)} {n}
                </button>
              )
            })}
          </div>
        )}

        {groups.map((g) => {
          const list = sortGroup(filtered.filter((s) => groupOf(s) === g))
          if (list.length === 0) return null
          return (
            <div key={g} id={`tier-${g}`} className="mt-6 scroll-mt-24">
              <h2 className="font-semibold text-gray-900">{groupTitle(g)}</h2>
              <div className="mt-3 grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/schools/${slugify(s.name)}`)}
                    className="relative h-full w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left active:bg-gray-50"
                  >
                    {/* F2: 비교 선택 + 목표 추가 (카드 이동과 분리) */}
                    <span className="absolute right-3 top-3 flex gap-1.5">
                      <span
                        role="button"
                        aria-label={t(`${s.name} 목표 학교에 추가`, `Add ${s.name} to my targets`)}
                        onClick={(e) => {
                          e.stopPropagation()
                          void toggleTarget(s)
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          profile?.target_mode === 'schools' && profile.target_school_ids.includes(s.id)
                            ? 'border-green-600 bg-green-600 font-semibold text-white'
                            : 'border-gray-200 bg-white text-gray-500'
                        }`}
                      >
                        {profile?.target_mode === 'schools' && profile.target_school_ids.includes(s.id) ? t('✓ 추가됨', '✓ Added') : t('＋ 추가', '＋ Add')}
                      </span>
                      <span
                        role="checkbox"
                        aria-checked={compareIds.includes(s.id)}
                        aria-label={t(`${s.name} 비교에 추가`, `Add ${s.name} to compare`)}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCompare(s.id)
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          compareIds.includes(s.id)
                            ? 'border-blue-600 bg-blue-600 font-semibold text-white'
                            : 'border-gray-200 bg-white text-gray-500'
                        }`}
                      >
                        {compareIds.includes(s.id) ? t('✓ 비교 담김', '✓ Comparing') : t('＋ 비교', '＋ Compare')}
                      </span>
                    </span>
                    <span className="flex items-start gap-3 pr-32">
                      {/* 로고 고정 박스 48px — 아이콘형·텍스트형 로고의 무게를 통일 */}
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
                        <SchoolLogo schoolId={s.id} name={s.name} size={38} />
                      </span>
                      <span className="min-w-0">
                        <p title={s.name} className="line-clamp-2 text-[15px] font-bold leading-5 text-gray-900">{s.name}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{s.name_ko}</p>
                      </span>
                    </span>
                    <span className="mt-2.5 flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        {s.kind === 'lac' ? `LAC #${s.lac_rank ?? '–'}` : uniGroupTitles[uniGroupOf(s.usnews_rank)]}
                      </span>
                      {s.overall_accept_rate != null && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                          {t(`합격률 ${s.overall_accept_rate}%`, `Accept ${s.overall_accept_rate}%`)}
                        </span>
                      )}
                      {s.intl_accept_rate !== null && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                          {t(`국제 합격률 ${s.intl_accept_rate}%`, `Intl. accept ${s.intl_accept_rate}%`)}
                        </span>
                      )}
                      {s.need_blind_intl === true && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">Need-blind</span>
                      )}
                      {s.test_policy === 'test-required' && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{t('SAT/ACT 필수', 'SAT/ACT required')}</span>
                      )}
                      {s.test_policy === 'test-optional' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">Test-optional</span>
                      )}
                      {s.test_policy === 'test-free' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">{t('시험 미반영', 'Test-free')}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {schools.length > 0 && filtered.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-400">{t('조건에 맞는 학교가 없어요.', 'No schools match these filters.')}</p>
        )}
      </div>

      {/* 목표 추가 직후: 티어(예측) 선택 — 하단 고정 바 (카드 레이아웃을 건드리지 않음) */}
      {fitPromptId !== null && userId && (() => {
        const ps = schools.find((x) => x.id === fitPromptId)
        if (!ps) return null
        return (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-gray-800">
                  ✓ <span className="font-bold">{ps.name}</span> {t('추가됨 — 네 생각엔 이 학교, 너한테 뭐야?', 'added — your call, what is this school to you?')}
                </p>
                <button onClick={() => setFitPromptId(null)} className="shrink-0 text-xs text-gray-400 underline">{t('나중에', 'Later')}</button>
              </div>
              <div className="mt-2">
                <FitPicker userId={userId} schoolId={ps.id} value={null} dataFit={null} onSaved={() => setFitPromptId(null)} />
              </div>
            </div>
          </div>
        )
      })()}

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('맨 위로', 'Back to top')}
          className={`no-print fixed right-4 z-40 h-11 w-11 rounded-full bg-gray-900/80 text-lg text-white shadow-lg backdrop-blur active:bg-gray-700 ${compareIds.length > 0 ? 'bottom-24' : 'bottom-5'}`}
        >
          ↑
        </button>
      )}

      {/* F2: 비교하기 바 */}
      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button onClick={() => setCompareIds([])} className="shrink-0 text-sm text-gray-400 underline">
              {t('선택 해제', 'Clear')}
            </button>
            <button
              onClick={() => navigate(`/compare?ids=${compareIds.join(',')}`)}
              disabled={compareIds.length < 2}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-300"
            >
              {t('비교하기', 'Compare')} ({compareIds.length}/3){compareIds.length < 2 && t(' — 2개 이상 골라주세요', ' — pick at least 2')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
