import { MessageCircle, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { navigate, usePath } from '../lib/router'
import { t } from '../i18n'
import LangToggle from '../i18n/LangToggle'
import ThemeToggle from './ThemeToggle'
import { useNavState } from './navState'
import FeedbackModal from './FeedbackModal'

// 전역 상단 바 — 어느 화면에서든 주요 기능(리포트·내 원서·학교·마감)과 언어 토글이 항상 보이게.
// "스크롤해야/눌러봐야 기능이 보인다"는 피드백에 대한 답: 내비게이션을 화면 상단에 상시 노출.
export default function TopNav() {
  const path = usePath()
  const { loggedIn, onboarded, admin } = useNavState()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const links = loggedIn
    ? [
        // 온보딩 미완료: '/'는 기록 중심 홈, 리포트는 게이트(/report)로 — 메뉴에서 숨기지 않음 (자물쇠 금지)
        ...(onboarded
          ? [{ to: '/', label: t('리포트', 'Report'), active: path === '/' }]
          : [
              { to: '/', label: t('홈', 'Home'), active: path === '/' },
              { to: '/report', label: t('리포트', 'Report'), active: path.startsWith('/report') },
            ]),
        { to: '/targets', label: t('목표 학교', 'Targets'), active: path.startsWith('/targets') },
        { to: '/app', label: t('내 원서', 'My App'), active: path.startsWith('/app') },
        { to: '/schools', label: t('둘러보기', 'Browse'), active: path.startsWith('/schools') || path.startsWith('/compare') },
        { to: '/majors', label: t('전공', 'Majors'), active: path.startsWith('/major') },
        { to: '/deadlines', label: t('마감', 'Deadlines'), active: path.startsWith('/deadlines') },
      ]
    : [
        { to: '/schools', label: t('대학 둘러보기', 'Browse colleges'), active: path.startsWith('/schools') },
        { to: '/majors', label: t('전공 알아보기', 'Explore majors'), active: path.startsWith('/major') },
      ]

  return (
    <header className="topnav no-print sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-2">
        {/* 메뉴 링크만 가로 스크롤 — 오른쪽 언어·테마 버튼은 좁은 폰에서도 항상 보이게 스크롤 영역 밖에 둠 */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        <button onClick={() => navigate('/')} aria-label={t('홈', 'Home')} className="mr-1 flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-bold text-gray-900">
          <img src="/icons/favicon-64.png" alt="" width={20} height={20} className="h-5 w-5 rounded-md" /> <span className={loggedIn ? '' : 'hidden sm:inline'}>{t('미국 대입 로드맵', 'US College Roadmap')}</span>
        </button>
        {!loggedIn && links.map((l) => (
          <button
            key={l.to}
            onClick={() => navigate(l.to)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-sm sm:px-3 ${l.active ? 'bg-gray-900 font-semibold text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {l.label}
          </button>
        ))}
        {admin && !loggedIn && (
          <button onClick={() => navigate('/admin')} aria-label={t('관리자', 'Admin')} className={`shrink-0 rounded-full px-3 py-1 text-sm ${path.startsWith('/admin') ? 'bg-gray-900 font-semibold text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <BarChart3 size={16} strokeWidth={1.9} />
          </button>
        )}
        </div>
        <div className="flex shrink-0 items-center gap-1 pl-1">
          {loggedIn && (
            <button onClick={() => setFeedbackOpen(true)} title={t('의견 보내기', 'Send feedback')} aria-label={t('의견 보내기', 'Send feedback')} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><MessageCircle size={17} strokeWidth={1.9} /></button>
          )}
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </header>
  )
}
