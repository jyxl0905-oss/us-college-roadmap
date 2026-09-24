import { Component, type ReactNode } from 'react'
import { t } from './i18n'

// 렌더 중 예외가 나도 흰 화면 대신 안내 + 새로고침 버튼
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error(err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-6">
        <div className="max-w-sm text-center">
          <p className="text-3xl">🔄</p>
          <p className="mt-3 font-semibold text-gray-900">{t('화면을 불러오지 못했어요', 'Something went wrong loading this page')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('새 버전이 배포됐거나 연결이 불안정할 수 있어요. 새로고침하면 대부분 해결돼요.', 'A new version may have been deployed, or the connection is unstable. Reloading usually fixes it.')}</p>
          <button onClick={() => window.location.reload()} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700">
            {t('새로고침', 'Reload')}
          </button>
        </div>
      </div>
    )
  }
}
