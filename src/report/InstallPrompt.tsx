import { useEffect, useState } from 'react'
import { t } from '../i18n'

const HIDE_KEY = 'install_prompt_hidden'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// PWA 설치 안내 — 크롬·엣지·안드로이드: 네이티브 설치 버튼 / 아이폰 사파리: 수동 안내. 이미 설치(standalone)면 숨김
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === '1')
  const [installed, setInstalled] = useState(false)

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSafari = isIos && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (standalone || installed || hidden) return null
  if (!deferred && !isSafari) return null // 설치 조건 미충족 브라우저에선 조용히 숨김

  const dismiss = () => {
    localStorage.setItem(HIDE_KEY, '1')
    setHidden(true)
  }

  return (
    <div className="no-print mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{t('앱처럼 바로 열기', 'Open it like an app')}</p>
          {deferred ? (
            <p className="mt-0.5 text-xs text-gray-500">{t('홈 화면(또는 노트북 바탕화면)에 아이콘을 추가하면 주소 입력 없이 한 번에 열려요.', 'Add an icon to your home screen (or desktop) and open it in one tap, no URL needed.')}</p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              {t('사파리 아래', 'In Safari, tap the')} <span className="font-semibold">{t('공유 버튼(⬆️)', 'Share button (⬆️)')}</span> → <span className="font-semibold">{t('홈 화면에 추가', 'Add to Home Screen')}</span>
              {t('를 누르면 아이콘이 생겨요.', ' to get an icon.')}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            {deferred && (
              <button
                onClick={async () => {
                  await deferred.prompt()
                  const { outcome } = await deferred.userChoice
                  if (outcome === 'accepted') setInstalled(true)
                  setDeferred(null)
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white active:bg-blue-700"
              >
                {t('설치하기', 'Install')}
              </button>
            )}
            <button onClick={dismiss} className="text-xs text-gray-400 underline">{t('나중에', 'Later')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
