import { PageSkeleton } from '../ui/Skeleton'
import { Compass, X, Trophy, ExternalLink, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import AppShell from './AppShell'
import { t } from '../i18n'
import { insertRow, updateRow, deleteRow } from './appData'
import { loadPlans, cycleSeasons, axisShort, planStatusKo, nextStatus, PLAN_BONUS, type Plan } from './plans'
import { axisOrder, type Axis } from '../lib/score'
import { currentSeasonLabel } from '../lib/academics'
import { navigate } from '../lib/router'
import { programPlanRow, programKeyOf, type ProgramLite } from './programPlan'
import { majorParent } from '../data/majors'

interface ProgramSuggest extends ProgramLite { majors: string[]; intl_eligibility: string | null; what_ko: string; what_en: string }

interface PlansTabProps {
  userId: string
  majorKey?: string | null
}

// F6 내 계획 — 텍스트 최소: 한 줄 입력 + 축 칩 + 시즌 칩. 리포트 6축에 점선으로 반영
export default function PlansTab({ userId, majorKey }: PlansTabProps) {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const seasons = cycleSeasons()
  const [title, setTitle] = useState('')
  const [axis, setAxis] = useState<Axis>('spike')
  const busyRef = useRef(false) // Enter 연타·더블탭 중복 추가 방지
  const [season, setSeason] = useState(() => {
    const cur = currentSeasonLabel()
    return seasons.some((s) => s.label === cur) ? cur : seasons[0].label
  })

  const [programs, setPrograms] = useState<ProgramSuggest[]>([])

  useEffect(() => {
    loadPlans(userId).then(setPlans)
    // 여름 계획 추천용 — 대회·서머 가이드 데이터 (필요할 때만 불러옴)
    import('../data/programs.json').then((m) => setPrograms((m.default as { programs: ProgramSuggest[] }).programs))
  }, [userId])

  if (!plans) return <AppShell tab="plans" title={t('내 계획', 'My plans')}><PageSkeleton compact /></AppShell>

  const add = async () => {
    const text = title.trim()
    if (!text || busyRef.current) return
    busyRef.current = true
    try {
      const row = await insertRow<Plan>('plans', userId, { title: text, axis, season_label: season, status: 'planned', notes: null })
      if (row) setPlans([...plans, row])
      setTitle('')
    } catch { /* insertRow가 이미 alert — 입력값 유지 */ } finally { busyRef.current = false }
  }
  const cycle = async (p: Plan) => {
    const status = nextStatus[p.status]
    const before = plans
    setPlans(plans.map((x) => (x.id === p.id ? { ...x, status } : x))) // 낙관적 갱신
    try {
      await updateRow<Plan>('plans', p.id, { status })
    } catch {
      setPlans(before) // 실패 시 되돌림 (updateRow가 이미 alert)
    }
  }
  const remove = async (id: number) => {
    try {
      await deleteRow('plans', id)
      setPlans(plans.filter((x) => x.id !== id))
    } catch { /* deleteRow가 이미 alert */ }
  }

  const addProgram = async (p: ProgramLite, seasonLabel: string) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const row = await insertRow<Plan>('plans', userId, programPlanRow(p, seasonLabel))
      if (row) setPlans([...plans, row])
    } catch { /* insertRow가 알림 */ } finally { busyRef.current = false }
  }
  // 내 전공에 맞는 서머 프로그램 (국제학생 참가 가능한 것 먼저, 이미 담은 것 제외) — 최대 3개
  const parent = majorParent(majorKey ?? null)
  const summerLabel = seasons[2].label
  const summerSuggest = programs
    .filter((p) => p.type === 'summer' && p.intl_eligibility !== 'us_only')
    .filter((p) => !majorKey || majorKey === 'undecided' || p.majors.includes(majorKey) || (parent != null && p.majors.includes(parent)))
    .filter((p) => !plans.some((x) => programKeyOf(x.ref) === p.key))
    .sort((a, b) => Number(a.intl_eligibility !== 'open') - Number(b.intl_eligibility !== 'open'))
    .slice(0, 3)

  const active = plans.filter((p) => p.status !== 'done')
  const chip = (on: boolean) =>
    `rounded-full border-2 px-2.5 py-1 text-xs font-medium ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600'}`

  return (
    <AppShell tab="plans" title={t('내 계획', 'My plans')}>
      <p className="mt-2 text-xs text-gray-500">
        {t('적은 계획은 리포트 6축에 ', 'Plans you add show up on the 6 axes of your report as a ')}<span className="font-semibold text-blue-700">{t('점선', 'dashed line')}</span>{t(`으로 표시돼요 (항목당 +${PLAN_BONUS}). 완료로 바꾸면 실선으로.`, ` (+${PLAN_BONUS} per item). Mark them done and they become solid.`)}
      </p>
      <button
        onClick={() => navigate(`/major/${majorKey ?? 'undecided'}`)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 active:bg-blue-100"
      >
        <Compass size={16} strokeWidth={2} />{t('전공 가이드 맵에서 골라 담기', 'Pick from the major guide map')}
      </button>
      <button
        onClick={() => navigate(`/guide/programs${majorKey ? `?major=${majorKey}` : ''}`)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 active:bg-amber-100"
      >
        <Trophy size={16} strokeWidth={2} />{t('대회·서머 프로그램에서 골라 담기', 'Pick competitions & summer programs')}
      </button>

      {/* 입력 */}
      <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-3.5 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add() }}
          placeholder={t('예: USACO Bronze 응시', 'e.g. Take USACO Bronze')}
          className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {axisOrder.map((a) => (
            <button key={a} onClick={() => setAxis(a)} className={chip(axis === a)}>{axisShort[a]}</button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {seasons.map((s) => (
            <button key={s.label} onClick={() => setSeason(s.label)} className={chip(season === s.label)}>{s.ko}</button>
          ))}
          <button onClick={add} disabled={!title.trim()} className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:bg-gray-300">
            {t('추가', 'Add')}
          </button>
        </div>
      </div>

      {/* 시즌별 목록 */}
      {seasons.map((s) => {
        const list = plans.filter((p) => p.season_label === s.label)
        return (
          <div key={s.label} className="mt-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-gray-900">{s.ko}</h2>
              <span className="text-xs text-gray-400">{list.filter((p) => p.status === 'done').length}/{list.length}</span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {list.length === 0 && s.label !== summerLabel && <p className="text-xs text-gray-300">—</p>}
              {s.label === summerLabel && !list.some((p) => p.status !== 'done') && summerSuggest.length > 0 && (
                <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-xs font-semibold text-amber-900"><Sun size={13} />{t('여름 계획이 비어 있어요 — 내 전공 서머 프로그램', 'Your summer is empty — summer programs for your major')}</p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {summerSuggest.map((p) => (
                      <li key={p.key} className="flex items-start gap-2">
                        <button onClick={() => navigate(`/guide/programs?open=${p.key}`)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-[13px] font-semibold text-gray-900">{p.name}</span>
                          <span className="line-clamp-1 text-[11px] text-gray-500">{t(p.what_ko, p.what_en)}</span>
                        </button>
                        <button onClick={() => addProgram(p, summerLabel)} className="shrink-0 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 active:bg-amber-100">{t('＋ 여름에 담기', '＋ Add')}</button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[10.5px] text-gray-400">{t('지원 시기·국제학생 참가 조건은 프로그램 이름을 눌러 확인하세요. 지원 준비는 가을·봄에 따로 담을 수 있어요.', 'Tap a name for application timing and international eligibility. You can add the application step to fall or spring separately.')}</p>
                </div>
              )}
              {list.map((p) => (
                <div key={p.id} className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 ${p.status === 'done' ? 'border-gray-100' : 'border-gray-200'}`}>
                  <button
                    onClick={() => cycle(p)}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      p.status === 'done' ? 'bg-green-100 text-green-700' : p.status === 'doing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}
                    title={t('탭해서 상태 바꾸기', 'Tap to change status')}
                  >
                    {planStatusKo[p.status]}
                  </button>
                  <span className={`min-w-0 flex-1 truncate text-sm ${p.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{p.title}</span>
                  {programKeyOf(p.ref) && (
                    <button onClick={() => navigate(`/guide/programs?open=${programKeyOf(p.ref)}`)} aria-label={t('프로그램 정보 보기', 'View program')} title={p.notes ?? undefined} className="shrink-0 text-amber-600 active:text-amber-800"><ExternalLink size={14} strokeWidth={2} /></button>
                  )}
                  <span className="shrink-0 text-[11px] text-gray-400">{axisShort[p.axis]}</span>
                  <button onClick={() => remove(p.id)} aria-label={t('삭제', 'Delete')} className="shrink-0 text-gray-300 active:text-red-500"><X size={16} strokeWidth={2} /></button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* 예전 시즌 미완료 */}
      {plans.some((p) => !seasons.some((s) => s.label === p.season_label)) && (
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-gray-500">{t('지난 학년도', 'Previous school years')}</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {plans.filter((p) => !seasons.some((s) => s.label === p.season_label)).map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border-2 border-gray-100 bg-white px-3 py-2">
                <button onClick={() => cycle(p)} className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{planStatusKo[p.status]}</button>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{p.title}</span>
                <span className="text-[11px] text-gray-400">{p.season_label}</span>
                <button onClick={() => remove(p.id)} aria-label={t('삭제', 'Delete')} className="text-gray-300 active:text-red-500"><X size={16} strokeWidth={2} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <p className="mt-6 text-center text-xs text-gray-400">{t('계획을 하나 적으면 리포트 차트에 점선이 생겨요.', 'Add one plan and a dashed line appears on your report chart.')}</p>
      )}
    </AppShell>
  )
}
