import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { t } from '../i18n'

// 다크 모드 토글 — html에 .dark 클래스만 켜고 끔 (색은 index.css의 다크 오버라이드가 담당)
export const THEME_KEY = 'theme'

export function applyStoredTheme() {
  try {
    document.documentElement.classList.toggle('dark', localStorage.getItem(THEME_KEY) === 'dark')
  } catch { /* ignore */ }
}

export const isDark = () => document.documentElement.classList.contains('dark')

// 설정 화면과 상단 버튼이 같은 값을 쓰도록 이벤트로 알림
export function setTheme(dark: boolean) {
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light') } catch { /* ignore */ }
  document.documentElement.classList.toggle('dark', dark)
  window.dispatchEvent(new Event('app:theme'))
}

export function useDark(): boolean {
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const on = () => setDark(isDark())
    window.addEventListener('app:theme', on)
    return () => window.removeEventListener('app:theme', on)
  }, [])
  return dark
}

export default function ThemeToggle() {
  const dark = useDark()
  const toggle = () => setTheme(!dark)
  return (
    <button
      onClick={toggle}
      title={dark ? t('라이트 모드', 'Light mode') : t('다크 모드', 'Dark mode')}
      aria-label={dark ? t('라이트 모드로 전환', 'Switch to light mode') : t('다크 모드로 전환', 'Switch to dark mode')}
      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
    >
      {dark ? <Sun size={17} strokeWidth={1.9} /> : <Moon size={17} strokeWidth={1.9} />}
    </button>
  )
}
