import { useEffect, useState } from 'react'
import { t } from './i18n'

// 내 원서 기록 등 개인 데이터 조회 실패 시 상단 안내 — 빈 화면을 '기록 없음'으로 오인하지 않도록
export default function LoadErrorBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(true)
    window.addEventListener('app:load-error', on)
    return () => window.removeEventListener('app:load-error', on)
  }, [])
  if (!show) return null
  return (
    <div role="alert" className="no-print sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
      <span>{t('기록을 불러오지 못했어요. 저장된 기록은 그대로 있어요.', 'Couldn’t load your records. Your saved data is safe.')}</span>
      <button onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white active:bg-red-700">
        {t('다시 시도', 'Retry')}
      </button>
    </div>
  )
}
