import { ShieldCheck } from 'lucide-react'
import { t } from '../i18n'

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 'YYYY-MM-DD' → '2026년 9월' / 'Sep 2026'
export function monthLabel(date: string): string {
  const [y, m] = date.split('-').map(Number)
  if (!y || !m) return date
  return t(`${y}년 ${m}월`, `${EN_MONTHS[m - 1]} ${y}`)
}

// 데이터 화면 공통 배지 — "공식 출처 확인 · 2026년 9월 · 출처명"
export default function VerifiedBadge({ date, sources, className = '' }: { date: string; sources?: string; className?: string }) {
  return (
    <p className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200 ${className}`}>
      <ShieldCheck size={13} strokeWidth={2.2} className="shrink-0" />
      <span>{t('공식 출처 확인', 'Verified from official sources')} · {monthLabel(date)}</span>
      {sources && <span className="font-normal text-emerald-700/80">· {sources}</span>}
    </p>
  )
}
