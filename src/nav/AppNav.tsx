import { useEffect, useState } from 'react'
import { BarChart3, Target, FileText, Search, Menu, Compass, CalendarDays, BookOpen, GraduationCap, Map, MessageCircle, X, Home, Shield, Wallet } from 'lucide-react'
import { navigate, usePath } from '../lib/router'
import { t } from '../i18n'
import LangToggle from '../i18n/LangToggle'
import ThemeToggle from './ThemeToggle'
import FeedbackModal from './FeedbackModal'
import { useNavState } from './navState'

// 로그인 후 내비게이션 (2026-09 리디자인) — 폰: 하단 탭 바 / 컴퓨터: 왼쪽 메뉴
// html에 has-bottom-nav / has-side-nav 클래스를 켜서 본문 여백·고정 버튼 위치를 CSS로 조정 (index.css)
interface Item { to: string; label: string; icon: typeof Home; active: (p: string) => boolean }

export default function AppNav() {
  const path = usePath()
  const { loggedIn, onboarded, admin } = useNavState()
  const [moreOpen, setMoreOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('has-bottom-nav', loggedIn)
    root.classList.toggle('has-side-nav', loggedIn)
    return () => { root.classList.remove('has-bottom-nav', 'has-side-nav') }
  }, [loggedIn])

  // 경로가 바뀌면 '더보기' 닫기
  useEffect(() => { setMoreOpen(false) }, [path])

  if (!loggedIn) return null

  const first: Item = onboarded
    ? { to: '/', label: t('리포트', 'Report'), icon: BarChart3, active: (p) => p === '/' }
    : { to: '/', label: t('홈', 'Home'), icon: Home, active: (p) => p === '/' }
  const main: Item[] = [
    first,
    { to: '/targets', label: t('목표 학교', 'Targets'), icon: Target, active: (p) => p.startsWith('/targets') },
    { to: '/app', label: t('내 원서', 'My App'), icon: FileText, active: (p) => p.startsWith('/app') },
    { to: '/schools', label: t('둘러보기', 'Browse'), icon: Search, active: (p) => p.startsWith('/schools') || p.startsWith('/compare') || p === '/map' },
  ]
  const more: Item[] = [
    ...(onboarded ? [] : [{ to: '/report', label: t('리포트', 'Report'), icon: BarChart3, active: (p: string) => p.startsWith('/report') }]),
    { to: '/deadlines', label: t('마감 캘린더', 'Deadlines'), icon: CalendarDays, active: (p) => p.startsWith('/deadlines') },
    { to: '/majors', label: t('전공 가이드', 'Major guides'), icon: Compass, active: (p) => p.startsWith('/major') },
    { to: '/guide/ap', label: t('AP 가이드', 'AP guide'), icon: BookOpen, active: (p) => p === '/guide/ap' },
    { to: '/guide/courses', label: t('수업 난이도', 'Course rigor'), icon: GraduationCap, active: (p) => p === '/guide/courses' },
    { to: '/guide/cost', label: t('비용·재정지원', 'Cost & aid'), icon: Wallet, active: (p) => p === '/guide/cost' },
    { to: '/map', label: t('대학 지도', 'College map'), icon: Map, active: (p) => p === '/map' },
    ...(admin ? [{ to: '/admin', label: t('관리자', 'Admin'), icon: Shield, active: (p: string) => p.startsWith('/admin') }] : []),
  ]
  const moreActive = more.some((m) => m.active(path))

  const sideLink = (it: Item) => {
    const on = it.active(path)
    const Icon = it.icon
    return (
      <button
        key={it.to}
        onClick={() => navigate(it.to)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${on ? 'bg-blue-50 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        <Icon size={18} strokeWidth={1.9} className={on ? 'text-blue-600' : ''} />
        {it.label}
      </button>
    )
  }

  return (
    <>
      {/* 컴퓨터: 왼쪽 메뉴 */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white px-3 py-5 md:flex">
        <button onClick={() => navigate('/')} className="mb-5 flex items-center gap-2 px-2 text-[15px] font-extrabold tracking-tight text-gray-900">
          <img src="/icons/favicon-64.png" alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-lg" />
          {t('미국 대입 로드맵', 'US College Roadmap')}
        </button>
        <nav className="flex flex-col gap-0.5">{main.map(sideLink)}</nav>
        <div className="mx-2 my-3 h-px bg-gray-100" />
        <nav className="flex flex-col gap-0.5">{more.map(sideLink)}</nav>
        <div className="mt-auto flex items-center gap-1 px-1 pt-4">
          <button onClick={() => setFeedbackOpen(true)} title={t('의견 보내기', 'Send feedback')} aria-label={t('의견 보내기', 'Send feedback')} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><MessageCircle size={17} strokeWidth={1.9} /></button>
          <LangToggle />
          <ThemeToggle />
        </div>
      </aside>

      {/* 폰: 하단 탭 바 */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label={t('주요 메뉴', 'Main menu')}>
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {main.map((it) => {
            const on = it.active(path)
            const Icon = it.icon
            return (
              <button key={it.to} onClick={() => navigate(it.to)} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${on ? 'text-gray-900' : 'text-gray-400'}`}>
                <Icon size={21} strokeWidth={on ? 2.1 : 1.8} className={on ? 'text-blue-600' : ''} />
                {it.label}
              </button>
            )
          })}
          <button onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${moreActive || moreOpen ? 'text-gray-900' : 'text-gray-400'}`}>
            <Menu size={21} strokeWidth={moreActive ? 2.1 : 1.8} className={moreActive ? 'text-blue-600' : ''} />
            {t('더보기', 'More')}
          </button>
        </div>
      </nav>

      {/* 폰: 더보기 시트 */}
      {moreOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-gray-900/30" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-bold text-gray-900">{t('더보기', 'More')}</p>
              <button onClick={() => setMoreOpen(false)} aria-label={t('닫기', 'Close')} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {more.map((it) => {
                const Icon = it.icon
                const on = it.active(path)
                return (
                  <button key={it.to} onClick={() => navigate(it.to)} className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-xs font-semibold ${on ? 'bg-blue-50 text-gray-900' : 'bg-gray-50 text-gray-700'}`}>
                    <Icon size={20} strokeWidth={1.9} className={on ? 'text-blue-600' : 'text-gray-500'} />
                    {it.label}
                  </button>
                )
              })}
              <button onClick={() => { setMoreOpen(false); setFeedbackOpen(true) }} className="flex flex-col items-center gap-1.5 rounded-2xl bg-gray-50 px-2 py-3.5 text-xs font-semibold text-gray-700">
                <MessageCircle size={20} strokeWidth={1.9} className="text-gray-500" />
                {t('의견 보내기', 'Feedback')}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  )
}
