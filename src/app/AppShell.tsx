import { navigate, goBack } from '../lib/router'
import { t } from '../i18n'
import { ClipboardList, CalendarRange, Activity, PencilLine, BookOpen, Target, PenSquare, UserCheck, Heart } from 'lucide-react'

export type AppTab = 'home' | 'plans' | 'activities' | 'testing' | 'education' | 'colleges' | 'writing' | 'recommenders' | 'interest'

export const appTabs: { key: AppTab; label: string; path: string }[] = [
  { key: 'home', get label() { return t('홈', 'Home') }, path: '/app' },
  { key: 'plans', get label() { return t('계획', 'Plans') }, path: '/app/plans' },
  { key: 'activities', get label() { return t('활동', 'Activities') }, path: '/app/activities' },
  { key: 'testing', get label() { return t('시험', 'Testing') }, path: '/app/testing' },
  { key: 'education', get label() { return t('학업', 'Education') }, path: '/app/education' },
  { key: 'colleges', get label() { return t('지원', 'Colleges') }, path: '/app/colleges' },
  { key: 'writing', get label() { return t('에세이', 'Essays') }, path: '/app/writing' },
  { key: 'recommenders', get label() { return t('추천서', 'Recs') }, path: '/app/recommenders' },
  { key: 'interest', get label() { return t('관심 표현', 'Interest') }, path: '/app/interest' },
]

export const TAB_ICONS: Record<AppTab, typeof ClipboardList> = {
  home: ClipboardList, plans: CalendarRange, activities: Activity, testing: PencilLine, education: BookOpen, colleges: Target, writing: PenSquare, recommenders: UserCheck, interest: Heart,
}

interface AppShellProps {
  tab: AppTab
  title: string
  children: React.ReactNode
  onBack?: () => void // 기본: 리포트로
  headerExtra?: React.ReactNode // 제목 왼쪽(로고 등)
  wide?: boolean // 넓은 화면 2열 레이아웃용 (학업 탭)
}

// F5 내 원서(가상 Common App) 공통 레이아웃 — 상단 뒤로가기·"실제 제출 아님" 배지·하단 탭
export default function AppShell({ tab, title, children, onBack, headerExtra, wide }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className={`mx-auto max-w-md px-5 py-6 pb-12 md:max-w-2xl ${wide ? "lg:max-w-5xl" : ""}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack ?? (() => goBack('/'))} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          {headerExtra}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            {t('가상 원서 · 실제 제출 아님', 'Practice app · not a real submission')}
          </span>
        </div>
        {/* 내 원서 세부 탭 — 전체 하단 탭 바와 겹치지 않도록 제목 아래 가로 탭으로 (2026-09 리디자인) */}
        <nav className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" aria-label={t('내 원서 메뉴', 'My App sections')}>
          {appTabs.map((it) => {
            const Icon = TAB_ICONS[it.key]
            const on = tab === it.key
            return (
              <button
                key={it.key}
                onClick={() => navigate(it.path)}
                aria-current={on ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${on ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
              >
                <Icon size={15} strokeWidth={2} />
                {it.label}
              </button>
            )
          })}
        </nav>
        {children}
      </div>
    </div>
  )
}
