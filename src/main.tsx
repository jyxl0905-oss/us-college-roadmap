import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyStoredTheme } from './nav/ThemeToggle'

applyStoredTheme()

// 유입 경로 태그 (?ref=insta, ?ref=f-초대코드 등) — 최초 방문 값만 기록, URL은 깨끗하게 정리
try {
  const params = new URLSearchParams(window.location.search)
  const ref = params.get('ref')
  if (ref && !localStorage.getItem('ref_source')) {
    localStorage.setItem('ref_source', ref.slice(0, 40).replace(/[^\w-]/g, ''))
  }
  if (ref) {
    params.delete('ref')
    const rest = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: 서비스 워커 등록 (프로덕션에서만) — 홈 화면/앱 설치 가능 조건
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
