import { useState } from 'react'
import { Receipt, ChevronDown } from 'lucide-react'
import { t } from '../i18n'
import { navigate } from '../lib/router'
import costData from '../data/cost.json'

// 1년 예상 비용 (국제학생, 기숙사 거주 신입생) — 학교 공식 Cost of Attendance / CDS 기준 (2026-09-24 확인, 사용자 승인)
export interface CostRow {
  id: number
  year: string | null
  tuition: number | null
  fees: number | null
  housing_food: number | null
  books: number | null
  personal_other: number | null
  living?: number | null // 학교가 생활비를 한 덩어리로만 공개할 때 (UT Austin)
  public: boolean | null
  source_url: string
  total: number | null
  basis: 'intl' | 'official' | 'sum' | 'after_scholarship' | 'off_campus' | null
}

export const costRows = (costData as { schools: CostRow[] }).schools
const byId = new Map(costRows.map((r) => [r.id, r]))
export const costFor = (id: number): CostRow | undefined => byId.get(id)

export const money = (n: number) => `$${n.toLocaleString('en-US')}`

export function basisLabel(b: CostRow['basis']): string {
  switch (b) {
    case 'intl': return t('국제학생 공식 예산', 'Official intl. budget')
    case 'official': return t('학교 공식 총액', 'Official total')
    case 'sum': return t('공식 항목 합계', 'Sum of official items')
    case 'after_scholarship': return t('전원 반액 장학금 적용 후', 'After universal half-tuition scholarship')
    case 'off_campus': return t('기숙사 밖 거주 기준', 'Off-campus budget')
    default: return ''
  }
}

// 항목별 내역 (학비·수수료·기숙사와 식비·교재·기타) + 합계
// 항목 합과 총액이 다르면(건강보험·국제학생 수수료 등 별도 항목) 차액을 '그 외'로 보여줌
export function CostBreakdown({ r }: { r: CostRow }) {
  const scholarship = r.basis === 'after_scholarship' && r.tuition ? -Math.round(r.tuition / 2) : null
  const items: [string, number | null][] = [
    [r.public ? t('학비 (타주·국제)', 'Tuition (nonresident)') : t('학비', 'Tuition'), r.tuition],
    [t('반액 장학금 (전원)', 'Half-tuition scholarship (all students)'), scholarship],
    [t('필수 수수료', 'Required fees'), r.fees],
    [t('기숙사·식비', 'Housing & food'), r.housing_food],
    [t('생활비 (주거·식비·교재 등)', 'Living expenses (housing, food, books…)'), r.living ?? null],
    [t('교재·준비물', 'Books & supplies'), r.books],
    [t('개인·교통 등', 'Personal & travel'), r.personal_other],
  ]
  const shown = items.filter(([, v]) => v != null) as [string, number][]
  const diff = (r.total ?? 0) - shown.reduce((a, [, v]) => a + v, 0)
  const fmt = (v: number) => (v < 0 ? `−${money(-v)}` : money(v))
  return (
    <div className="flex flex-col gap-1 text-sm">
      {shown.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-3 text-gray-600"><span>{k}</span><span className={`font-medium tabular-nums ${v < 0 ? 'text-emerald-700' : 'text-gray-800'}`}>{fmt(v)}</span></p>
      ))}
      {diff > 0 && (
        <p className="flex justify-between gap-3 text-gray-600"><span>{t('그 외 (건강보험·국제학생 수수료 등)', 'Other (health insurance, intl. fees, etc.)')}</span><span className="font-medium tabular-nums text-gray-800">{money(diff)}</span></p>
      )}
      {r.total != null && (
        <p className="mt-1 flex justify-between gap-3 border-t border-gray-200 pt-1.5 font-semibold text-gray-900"><span>{t('합계', 'Total')}</span><span className="tabular-nums">{money(r.total)}</span></p>
      )}
      {diff < 0 && <p className="text-[11px] text-gray-400">{t('항목별 금액은 학교의 일반 비용표 기준이라 합계와 조금 달라요.', 'Line items come from the school’s general cost table, so they differ slightly from the total.')}</p>}
    </div>
  )
}

export default function CostBlock({ schoolId }: { schoolId: number }) {
  const [open, setOpen] = useState(false)
  const r = costFor(schoolId)
  if (!r || !r.total) return null
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <Receipt size={18} strokeWidth={2} className="text-blue-600" />
        {t('1년 예상 비용', 'Estimated cost per year')}
        <span className="ml-1 text-xs font-normal text-gray-400">{t(`국제학생·기숙사 기준 · ${r.year ?? ''}`, `intl., on campus · ${r.year ?? ''}`)}</span>
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-gray-900">{money(r.total)}</p>
      <p className="text-[11px] text-gray-500">{basisLabel(r.basis)}{r.basis === 'after_scholarship' ? t(' · 그 외 장학금 전', ' · before other aid') : t(' · 장학금 전 정가', ' · before aid')}</p>
      <button onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-500">
        {t('항목별 내역', 'Breakdown')} <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
      </button>
      {open && <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2.5"><CostBreakdown r={r} /></div>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <a href={r.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a>
        <button onClick={() => navigate('/guide/cost')} className="text-blue-600 underline">{t('다른 학교와 비교 →', 'Compare with other schools →')}</button>
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">{t('실제 부담액은 장학금·재정지원으로 크게 달라지고, 학비는 해마다 올라요.', 'What you actually pay depends heavily on aid, and costs rise every year.')}</p>
    </div>
  )
}
