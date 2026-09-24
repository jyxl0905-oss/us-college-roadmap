import { useEffect, useState } from 'react'
import { GraduationCap, ChevronDown } from 'lucide-react'
import { t } from '../i18n'
import { navigate } from '../lib/router'

// 대학별 AP 학점 인정 기준 — 각 대학 공식 페이지(교무처·요람·AP 학점표) 기준, 사용자 승인 후 반영
export type ApPolicy = 'credit' | 'limited' | 'placement_only' | 'none' | 'varies'
export type ApSubjectKey = 'calc_ab' | 'calc_bc' | 'cs_a' | 'chem' | 'physics_c_mech' | 'eng_lang' | 'micro'
export interface ApSubjectRule { min: number | null; result_en: string; result_ko: string }
export interface ApCredit {
  id: number
  policy: ApPolicy | null
  min_score: number | null
  max_credit_ko: string | null; max_credit_en: string | null
  uses_ko: string | null; uses_en: string | null
  subjects: Partial<Record<ApSubjectKey, ApSubjectRule | null>>
  policy_year: string | null
  source_url: string | null
  note_ko: string | null; note_en: string | null
}

export const AP_SUBJECTS: { key: ApSubjectKey; label: string }[] = [
  { key: 'calc_ab', label: 'Calculus AB' },
  { key: 'calc_bc', label: 'Calculus BC' },
  { key: 'cs_a', label: 'Computer Science A' },
  { key: 'chem', label: 'Chemistry' },
  { key: 'physics_c_mech', label: 'Physics C: Mechanics' },
  { key: 'eng_lang', label: 'English Language' },
  { key: 'micro', label: 'Microeconomics' },
]

export const POLICY: Record<ApPolicy, { ko: string; en: string; cls: string }> = {
  credit: { ko: '학점 인정', en: 'Gives credit', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  limited: { ko: '일부만 인정', en: 'Limited credit', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  placement_only: { ko: '학점 없음 · 배치만', en: 'Placement only', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  none: { ko: '인정 안 함', en: 'No credit', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  varies: { ko: '학과마다 다름', en: 'Varies by dept.', cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
}

let cache: Promise<Map<number, ApCredit>> | null = null
export function loadApCredit(): Promise<Map<number, ApCredit>> {
  cache ??= import('../data/apCredit.json').then((m) => new Map((m.default as unknown as { schools: ApCredit[] }).schools.map((r) => [r.id, r])))
  return cache
}

export function subjectRuleText(r: ApSubjectRule | null | undefined): { score: string; ko: string; en: string } | null {
  if (!r) return null
  return { score: r.min != null ? `${r.min}+` : '✕', ko: r.result_ko, en: r.result_en }
}

export default function ApCreditBlock({ schoolId }: { schoolId: number }) {
  const [r, setR] = useState<ApCredit | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let alive = true
    void loadApCredit().then((m) => { if (alive) setR(m.get(schoolId) ?? null) })
    return () => { alive = false }
  }, [schoolId])
  if (!r || (!r.policy && !r.min_score)) return null
  const P = r.policy ? POLICY[r.policy] : null
  const subs = AP_SUBJECTS.filter((s) => r.subjects[s.key])

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <GraduationCap size={18} strokeWidth={2} className="text-blue-600" />
        {t('AP 학점 인정', 'AP credit')}
        <span className="ml-1 text-xs font-normal text-gray-400">{r.policy_year ? t(`${r.policy_year} 기준표`, `${r.policy_year} chart`) : t('연도 표기 없는 현행 기준', 'current, undated')}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {P && <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ${P.cls}`}>{t(P.ko, P.en)}</span>}
        {r.min_score != null && <span className="text-sm text-gray-700">{t('대부분 과목 ', 'Most subjects: ')}<span className="text-lg font-extrabold tabular-nums text-gray-900">{r.min_score}{t('점 이상', '+')}</span></span>}
      </div>
      {r.uses_ko && <p className="mt-1.5 text-[13px] leading-relaxed text-gray-700">{t(r.uses_ko, r.uses_en ?? r.uses_ko)}</p>}
      {r.max_credit_ko && <p className="mt-1 text-[12px] text-gray-500">{t('상한: ', 'Cap: ')}{t(r.max_credit_ko, r.max_credit_en ?? r.max_credit_ko)}</p>}

      {subs.length > 0 && (
        <>
          <button onClick={() => setOpen((v) => !v)} className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-gray-500">
            {t(`주요 과목 ${subs.length}개 기준`, `${subs.length} popular exams`)} <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
          </button>
          {open && (
            <ul className="mt-1.5 flex flex-col divide-y divide-gray-100 rounded-lg bg-gray-50 px-3">
              {subs.map((s) => {
                const x = subjectRuleText(r.subjects[s.key])!
                return (
                  <li key={s.key} className="flex items-start gap-2 py-1.5 text-[12px]">
                    <span className="w-32 shrink-0 font-medium text-gray-800">AP {s.label}</span>
                    <span className="w-8 shrink-0 font-bold tabular-nums text-gray-900">{x.score}</span>
                    <span className="min-w-0 flex-1 text-gray-600">{t(x.ko, x.en)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {r.note_ko && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">{t(r.note_ko, r.note_en ?? r.note_ko)}</p>}

      <p className="mt-2.5 text-[11px] text-gray-400">
        {t('AP 점수는 입학 심사와 별개로, 입학 후 학점·배치에 쓰여요. 위 내용은 대부분 2026-27 입학생 기준표예요 — 학교는 입학 연도마다 새 표를 발표하니, 내 입학 연도 표가 나오면 꼭 다시 확인하세요.', 'AP credit is separate from admission — it’s used for credit and placement after you enroll. Most of this reflects charts for 2026-27 entrants; colleges publish a new chart each year, so recheck when your entry year’s chart is out.')}
        {' '}<button onClick={() => navigate('/guide/ap?tab=credit')} className="text-blue-600 underline">{t('다른 학교와 비교 →', 'Compare schools →')}</button>
        {r.source_url && <> <a href={r.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a></>}
      </p>
    </div>
  )
}
