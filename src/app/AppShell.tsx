import { navigate } from '../lib/router'

export type AppTab = 'home' | 'activities' | 'testing' | 'education' | 'colleges' | 'writing'

export const appTabs: { key: AppTab; label: string; path: string; emoji: string }[] = [
  { key: 'home', label: '홈', path: '/app', emoji: '📋' },
  { key: 'activities', label: '활동', path: '/app/activities', emoji: '🏃' },
  { key: 'testing', label: '시험', path: '/app/testing', emoji: '✏️' },
  { key: 'education', label: '학업', path: '/app/education', emoji: '📚' },
  { key: 'colleges', label: '지원 학교', path: '/app/colleges', emoji: '🎯' },
  { key: 'writing', label: '에세이', path: '/app/writing', emoji: '📝' },
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
          <button onClick={onBack ?? (() => navigate('/'))} aria-label="뒤로" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          {headerExtra}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            가상 원서 · 실제 제출 아님
          </span>
        </div>
        {children}
      </div>

      {/* 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md justify-between px-2 py-1.5">
          {appTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(t.path)}
              className={`flex flex-1 flex-col items-center rounded-lg px-1 py-1.5 text-[11px] ${
                tab === t.key ? 'font-semibold text-blue-700' : 'text-gray-500'
              }`}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              <span className="mt-1">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
