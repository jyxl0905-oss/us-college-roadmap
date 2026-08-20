import { useEffect, useState } from 'react'
import { navigate, usePath } from '../lib/router'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import LangToggle from '../i18n/LangToggle'
import { isAdminEmail } from '../lib/admin'

// 전역 상단 바 — 어느 화면에서든 주요 기능(리포트·내 원서·학교·마감)과 언어 토글이 항상 보이게.
// "스크롤해야/눌러봐야 기능이 보인다"는 피드백에 대한 답: 내비게이션을 화면 상단에 상시 노출.
export default function TopNav() {
  const path = usePath()
  const [loggedIn, setLoggedIn] = useState(false)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
      setAdmin(isAdminEmail(data.session?.user.email))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoggedIn(!!s)
      setAdmin(isAdminEmail(s?.user.email))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const links = loggedIn
    ? [
        { to: '/', label: t('리포트', 'Report'), active: path === '/' },
        { to: '/targets', label: t('목표 학교', 'Targets'), active: path.startsWith('/targets') },
        { to: '/app', label: t('내 원서', 'My App'), active: path.startsWith('/app') },
        { to: '/schools', label: t('둘러보기', 'Browse'), active: path.startsWith('/schools') || path.startsWith('/compare') },
        { to: '/deadlines', label: t('마감', 'Deadlines'), active: path.startsWith('/deadlines') },
      ]
    : [{ to: '/schools', label: t('대학 둘러보기', 'Browse colleges'), active: path.startsWith('/schools') }]

  return (
    <header className="no-print sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 py-2">
        <button onClick={() => navigate('/')} className="mr-1 flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-bold text-gray-900">
          🎓 <span className="hidden sm:inline">{t('미국 대입 로드맵', 'US College Roadmap')}</span>
        </button>
        {links.map((l) => (
          <button
            key={l.to}
            onClick={() => navigate(l.to)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${l.active ? 'bg-gray-900 font-semibold text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {l.label}
          </button>
        ))}
        {admin && (
          <button onClick={() => navigate('/admin')} className={`shrink-0 rounded-full px-3 py-1 text-sm ${path.startsWith('/admin') ? 'bg-gray-900 font-semibold text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            📊
          </button>
        )}
        <div className="ml-auto shrink-0 pl-2"><LangToggle /></div>
      </div>
    </header>
  )
}
