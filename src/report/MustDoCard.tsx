import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { t } from '../i18n'
import { currentSeason } from '../lib/academics'
import { MUST_DO, mustDoRank } from '../data/mustDo'

// 11학년 봄 ~ 12학년: 리포트 상단 '꼭 체크' 카드. 현재 시즌 항목 + 아직 안 한 이전 항목. 완료는 milestones 테이블.
export default function MustDoCard({ userId, grade }: { userId: string; grade: number }) {
  const [done, setDone] = useState<Set<string> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.from('milestones').select('key').eq('user_id', userId).then(({ data }) => setDone(new Set((data ?? []).map((r) => r.key))))
  }, [userId])

  const nowRank = mustDoRank({ grade: grade as 11 | 12, season: currentSeason() })
  const items = MUST_DO.filter((m) => mustDoRank(m) <= nowRank).sort((a, b) => mustDoRank(a) - mustDoRank(b))
  if (items.length === 0 || done === null) return null
  const current = items.filter((m) => mustDoRank(m) === nowRank)
  const overdue = items.filter((m) => mustDoRank(m) < nowRank && !done.has(m.key))
  const show = [...overdue, ...current]
  if (show.length === 0) return null
  const doneCount = show.filter((m) => done.has(m.key)).length

  const toggle = async (key: string) => {
    if (!supabase || busy) return
    setBusy(key)
    const was = done.has(key)
    const next = new Set(done); was ? next.delete(key) : next.add(key)
    setDone(next)
    const { error } = was
      ? await supabase.from('milestones').delete().eq('user_id', userId).eq('key', key)
      : await supabase.from('milestones').insert({ user_id: userId, key })
    if (error) { setDone(done); alert(t('저장 실패: ', 'Save failed: ') + error.message) }
    setBusy(null)
  }

  return (
    <div className="no-print mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-amber-900">📌 {t(`${grade}학년 꼭 체크`, `Grade ${grade} must-dos`)}</p>
        <span className="text-xs text-amber-700">{doneCount}/{show.length}</span>
      </div>
      <p className="mt-0.5 text-xs text-amber-700">{t('시즌 체크리스트와 별개로, 이 시기에 놓치면 되돌리기 어려운 것만 모았어요.', 'Separate from the season checklist — only the things that are hard to undo if missed now.')}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {show.map((m) => {
          const isDone = done.has(m.key)
          const late = mustDoRank(m) < nowRank
          return (
            <li key={m.key} className={`rounded-xl bg-white px-3 py-2.5 ${isDone ? 'opacity-60' : ''}`}>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={isDone} onChange={() => toggle(m.key)} disabled={busy === m.key} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium text-gray-900 ${isDone ? 'line-through' : ''}`}>
                    {m.title()}
                    {late && !isDone && <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{t('지난 시즌', 'from last season')}</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">{m.why()}</span>
                  {m.to && !isDone && (
                    <button onClick={() => navigate(m.to!)} className="mt-1 text-xs font-semibold text-blue-600 underline">{t('바로 가기 →', 'Go →')}</button>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
