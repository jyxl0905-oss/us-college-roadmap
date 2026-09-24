import { t } from '../i18n'

// 로딩 스켈레톤 — '불러오는 중…' 글자 대신 화면 모양을 흐리게 먼저 보여줌 (2026-09 리디자인)
// 스크린리더에는 '불러오는 중' 한 번만 읽힘
function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

export function PageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`${compact ? 'mt-6' : 'mx-auto mt-8 max-w-md px-5 md:max-w-2xl'}`}>
      <span className="sr-only">{t('불러오는 중…', 'Loading…')}</span>
      {!compact && <Bar className="h-7 w-2/3" />}
      {!compact && <Bar className="mt-3 h-4 w-1/2" />}
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
            <Bar className="h-4 w-1/3" />
            <Bar className="mt-3 h-3 w-full" />
            <Bar className="mt-2 h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
