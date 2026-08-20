import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { t } from '../i18n'
import { appTabs } from '../app/AppShell'

// 데스크톱 리포트 사이드 패널 — 내 원서(가상 Common App) 각 탭의 기록 수와 바로가기.
// "굳이 눌러 들어가지 않는다"는 피드백에 대한 답: 리포트 옆에 항상 보이게.
export default function QuickAppPanel({ userId }: { userId: string }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    if (!supabase) return
    const head = (table: string) =>
      supabase!.from(table).select('*', { count: 'exact', head: true }).eq('user_id', userId)
    Promise.all([
      head('plans'), head('activities'), head('test_scores'), head('courses'), head('applications'), head('essays'), head('honors'),
    ]).then(([pl, ac, ts, co, ap, es, ho]) => {
      setCounts({
        plans: pl.count ?? 0,
        activities: (ac.count ?? 0),
        honors: ho.count ?? 0,
        testing: ts.count ?? 0,
        education: co.count ?? 0,
        colleges: ap.count ?? 0,
        writing: es.count ?? 0,
      })
    })
  }, [userId])

  const rows = appTabs.filter((tab) => tab.key !== 'home')
  const countFor = (key: string): string => {
    if (!counts) return ''
    if (key === 'activities') return String(counts.activities + counts.honors)
    return String(counts[key] ?? 0)
  }

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-gray-900">📋 {t('내 원서', 'My application')}</p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">{t('가상 Common App', 'virtual Common App')}</span>
      </div>
      <div className="mt-2 flex flex-col">
        {rows.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-blue-50"
          >
            <span>{tab.emoji}</span>
            <span className="flex-1">{tab.label}</span>
            <span className="tabular-nums text-xs text-gray-400">{countFor(tab.key)}</span>
            <span className="text-gray-300">›</span>
          </button>
        ))}
      </div>
      <button onClick={() => navigate('/app')} className="mt-2 w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        {t('내 원서 열기', 'Open my application')}
      </button>
    </div>
  )
}
