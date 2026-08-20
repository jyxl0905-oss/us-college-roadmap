import { useEffect, useMemo, useState } from 'react'
import type { School, Tier } from '../lib/types'
import { loadSchools } from '../lib/schoolsCache'
import { navigate, slugify } from '../lib/router'
import { regionLabels, schoolRegion, type Region } from './region'
import SchoolLogo from './SchoolLogo'
import { readCompareIds, writeCompareIds, toggleCompareId } from './compareSet'
import type { ProfileRow } from '../lib/profile'
import { t, bilingual } from '../i18n'

const tierTitles: Record<Tier, string> = bilingual(
  { 1: 'Top 20', 2: '21–40위', 3: '41–60위' },
  { 1: 'Top 20', 2: 'Ranked 21–40', 3: 'Ranked 41–60' },
)

interface SchoolsListPageProps {
  profile: ProfileRow | null // 로그인 시 전공 direct-admit 필터 노출
}

// F1: 대학 둘러보기 리스트 — 비로그인 전체 접근
export default function SchoolsListPage({ profile }: SchoolsListPageProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [query, setQuery] = useState('')
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

  useEffect(() => {
    loadSchools().then(setSchools)
  }, [])

  const myMajor = profile?.major_primary && profile.major_primary !== 'undecided' ? profile.major_primary : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return schools.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.name_ko.toLowerCase().includes(q)) return false
      if (needBlindOnly && s.need_blind_intl !== true) return false
      if (testPolicy !== 'all' && s.test_policy !== testPolicy) return false
      if (region !== 'all' && schoolRegion(s) !== region) return false
      if (directAdmitMine && myMajor && !s.direct_admit_majors.includes(myMajor)) return false
      return true
    })
  }, [schools, query, needBlindOnly, testPolicy, region, directAdmitMine, myMajor])

  const groups: Tier[] = [1, 2, 3]
  const sortGroup = (list: School[]) =>
    [...list].sort((a, b) =>
      sortByIntl
        ? (b.intl_accept_rate ?? -1) - (a.intl_accept_rate ?? -1)
        : a.usnews_rank - b.usnews_rank,
    )

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
      on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'
    }`

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className={`mx-auto max-w-md px-5 py-6 ${compareIds.length > 0 ? 'pb-28' : 'pb-16'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label={t('홈으로', 'Home')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
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
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
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
        </div>

        {/* F2 안내: 비교 진입점 */}
        {schools.length > 0 && compareIds.length === 0 && (
          <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800">
            ⚖️ {t('카드의', 'Tap')} <span className="font-semibold">{t('[＋ 비교]', '[＋ Compare]')}</span>{t('를 눌러 2~3개 학교를 나란히 비교할 수 있어요.', ' on a card to compare 2–3 schools side by side.')}
          </p>
        )}

        {schools.length === 0 && <p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>}

        {groups.map((tier) => {
          const list = sortGroup(filtered.filter((s) => s.tier === tier))
          if (list.length === 0) return null
          return (
            <div key={tier} className="mt-6">
              <h2 className="font-semibold text-gray-900">{tierTitles[tier]}</h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {list.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/schools/${slugify(s.name)}`)}
                    className="relative w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left active:bg-gray-50"
                  >
                    {/* F2: 비교 선택 (카드 이동과 분리) */}
                    <span
                      role="checkbox"
                      aria-checked={compareIds.includes(s.id)}
                      aria-label={t(`${s.name} 비교에 추가`, `Add ${s.name} to compare`)}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCompare(s.id)
                      }}
                      className={`absolute right-3 top-3 rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${
                        compareIds.includes(s.id)
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {compareIds.includes(s.id) ? t('✓ 비교 담김', '✓ Comparing') : t('＋ 비교', '＋ Compare')}
                    </span>
                    <span className="flex items-center gap-3 pr-16">
                      <SchoolLogo schoolId={s.id} name={s.name} size={36} />
                      <span className="min-w-0">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-sm text-gray-500">{s.name_ko}</p>
                      </span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        {tierTitles[s.tier]}
                      </span>
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
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Test-optional</span>
                      )}
                      {s.test_policy === 'test-free' && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{t('시험 미반영', 'Test-free')}</span>
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
