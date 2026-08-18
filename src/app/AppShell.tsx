import { navigate } from '../lib/router'
import { t } from '../i18n'
import LangToggle from '../i18n/LangToggle'

export type AppTab = 'home' | 'plans' | 'activities' | 'testing' | 'education' | 'colleges' | 'writing'

export const appTabs: { key: AppTab; label: string; path: string; emoji: string }[] = [
  { key: 'home', get label() { return t('홈', 'Home') }, path: '/app', emoji: '📋' },
  { key: 'plans', get label() { return t('계획', 'Plans') }, path: '/app/plans', emoji: '🗓️' },
  { key: 'activities', get label() { return t('활동', 'Activities') }, path: '/app/activities', emoji: '🏃' },
  { key: 'testing', get label() { return t('시험', 'Testing') }, path: '/app/testing', emoji: '✏️' },
  { key: 'education', get label() { return t('학업', 'Education') }, path: '/app/education', emoji: '📚' },
  { key: 'colleges', get label() { return t('지원', 'Colleges') }, path: '/app/colleges', emoji: '🎯' },
  { key: 'writing', get label() { return t('에세이', 'Essays') }, path: '/app/writing', emoji: '📝' },
]

interface AppShellProps {
  tab: AppTab
  title: string
  children: React.ReactNode
  onBack?: () => void // 기본: 리포트로
  headerExtra?: React.ReactNode // 제목 왼쪽(로고 등)
}

// F5 내 원서(가상 Common App) 공통 레이아웃 — 상단 뒤로가기·"실제 제출 아님" 배지·하단 탭
export default function AppShell({ tab, title, children, onBack, headerExtra }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-28">
        <div className="flex items-center gap-3">
          <button onClick={onBack ?? (() => navigate('/'))} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          {headerExtra}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            {t('가상 원서 · 실제 제출 아님', 'Practice app · not a real submission')}
          </span>
          <LangToggle className="shrink-0" />
        </div>
        {children}
      </div>

      {/* 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md justify-between px-2 py-1.5">
          {appTabs.map((it) => (
            <button
              key={it.key}
              onClick={() => navigate(it.path)}
              className={`flex flex-1 flex-col items-center rounded-lg px-1 py-1.5 text-[11px] ${
                tab === it.key ? 'font-semibold text-blue-700' : 'text-gray-500'
              }`}
            >
              <span className="text-base leading-none">{it.emoji}</span>
              <span className="mt-1">{it.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
