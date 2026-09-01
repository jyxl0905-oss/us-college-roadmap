import { useEffect, useState } from 'react'
import roadmaps from '../data/major-roadmaps.json'
import roadmapsEn from '../data/major-roadmaps.en.json'
import { majorLabel, majorCategories, majorDisplay, majorAlias } from '../data/majors'
import { profileGrade, type ProfileRow } from '../lib/profile'
import { navigate, goBack } from '../lib/router'
import { currentSeasonLabel } from '../lib/academics'
import { insertRow } from '../app/appData'
import { loadPlans, cycleSeasons, type Plan } from '../app/plans'
import type { Axis } from '../lib/score'
import { t, getLang } from '../i18n'
import careersData from '../data/major-careers.json'
import rankingsData from '../data/major-rankings.json'
import { directAdmitParent } from '../data/majors'
import schoolsIndex from '../data/schools.index.json'
import SchoolLogo from '../browse/SchoolLogo'
import { slugify } from '../lib/router'

interface Occupation { title: string; pay: string | null; pay_year: number | null; outlook: string | null; window: string | null; url: string | null; note?: string | null }
interface CareerInfo { desc_ko: string | null; desc_en: string | null; occupations: Occupation[]; outlook_note_ko: string | null; grad_note_ko?: string | null }
const CAREERS = careersData as Record<string, CareerInfo>
interface IdxSchool { id: number; name: string; direct_admit_majors?: string[] }
const IDX = schoolsIndex as IdxSchool[]
interface RankList { list_name: string | null; url: string; edition: string | null; items: { rank: number; name: string; school_id: number | null }[] }
const RANKINGS = rankingsData as Record<string, RankList>

interface RoadmapCell { academic: string[]; activity: string[] }
interface MajorData {
  title: string
  ap: string[]
  strong: string | null
  guide: { label: string; text: string }[]
  roadmap: Record<string, RoadmapCell>
}
const DATA_KO = roadmaps as Record<string, MajorData>
const DATA_EN = roadmapsEn as Record<string, MajorData>
const DATA = new Proxy(DATA_KO, { get: (_, k) => (getLang() === 'en' ? DATA_EN : DATA_KO)[k as string], ownKeys: () => Reflect.ownKeys(DATA_KO), getOwnPropertyDescriptor: (_, k) => Reflect.getOwnPropertyDescriptor(DATA_KO, k) }) as Record<string, MajorData>

interface MajorRoadmapPageProps {
  majorKey: string
  userId: string | null
  profile: ProfileRow | null
}

// 전공 로드맵 — v1(가이드)·v2(4년 로드맵) 원문을 배치만 함. 글 최소: 내 학년만 펼침, 가이드는 접힘
export default function MajorRoadmapPage({ majorKey, userId, profile }: MajorRoadmapPageProps) {
  // 검색·공유용 페이지 제목
  useEffect(() => {
    document.title = `${majorLabel(majorKey)} 전공 가이드 — 미국 대입 로드맵`
    return () => { document.title = '미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴' }
  }, [majorKey])

  // 세부 전공(유전학 등)은 자체 로드맵이 없으면 상위 전공 로드맵을 사용
  let roadmapKey = majorKey
  for (let i = 0; i < 5 && !DATA[roadmapKey] && majorAlias[roadmapKey]; i++) roadmapKey = majorAlias[roadmapKey]
  const data = DATA[roadmapKey]
  const roadmapBorrowed = roadmapKey !== majorKey
  const myGrade = profile ? profileGrade(profile) : 9
  const [openGrade, setOpenGrade] = useState<number>(myGrade)
  const [guideOpen, setGuideOpen] = useState(false)
  // 전공 알아보기 진입: 소개·진로 중심의 간단 보기. 준비 상세(로드맵·AP·활동)는 [전체 가이드 보기]로
  const explore = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).has('explore') || !userId)
  const [full, setFull] = useState(!explore)
  const [plans, setPlans] = useState<Plan[]>([])
  const [added, setAdded] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null) // 연타로 같은 항목이 두 번 담기지 않도록

  useEffect(() => {
    if (userId) loadPlans(userId).then(setPlans)
  }, [userId])

  if (!data)
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-gray-500">{t('전공 정보를 찾을 수 없어요.', 'Major not found.')}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 underline">{t('돌아가기', 'Go back')}</button>
      </div>
    )

  const isPlanned = (title: string) => plans.some((p) => p.title === title)
  // 학업 트랙 → rigor, 활동 트랙 → spike (학생이 계획 탭에서 축을 바꿀 수 있음)
  const addToPlan = async (title: string, axis: Axis) => {
    if (!userId) {
      navigate('/')
      return
    }
    if (adding === title || isPlanned(title)) return
    setAdding(title)
    try {
      const cur = currentSeasonLabel()
      const seasons = cycleSeasons()
      const season = seasons.some((s) => s.label === cur) ? cur : seasons[0].label
      const row = await insertRow<Plan>('plans', userId, { title, axis, season_label: season, status: 'planned', notes: null })
      if (row) {
        setPlans((prev) => [...prev, row])
        setAdded(title)
        setTimeout(() => setAdded(null), 1200)
      }
    } finally {
      setAdding(null)
    }
  }

  const otherMajors = majorCategories.filter((m) => m.value !== majorKey)

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/majors')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{majorLabel(majorKey)}</h1>
            <p className="text-xs text-gray-400">{t('전공 가이드 맵 · 4년 로드맵 (편집 가이드)', 'Major guide map · 4-year roadmap (editorial guide)')}</p>
          </div>
        </div>

        {/* 전공 소개 — 무엇을 배우고 무엇을 하게 되나 */}
        {CAREERS[majorKey] && (CAREERS[majorKey].desc_ko || CAREERS[majorKey].desc_en) && (
          <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
            {getLang() === 'en' ? (CAREERS[majorKey].desc_en ?? CAREERS[majorKey].desc_ko) : CAREERS[majorKey].desc_ko}
          </p>
        )}

        {roadmapBorrowed && full && (
          <p className="mt-2 text-xs text-gray-400">
            {t(`고등학교 준비는 ${majorLabel(roadmapKey)}와 같아요 — 아래 로드맵·AP는 ${majorLabel(roadmapKey)} 기준이에요.`, `High-school prep matches ${majorLabel(roadmapKey)} — the roadmap and APs below follow it.`)}
          </p>
        )}

        {/* 데스크톱: 카드 2열 배치 (스크롤 절감) — 모바일은 기존 세로 흐름 */}
        <div className="lg:columns-2 lg:gap-4 [&>*]:break-inside-avoid">
        {majorKey === 'engineering' && (
          <details open={!full} className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
            <summary className="cursor-pointer select-none font-semibold text-gray-900">{t('🔩 공학 세부 분야 한눈에', '🔩 Engineering fields at a glance')}</summary>
            <div className="mt-2 flex flex-col gap-1.5 text-sm">
              {[
                { ko: '기계공학', en: 'Mechanical', d: t('움직이는 모든 것 — 자동차, 로봇, 기계 장치. 가장 범용적인 공학', 'Everything that moves — cars, robots, machines. The most versatile field') },
                { ko: '전기·전자공학', en: 'Electrical', d: t('회로, 반도체, 전력, 통신 — 하드웨어의 핵심', 'Circuits, semiconductors, power, communications — the core of hardware') },
                { ko: '토목·환경공학', en: 'Civil', d: t('다리, 건물, 도시 인프라 — 규모가 가장 큰 공학', 'Bridges, buildings, urban infrastructure — engineering at the largest scale') },
                { ko: '컴퓨터공학', en: 'Computer Eng.', d: t('하드웨어+소프트웨어의 경계 — CS와 전자공학 사이', 'The hardware-software boundary — between CS and EE') },
                { ko: '재료공학', en: 'Materials', d: t('더 가볍고 강한 소재 — 배터리, 반도체 소재', 'Lighter, stronger materials — batteries, semiconductor materials') },
              ].map((f) => (
                <p key={f.en} className="rounded-lg bg-gray-50 px-3 py-2"><span className="font-semibold text-gray-900">{t(f.ko, f.en)}</span> <span className="text-xs text-gray-400">{t(f.en, '')}</span><span className="block text-xs text-gray-600">{f.d}</span></p>
              ))}
            </div>
            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              💡 {t('고등학교 준비(Calc BC·Physics C·만들기 프로젝트)는 어느 분야든 같아요. 세부 분야는 대학 1~2학년에 정하는 경우가 많고, "Engineering Undecided"로 지원할 수 있는 학교도 많아요.', 'High-school prep (Calc BC, Physics C, build projects) is the same for every field. Many students choose a field in college, and many schools accept "Engineering Undecided" applicants.')}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {t('별도 페이지가 있는 분야: ', 'Fields with their own page: ')}
              {['biomedical_eng', 'chemical_eng', 'aerospace_eng', 'industrial_eng'].map((k, i) => (
                <span key={k}>{i > 0 && ' · '}<button onClick={() => navigate(`/major/${k}${full ? '' : '?explore=1'}`)} className="text-blue-600 underline">{majorLabel(k)}</button></span>
              ))}
            </p>
          </details>
        )}
        {/* 4년 로드맵 — 학년 아코디언, 내 학년 펼침 */}
        {full && <div className="mt-4 flex flex-col gap-2">
          {[9, 10, 11, 12].map((g) => {
            const cell = data.roadmap[String(g)]
            const open = openGrade === g
            const mine = g === myGrade
            return (
              <div key={g} className={`rounded-xl border-2 bg-white ${mine ? 'border-blue-600' : 'border-gray-200'}`}>
                <button onClick={() => setOpenGrade(open ? 0 : g)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <span className="font-semibold text-gray-900">
                    {t(`${g}학년`, `Grade ${g}`)} {mine && <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">{t('지금', 'Now')}</span>}
                  </span>
                  <span className="text-gray-400">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {(['academic', 'activity'] as const).map((track) => (
                      <div key={track} className={track === 'activity' ? 'mt-3' : ''}>
                        <p className="text-[11px] font-semibold text-gray-400">{track === 'academic' ? t('📚 학업', '📚 Academics') : t('🏃 활동', '🏃 Activities')}</p>
                        <div className="mt-1 flex flex-col gap-1.5">
                          {cell[track].map((item) => {
                            const planned = isPlanned(item)
                            return (
                              <div key={item} className="flex items-start gap-2">
                                <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-800">{item}</p>
                                <button
                                  onClick={() => !planned && addToPlan(item, track === 'academic' ? 'rigor' : 'spike')}
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                    planned ? 'border-green-200 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-blue-700 active:bg-blue-100'
                                  }`}
                                >
                                  {planned ? (added === item ? t('담김 ✓', 'Added ✓') : t('계획에 있음', 'In my plan')) : t('＋ 계획', '＋ Plan')}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>}

        {/* 과목·AP */}

        {full && data.ap.length > 0 && (
          <details className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
            <summary className="cursor-pointer select-none font-semibold text-gray-900">{t('📚 추천 AP', '📚 Recommended APs')} <span className="ml-1 text-xs font-normal text-gray-400">{t(`${data.ap.length}개 · 우선순위 순`, `${data.ap.length} · by priority`)}</span></summary>
            <ol className="mt-2 flex flex-col gap-1.5 text-sm text-gray-700">
              {data.ap.map((a, i) => (
                <li key={i} className="flex gap-2"><span className="shrink-0 font-semibold text-blue-600">{i + 1}</span><span>{a}</span></li>
              ))}
            </ol>
            {data.strong && <p className="mt-2 text-xs text-gray-500">{t('강해야 하는 과목: ', 'Must be strong in: ')}{data.strong}</p>}
          </details>
        )}

        {/* 활동 가이드 — 접힘 기본 */}
        {full && <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <button onClick={() => setGuideOpen(!guideOpen)} className="flex w-full items-center justify-between text-left">
            <span className="font-semibold text-gray-900">{t('이 전공은 활동을 이렇게 만들어요', 'How to build activities for this major')}</span>
            <span className="text-sm text-gray-400">{guideOpen ? t('접기', 'Collapse') : t('펼치기', 'Expand')}</span>
          </button>
          {guideOpen && (
            <div className="mt-3 flex flex-col gap-2.5">
              {data.guide.map((g) => {
                const warn = /함정|경고|Pitfall|Warning/.test(g.label)
                return (
                  <div key={g.label} className={`rounded-lg px-3 py-2.5 ${warn ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-semibold ${warn ? 'text-amber-800' : 'text-gray-500'}`}>{warn ? '⚠️ ' : ''}{g.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{g.text}</p>
                  </div>
                )
              })}
              <p className="text-[11px] text-gray-400">{t('편집 가이드 — 대학 공식 데이터가 아니에요.', 'Editorial guide — not official college data.')}</p>
            </div>
          )}
        </div>}

        {/* 졸업 후 진로 — BLS 공식 데이터 */}
        {CAREERS[majorKey] && CAREERS[majorKey].occupations.length > 0 && (
          <details open={!full} className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
            <summary className="cursor-pointer select-none font-semibold text-gray-900">
              {t('💼 졸업 후 진로', '💼 After graduation')}
              <span className="ml-1 text-xs font-normal text-gray-400">
                {CAREERS[majorKey].occupations[0]?.title}{CAREERS[majorKey].occupations[0]?.pay ? ` ${CAREERS[majorKey].occupations[0].pay}` : ''}{CAREERS[majorKey].occupations.length > 1 ? t(' 외', ' +more') : ''}
              </span>
            </summary>
            {CAREERS[majorKey].outlook_note_ko && getLang() === 'ko' && (
              <p className="mt-1 text-xs text-gray-500">{CAREERS[majorKey].outlook_note_ko}</p>
            )}
            <div className="mt-2 flex flex-col gap-2">
              {CAREERS[majorKey].occupations.map((o) => (
                <div key={o.title} className="rounded-lg bg-gray-50 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium text-gray-900">{o.title}</p>
                    {o.outlook && (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${o.outlook.startsWith('-') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {o.outlook} <span className="font-normal">({o.window})</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {o.pay && <>{t('중간 연봉', 'Median pay')} <strong className="text-gray-700">{o.pay}</strong> ({o.pay_year})</>}
                    {o.note && <span className="ml-1 text-amber-700">· {o.note}</span>}
                    {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 underline">BLS ↗</a>}
                  </p>
                </div>
              ))}
            </div>
            {CAREERS[majorKey].grad_note_ko && getLang() === 'ko' && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">🎓 {CAREERS[majorKey].grad_note_ko}</p>
            )}
            <p className="mt-2 text-[11px] text-gray-400">
              {t('연봉은 미국 전체 중간값(경력 전체 포함) 기준이며 지역·경력에 따라 크게 달라요. 출처: 미국 노동통계국(BLS) Occupational Outlook Handbook.', 'Pay figures are US-wide medians across all experience levels and vary widely by region and seniority. Source: US Bureau of Labor Statistics, Occupational Outlook Handbook.')}
            </p>
          </details>
        )}

        {/* 전공별 대학 순위 — US News 학부 프로그램 랭킹 (공표된 전공만) */}
        {[majorKey].filter((rk) => RANKINGS[rk]).map((rk) => (
          <details key={rk} open={!full} className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
            <summary className="cursor-pointer select-none font-semibold text-gray-900">
              {t('🏆 전공별 대학 순위', '🏆 Program rankings')} <span className="ml-1 text-xs font-normal text-gray-400">US News {RANKINGS[rk].edition}</span>
            </summary>
            <ol className="mt-2 flex flex-col gap-1 text-sm">
              {RANKINGS[rk].items.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-gray-400">#{r.rank}</span>
                  {r.school_id ? (
                    <button onClick={() => navigate(`/schools/${slugify(IDX.find((x) => x.id === r.school_id)?.name ?? r.name)}`)} className="flex min-w-0 items-center gap-1.5 text-left text-blue-700 underline-offset-2 hover:underline">
                      <SchoolLogo schoolId={r.school_id} name={r.name} size={16} /><span className="truncate">{r.name}</span>
                    </button>
                  ) : (
                    <span className="truncate text-gray-700">{r.name}</span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] text-gray-400">
              {t(`출처: U.S. News 학부 프로그램 랭킹 (${RANKINGS[rk].edition}) — 공개된 상위권만 표시돼요. 랭킹은 참고용이고, 파란 학교는 카드로 연결돼요.`, `Source: U.S. News undergraduate program rankings (${RANKINGS[rk].edition}) — only the publicly listed top schools are shown. Rankings are a reference; blue schools link to their cards.`)}
              {' '}<a href={RANKINGS[rk].url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('원본 ↗', 'Original ↗')}</a>
            </p>
          </details>
        ))}

        {/* 이 전공을 전공 단위로 뽑는 학교 (direct-admit 조사 데이터) */}
        {(() => {
          const parent = directAdmitParent(majorKey)
          const list = IDX.filter((sc) => (sc.direct_admit_majors ?? []).includes(parent ?? ''))
          if (list.length === 0) return null
          return (
            <details open={!full} className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
              <summary className="cursor-pointer select-none font-semibold text-gray-900">{t('🏛️ 전공 단위로 뽑는 학교', '🏛️ Schools admitting by major')} <span className="ml-1 text-xs font-normal text-gray-400">{list.length}{t('곳', '')}</span></summary>
              <p className="mt-0.5 text-xs text-gray-500">{t('지원할 때 전공을 정해 내는 학교들 — 경쟁률이 학교 전체 합격률과 다르고 전과가 어려울 수 있어요. 각 학교 카드에서 확인하세요.', 'These schools admit into the major at application time — competitiveness differs from the overall rate and switching in can be hard. Check each school card.')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {list.map((sc) => (
                  <button key={sc.id} onClick={() => navigate(`/schools/${slugify(sc.name)}`)} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 active:bg-gray-50">
                    <SchoolLogo schoolId={sc.id} name={sc.name} size={16} />{sc.name}
                  </button>
                ))}
              </div>
            </details>
          )
        })()}

        {!full && (
          <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-4">
            <p className="text-sm font-semibold text-blue-900">{t('이 전공, 나랑 맞을까?', 'Is this major right for me?')}</p>
            <p className="mt-0.5 text-xs text-blue-800">{t('학년별 로드맵·추천 AP·활동 전략은 내 학년에 맞춘 리포트에서 볼 수 있어요.', 'The year-by-year roadmap, recommended APs and activity strategy live in your personalized report.')}</p>
            {userId ? (
              <button onClick={() => setFull(true)} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700">
                {t('🧭 전체 가이드 보기 (로드맵·AP·활동)', '🧭 See the full guide (roadmap · APs · activities)')}
              </button>
            ) : (
              <button onClick={() => navigate('/')} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700">
                {t('내 리포트 받기 (3분)', 'Get my report (3 min)')}
              </button>
            )}
          </div>
        )}

        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400">{t('다른 전공 보기', 'Other majors')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {otherMajors.map((m) => (
              <button key={m.value} onClick={() => navigate(`/major/${m.value}`)} className="rounded-full border-2 border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                {getLang() === 'ko' ? m.label.split(' (')[0] : majorDisplay(m)}
              </button>
            ))}
            {majorKey !== 'undecided' && (
              <button onClick={() => navigate('/major/undecided')} className="rounded-full border-2 border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">{t('미정', 'Undecided')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
