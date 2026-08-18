import { useState } from 'react'
import { axisOrder, axisKo, type Axis, type AxisScores } from '../lib/score'
import { t, bilingual } from '../i18n'

// 시즌별 성장 그래프 — reports 스냅샷(6축 점수·완료율)을 시즌 순으로 선 그래프. SVG 직접 렌더(라이브러리 없음)
export interface SeasonPoint {
  season_label: string // '2026-fall'
  scores: Partial<AxisScores>
  done: number
  total: number
  plans?: { done: number; total: number } // F6 계획 달성률 (있는 시즌만)
}

const seasonOrder: Record<string, number> = { spring: 1, summer: 2, fall: 3 }
const seasonShort: Record<string, string> = bilingual(
  { spring: '봄', summer: '여름', fall: '가을' },
  { spring: 'Spr', summer: 'Sum', fall: 'Fall' },
)

export function sortSeasons(points: SeasonPoint[]): SeasonPoint[] {
  return [...points].sort((a, b) => {
    const [ya, sa] = a.season_label.split('-')
    const [yb, sb] = b.season_label.split('-')
    return Number(ya) - Number(yb) || (seasonOrder[sa] ?? 0) - (seasonOrder[sb] ?? 0)
  })
}

function shortLabel(label: string): string {
  const [y, s] = label.split('-')
  return `${y.slice(2)}' ${seasonShort[s] ?? s}`
}

const AXIS_COLORS: Record<Axis, string> = {
  rigor: '#2563eb', testing: '#7c3aed', spike: '#db2777', leadership: '#ea580c', validation: '#16a34a', story: '#0891b2',
}

const W = 320, H = 170, PAD_L = 28, PAD_R = 24, PAD_T = 14, PAD_B = 26

export default function GrowthChart({ points }: { points: SeasonPoint[] }) {
  const sorted = sortSeasons(points).filter((p) => p.scores && Object.keys(p.scores).length > 0)
  const [active, setActive] = useState<Axis | 'done' | 'plans'>('done')
  const hasPlans = sorted.some((p) => p.plans && p.plans.total > 0)

  if (sorted.length < 2) {
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
        {sorted.length === 0
          ? t('첫 시즌 기록이 쌓이는 중이에요.', 'Your first season record is being built.')
          : t('다음 시즌에 돌아오면 이번 시즌과 비교한 성장선이 여기 그려져요.', 'Come back next season and your growth line vs. this season will appear here.')}
      </p>
    )
  }

  const n = sorted.length
  const x = (i: number) => PAD_L + ((W - PAD_L - PAD_R) * i) / Math.max(1, n - 1)
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - Math.max(0, Math.min(100, v)) / 100)
  const seriesFor = (key: Axis | 'done' | 'plans') =>
    sorted.map((p) =>
      key === 'done'
        ? (p.total > 0 ? Math.round((p.done / p.total) * 100) : 0)
        : key === 'plans'
          ? (p.plans && p.plans.total > 0 ? Math.round((p.plans.done / p.plans.total) * 100) : 0)
          : (p.scores[key] ?? 0),
    )
  const values = seriesFor(active)
  const color = active === 'done' ? '#111827' : active === 'plans' ? '#4b5563' : AXIS_COLORS[active]
  const first = values[0], last = values[values.length - 1]
  const delta = last - first

  const chip = (key: Axis | 'done' | 'plans', label: string, c: string) => (
    <button
      key={key}
      onClick={() => setActive(key)}
      className={`rounded-full border-2 px-2 py-0.5 text-[11px] font-medium ${
        active === key ? 'text-white' : 'bg-white text-gray-500'
      }`}
      style={active === key ? { backgroundColor: c, borderColor: c } : { borderColor: '#e5e7eb' }}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {chip('done', t('완료율', 'Completion'), '#111827')}
        {hasPlans && chip('plans', t('계획 달성', 'Plans done'), '#4b5563')}
        {axisOrder.map((a) => chip(a, axisKo[a], AXIS_COLORS[a]))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={t('시즌별 성장 그래프', 'Growth by season')}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(g) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{g}</text>
          </g>
        ))}
        <polyline
          points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        />
        {values.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />
            <text x={x(i)} y={y(v) - 8} fontSize="9" fill={color} textAnchor="middle" fontWeight="600">{v}</text>
            <text x={x(i)} y={H - 8} fontSize="9" fill="#6b7280" textAnchor="middle">{shortLabel(sorted[i].season_label)}</text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-xs text-gray-500">
        {active === 'done' ? t('시즌 완료율', 'Season completion') : active === 'plans' ? t('계획 달성률', 'Plan completion') : t(`${axisKo[active]} 축`, `${axisKo[active]} axis`)}: {t('첫 기록', 'First')} {first} → {t('지금', 'Now')} {last}
        {delta !== 0 && (
          <span className={`ml-1 font-semibold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            ({delta > 0 ? '+' : ''}{delta})
          </span>
        )}
      </p>
    </div>
  )
}
