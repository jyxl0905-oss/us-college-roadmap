import type { Axis } from '../lib/score'
import type { Plan } from './plans'
import { t } from '../i18n'

// 대회·서머 프로그램 → 내 계획 항목 (계획 탭 ↔ /guide/programs 연결)
// 축: 대회 = 교외 인정(validation), 서머 = 대표활동(spike) — 학생이 계획 탭에서 바꿀 수 있음
export interface ProgramLite { key: string; name: string; type: 'competition' | 'summer' | 'event'; timing_ko: string | null; timing_en: string | null }

export const programRef = (key: string) => `program:${key}`
export const programKeyOf = (ref: string | null | undefined) => (ref?.startsWith('program:') ? ref.slice(8) : null)

export function programPlanRow(p: ProgramLite, season_label: string): Omit<Plan, 'id'> {
  const summer = season_label.endsWith('-summer')
  const prefix = p.type === 'competition' ? t('대회', 'Contest') : summer ? t('참가', 'Attend') : t('지원', 'Apply to')
  const axis: Axis = p.type === 'competition' ? 'validation' : 'spike'
  const timing = t(p.timing_ko ?? '', p.timing_en ?? p.timing_ko ?? '')
  return { title: `${prefix}: ${p.name}`.slice(0, 200), axis, season_label, status: 'planned', notes: timing ? timing.slice(0, 500) : null, ref: programRef(p.key) }
}
