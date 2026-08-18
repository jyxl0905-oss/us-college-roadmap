import type { Axis, AxisScores } from '../lib/score'
import { axisOrder } from '../lib/score'
import { supabase } from '../lib/supabase'

// F6 내 계획 — 시즌별 계획 항목(축 태그). 리포트 6축에 "계획 반영 시" 점선으로 반영.
// 규칙: 계획 항목 1개당 해당 축 +10 (체크리스트 체크 가산과 동일), 완료(done)는 이미 실선에 반영된 것으로 보고 점선에서 제외

export type PlanStatus = 'planned' | 'doing' | 'done'
export interface Plan {
  id: number
  title: string
  axis: Axis
  season_label: string
  status: PlanStatus
  notes: string | null
}

export const PLAN_BONUS = 10

export const planStatusKo: Record<PlanStatus, string> = { planned: '계획', doing: '진행 중', done: '완료' }
export const nextStatus: Record<PlanStatus, PlanStatus> = { planned: 'doing', doing: 'done', done: 'planned' }

// 축 짧은 라벨 (칩용 — 글자 수 최소)
export const axisShort: Record<Axis, string> = {
  rigor: '학업', testing: '시험', spike: '대표활동', leadership: '리더십', validation: '교외인정', story: '스토리',
}

// 이번 학년도의 시즌 3개 (미국 학년도: 가을 → 봄 → 여름)
export function cycleSeasons(now: Date = new Date()): { label: string; ko: string }[] {
  const y = now.getFullYear(), m = now.getMonth() + 1
  const fallYear = m >= 8 ? y : y - 1
  return [
    { label: `${fallYear}-fall`, ko: '가을' },
    { label: `${fallYear + 1}-spring`, ko: '봄' },
    { label: `${fallYear + 1}-summer`, ko: '여름' },
  ]
}

// 계획 반영 시 예상 점수 (미완료 항목만 가산)
export function plannedScores(current: AxisScores, plans: Plan[]): AxisScores {
  const out = { ...current }
  for (const a of axisOrder) {
    const n = plans.filter((p) => p.axis === a && p.status !== 'done').length
    out[a] = Math.min(100, current[a] + n * PLAN_BONUS)
  }
  return out
}

export async function loadPlans(userId: string): Promise<Plan[]> {
  if (!supabase) return []
  const { data } = await supabase.from('plans').select('id,title,axis,season_label,status,notes').eq('user_id', userId).order('id')
  return (data ?? []) as Plan[]
}
