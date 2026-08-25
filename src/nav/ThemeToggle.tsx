import { useState } from 'react'
import { t } from '../i18n'

// 다크 모드 토글 — html에 .dark 클래스만 켜고 끔 (색은 index.css의 다크 오버라이드가 담당)
export const THEME_KEY = 'theme'

export function applyStoredTheme() {
  try {
    document.documentElement.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark')
  } catch { /* ignore */ }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark' } catch { return false }
  })
  const toggle = () => {
    const next = !dark
    setDark(next)
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light') } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', next)
  }
  return (
    <button
      onClick={toggle}
      title={dark ? t('라이트 모드', 'Light mode') : t('다크 모드', 'Dark mode')}
      aria-label={dark ? t('라이트 모드로 전환', 'Switch to light mode') : t('다크 모드로 전환', 'Switch to dark mode')}
      className="rounded-full px-2 py-1 text-sm hover:bg-gray-100"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
