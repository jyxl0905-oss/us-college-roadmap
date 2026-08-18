import { useEffect, useState } from 'react'
import roadmaps from '../data/major-roadmaps.json'
import roadmapsEn from '../data/major-roadmaps.en.json'
import { majorLabel, majorCategories } from '../data/majors'
import { profileGrade, type ProfileRow } from '../lib/profile'
import { navigate } from '../lib/router'
import { currentSeasonLabel } from '../lib/academics'
import { insertRow } from '../app/appData'
import { loadPlans, cycleSeasons, type Plan } from '../app/plans'
import type { Axis } from '../lib/score'
import { t, getLang } from '../i18n'

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
  const data = DATA[majorKey]
  const myGrade = profile ? profileGrade(profile) : 9
  const [openGrade, setOpenGrade] = useState<number>(myGrade)
  const [guideOpen, setGuideOpen] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [added, setAdded] = useState<string | null>(null)

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
    const cur = currentSeasonLabel()
    const seasons = cycleSeasons()
    const season = seasons.some((s) => s.label === cur) ? cur : seasons[0].label
    const row = await insertRow<Plan>('plans', userId, { title, axis, season_label: season, status: 'planned', notes: null })
    if (row) {
      setPlans([...plans, row])
      setAdded(title)
      setTimeout(() => setAdded(null), 1200)
    }
  }

  const otherMajors = majorCategories.filter((m) => m.value !== majorKey)

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{majorLabel(majorKey)}</h1>
            <p className="text-xs text-gray-400">{t('전공 가이드 맵 · 4년 로드맵 (편집 가이드)', 'Major guide map · 4-year roadmap (editorial guide)')}</p>
          </div>
        </div>

        {/* 4년 로드맵 — 학년 아코디언, 내 학년 펼침 */}
        <div className="mt-4 flex flex-col gap-2">
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
        </div>

        {/* 과목·AP */}
        {data.ap.length > 0 && (
          <div className="mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
            <p className="font-semibold text-gray-900">{t('추천 AP', 'Recommended APs')} <span className="ml-1 text-xs font-normal text-gray-400">{t('우선순위 순', 'by priority')}</span></p>
            <ol className="mt-2 flex flex-col gap-1.5 text-sm text-gray-700">
              {data.ap.map((a, i) => (
                <li key={i} className="flex gap-2"><span className="shrink-0 font-semibold text-blue-600">{i + 1}</span><span>{a}</span></li>
              ))}
            </ol>
            {data.strong && <p className="mt-2 text-xs text-gray-500">{t('강해야 하는 과목: ', 'Must be strong in: ')}{data.strong}</p>}
          </div>
        )}

        {/* 활동 가이드 — 접힘 기본 */}
        <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
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
        </div>

        {/* 다른 전공 */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400">{t('다른 전공 보기', 'Other majors')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {otherMajors.map((m) => (
              <button key={m.value} onClick={() => navigate(`/major/${m.value}`)} className="rounded-full border-2 border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                {m.label.split(' (')[0]}
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
