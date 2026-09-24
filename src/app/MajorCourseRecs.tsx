import { useEffect, useState } from 'react'
import { Check, Clock, Circle, Pin, Info } from 'lucide-react'
import { t, getLang } from '../i18n'
import { navigate } from '../lib/router'
import { majorLabel } from '../data/majors'
import { majorCoursePlan, type RoadmapMajor, type MajorPlan, type ApItemStatus } from '../lib/majorCoursePlan'
import type { CourseInput } from '../lib/courseRecs'

// 전공 맞춤 다음 학년 수업 추천 — 전공 가이드 맵의 추천 AP를 내 기록과 대조해 "이수 / 수강 중 / 아직" 표시 + 다음 학년 학업 로드맵
type Data = Record<string, RoadmapMajor>
let cache: Promise<[Data, Data]> | null = null
const load = () => (cache ??= Promise.all([import('../data/major-roadmaps.json'), import('../data/major-roadmaps.en.json')]).then(([ko, en]) => [ko.default as unknown as Data, en.default as unknown as Data]))

const STATUS: Record<ApItemStatus, { ko: string; en: string; cls: string; icon: typeof Check }> = {
  done: { ko: '이수', en: 'Done', cls: 'bg-emerald-50 text-emerald-700', icon: Check },
  now: { ko: '수강 중', en: 'Taking', cls: 'bg-blue-50 text-blue-700', icon: Clock },
  partial: { ko: '일부만', en: 'Partly', cls: 'bg-sky-50 text-sky-700', icon: Clock },
  todo: { ko: '추천', en: 'Suggested', cls: 'bg-amber-50 text-amber-800', icon: Circle },
  later: { ko: '수학 단계 후', en: 'After math prereqs', cls: 'bg-gray-100 text-gray-500', icon: Circle },
  info: { ko: '참고', en: 'Note', cls: 'bg-gray-100 text-gray-500', icon: Info },
}

export default function MajorCourseRecs({ courses, grade, major }: { courses: CourseInput[]; grade: number; major: string | null }) {
  const [plan, setPlan] = useState<MajorPlan | null>(null)
  const [en, setEn] = useState<Data | null>(null)
  useEffect(() => {
    let alive = true
    void load().then(([ko, enData]) => { if (alive) { setPlan(majorCoursePlan(courses, grade, major, ko)); setEn(enData) } })
    return () => { alive = false }
  }, [courses, grade, major])

  if (!major || major === 'undecided') {
    return (
      <p className="text-xs text-gray-600">{t('전공을 정하면 전공 맞춤 추천 AP도 보여드려요.', 'Pick a major to see major-specific AP suggestions.')} <button onClick={() => navigate('/majors')} className="font-medium text-blue-600 underline">{t('전공 알아보기 →', 'Explore majors →')}</button></p>
    )
  }
  if (!plan) return null
  const isEn = getLang() === 'en'
  const enItem = (i: number) => en?.[plan.roadmapKey]?.ap?.[i]
  const next = Math.min(12, grade + 1)
  const nextEn = en?.[plan.roadmapKey]?.roadmap?.[String(next)]?.academic ?? []
  const todo = plan.items.filter((x) => x.status === 'todo').length

  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">
        {t(`${majorLabel(major)} 지망 — 추천 AP`, `${majorLabel(major)} — suggested APs`)}
        <span className="ml-1.5 text-[11px] font-normal text-gray-500">{todo > 0 ? t(`아직 안 들은 추천 과목 ${todo}개`, `${todo} not taken yet`) : t('추천 과목을 모두 듣고 있어요', 'You’re covering them all')}</span>
      </p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {plan.items.map((it, i) => {
          const S = STATUS[it.status]
          const Icon = S.icon
          const raw = isEn ? enItem(i) : null
          const [head, why] = raw ? [raw.split(' — ')[0], raw.split(' — ').slice(1).join(' — ') || null] : [it.head, it.why]
          return (
            <li key={i} className="flex items-start gap-2 text-[13px]">
              <span className={`mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${S.cls}`}><Icon size={11} strokeWidth={2.5} />{t(S.ko, S.en)}</span>
              <span className="min-w-0 text-gray-800">
                <span className={it.status === 'done' || it.status === 'now' ? 'text-gray-500' : 'font-medium'}>{head}</span>
                {it.matched.length > 0 && <span className="ml-1 text-[11px] text-gray-400">({it.matched.join(', ')})</span>}
                {why && (it.status === 'todo' || it.status === 'later') && <span className="block text-[11.5px] leading-snug text-gray-500">{why}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {plan.nextAcademic.length > 0 && (
        <div className="mt-2.5 rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-gray-500">{t(`${majorLabel(major)} 로드맵 · ${next}학년 학업`, `${majorLabel(major)} roadmap · grade ${next} academics`)}</p>
          <ul className="mt-0.5 flex flex-col gap-0.5 text-[12.5px] text-gray-700">
            {(isEn && nextEn.length ? nextEn : plan.nextAcademic).map((a, i) => <li key={i}>• {a}</li>)}
          </ul>
        </div>
      )}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-gray-400">
        <span><Pin size={10} className="mr-0.5 inline -mt-0.5" />{t('전공 가이드 맵 기준 편집 가이드 · 학교에 개설된 과목 안에서 고르세요', 'Editorial guide from the major guide map · choose within your school’s offerings')}</span>
        <button onClick={() => navigate(`/major/${major}`)} className="text-blue-600 underline">{t('전공 가이드 전체 보기 →', 'Full major guide →')}</button>
      </p>
    </div>
  )
}
