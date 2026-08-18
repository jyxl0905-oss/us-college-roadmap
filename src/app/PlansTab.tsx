import { useEffect, useState } from 'react'
import AppShell from './AppShell'
import { t } from '../i18n'
import { insertRow, updateRow, deleteRow } from './appData'
import { loadPlans, cycleSeasons, axisShort, planStatusKo, nextStatus, PLAN_BONUS, type Plan } from './plans'
import { axisOrder, type Axis } from '../lib/score'
import { currentSeasonLabel } from '../lib/academics'
import { navigate } from '../lib/router'

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
  const [season, setSeason] = useState(() => {
    const cur = currentSeasonLabel()
    return seasons.some((s) => s.label === cur) ? cur : seasons[0].label
  })

  useEffect(() => {
    loadPlans(userId).then(setPlans)
  }, [userId])

  if (!plans) return <AppShell tab="plans" title={t('내 계획', 'My plans')}><p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p></AppShell>

  const add = async () => {
    const text = title.trim()
    if (!text) return
    const row = await insertRow<Plan>('plans', userId, { title: text, axis, season_label: season, status: 'planned', notes: null })
    if (row) setPlans([...plans, row])
    setTitle('')
  }
  const cycle = async (p: Plan) => {
    const status = nextStatus[p.status]
    setPlans(plans.map((x) => (x.id === p.id ? { ...x, status } : x)))
    await updateRow<Plan>('plans', p.id, { status })
  }
  const remove = async (id: number) => {
    await deleteRow('plans', id)
    setPlans(plans.filter((x) => x.id !== id))
  }

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
        className="mt-2 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 active:bg-blue-100"
      >
        {t('🗺️ 전공 가이드 맵에서 골라 담기', '🗺️ Pick from the major guide map')}
      </button>

      {/* 입력 */}
      <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-3.5 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
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
              {list.length === 0 && <p className="text-xs text-gray-300">—</p>}
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
                  <span className="shrink-0 text-[11px] text-gray-400">{axisShort[p.axis]}</span>
                  <button onClick={() => remove(p.id)} aria-label={t('삭제', 'Delete')} className="shrink-0 text-gray-300 active:text-red-500">✕</button>
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
                <button onClick={() => remove(p.id)} aria-label={t('삭제', 'Delete')} className="text-gray-300 active:text-red-500">✕</button>
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
