import { Suspense, lazy, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OnboardingAnswers } from './lib/types'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { answersToRow, loadProfile, saveProfile, type ProfileRow } from './lib/profile'
import { currentSeasonLabel } from './lib/academics'
import EmailStep, { RESEARCH_CONSENT_KEY } from './auth/EmailStep'
import NicknameStep from './auth/NicknameStep'
import RolloverGate from './RolloverGate'
import SchoolsListPage from './browse/SchoolsListPage'
import SchoolDetailPage from './browse/SchoolDetailPage'
import ComparePage from './browse/ComparePage'
import { usePath, navigate } from './lib/router'
import { getLang, t } from './i18n'
import LangToggle from './i18n/LangToggle'

// 무거운 화면(차트·리포트·보드·온보딩)은 필요할 때만 내려받음 — 둘러보기 첫 로딩을 가볍게
const OnboardingFlow = lazy(() => import('./onboarding/OnboardingFlow'))
const ReportView = lazy(() => import('./report/ReportView'))
const PreviewReport = lazy(() => import('./report/PreviewReport'))
const CheckinFlow = lazy(() => import('./checkin/CheckinFlow'))
const GuideView = lazy(() => import('./report/GuideView'))
const DeadlinesPage = lazy(() => import('./deadlines/DeadlinesPage'))
const AppRouter = lazy(() => import('./app/AppRouter'))
const MajorRoadmapPage = lazy(() => import('./major/MajorRoadmapPage'))
const AdminPage = lazy(() => import('./admin/AdminPage'))
// 개발용: /admin?demo=1 → 샘플 데이터로 레이아웃 확인 (프로덕션 빌드에서 제거됨)
const AdminDemo = lazy(async () => {
  const [{ default: Page }, { default: demo }] = await Promise.all([import('./admin/AdminPage'), import('./admin/demo-stats.json')])
  return { default: () => <Page email="demo" demo={demo as unknown as Parameters<typeof Page>[0]['demo']} /> }
})
import { readPrefillSchoolIds } from './browse/prefill'
import { logEvent } from './lib/analytics'

const PENDING_KEY = 'pending_answers' // 매직 링크로 나갔다 돌아와도 온보딩 답변 유지

function loadPending(): OnboardingAnswers | null {
  const raw = localStorage.getItem(PENDING_KEY)
  return raw ? (JSON.parse(raw) as OnboardingAnswers) : null
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-8">{children}</div>
    </div>
  )
}

type GuestPhase = 'home' | 'onboarding' | 'preview' | 'email'

function LoadingScreen() {
  return (
    <Screen>
      <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
    </Screen>
  )
}

export default function App() {
  // 언어 전환 시 전체 리마운트 (t()가 모듈 변수 기반이라 key로 갱신)
  const [langKey, setLangKey] = useState(getLang())
  useEffect(() => {
    const on = () => setLangKey(getLang())
    window.addEventListener('app:lang', on)
    return () => window.removeEventListener('app:lang', on)
  }, [])
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppRoutes key={langKey} />
    </Suspense>
  )
}

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<OnboardingAnswers | null>(loadPending)
  // 항상 홈에서 시작 — 미인증 답변이 남아 있으면 홈에 '이어서 인증하기' 배너를 보여줌
  const [phase, setPhase] = useState<GuestPhase>('home')
  const path = usePath() // F1: /schools 라우팅
  // 마지막 리포트 시즌 — 현재 시즌과 다르면 체크인 플로우부터
  // undefined = 아직 조회 전 (조회가 끝나기 전에 리포트를 먼저 그리면 안 됨)
  const [lastSeason, setLastSeason] = useState<string | null | undefined>(undefined)
  const [checkinDone, setCheckinDone] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN' && s) logEvent(s.user.id, 'login')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    loadProfile(session.user.id)
      .then(setProfile)
      .finally(() => setProfileLoading(false))
  }, [session])

  // 마지막 리포트 시즌 확인 (시즌 체크인 판단용)
  useEffect(() => {
    if (!session || !profile || !supabase) {
      setLastSeason(undefined)
      return
    }
    supabase
      .from('reports')
      .select('season_label')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setLastSeason(data && data.length > 0 ? data[0].season_label : null)
      })
  }, [session, profile])

  if (sessionLoading || profileLoading || (session && profile && lastSeason === undefined)) {
    return (
      <Screen>
        <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
      </Screen>
    )
  }

  // 운영자 통계 (서버 함수가 이메일 화이트리스트로 권한 검사)
  if (path === '/admin' || path === '/admin/') {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo'))
      return <AdminDemo />
    if (!session) return <p className="mt-20 text-center text-sm text-gray-500">{t('운영자 계정으로 로그인 후 /admin 을 열어주세요.', 'Log in with the admin account, then open /admin.')}</p>
    return <AdminPage email={session.user.email ?? null} />
  }
  // F1: 대학 둘러보기 — 로그인 여부와 무관하게 고유 URL로 접근 가능
  if (path === '/schools' || path === '/schools/') {
    return <SchoolsListPage profile={profile} />
  }
  // F2: 학교 비교 (?ids=1,2,3)
  if (path === '/compare' || path === '/compare/') {
    return <ComparePage profile={profile} />
  }
  // F5: 내 원서 (가상 Common App) — 로그인 전용, 9학년부터
  if (path === '/app' || path.startsWith('/app/')) {
    if (session && profile)
      return <AppRouter path={path} userId={session.user.id} profile={profile} onProfileChange={setProfile} />
    return (
      <Screen>
        <div className="py-16 text-center">
          <p className="text-4xl">📋</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('내 원서', 'My Application')}</h1>
          <p className="mt-3 text-sm text-gray-500">{t('가상 Common App은 리포트를 받은 뒤 사용할 수 있어요.', 'The virtual Common App opens after you get your report.')}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('내 리포트 받기', 'Get my report')}
          </button>
        </div>
      </Screen>
    )
  }
  // 전공 로드맵 (비로그인도 열람 가능, 계획 담기는 로그인 필요)
  if (path.startsWith('/major/')) {
    return (
      <MajorRoadmapPage
        majorKey={path.slice('/major/'.length).replace(/\/+$/, '')}
        userId={session?.user.id ?? null}
        profile={profile}
      />
    )
  }
  // F4 → F5: 예전 /board 주소는 내 원서의 지원 학교 탭으로
  if (path === '/board' || path === '/board/') {
    navigate('/app/colleges')
    return <LoadingScreen />
  }
  // F3: 마감 캘린더 (로그인 전용)
  if (path === '/deadlines' || path === '/deadlines/') {
    if (session && profile) return <DeadlinesPage userId={session.user.id} profile={profile} />
    return (
      <Screen>
        <div className="py-16 text-center">
          <p className="text-4xl">🗓️</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('마감 캘린더', 'Deadline Calendar')}</h1>
          <p className="mt-3 text-sm text-gray-500">
            {t('내 목표 학교 기준 캘린더는 리포트를 받은 뒤 볼 수 있어요.', 'Your target-school calendar opens after you get your report.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('내 리포트 받기', 'Get my report')}
          </button>
        </div>
      </Screen>
    )
  }
  if (path.startsWith('/schools/')) {
    return (
      <SchoolDetailPage
        slug={path.slice('/schools/'.length).replace(/\/+$/, '')}
        userId={session?.user.id ?? null}
        profile={profile}
        onProfileChange={setProfile}
      />
    )
  }

  // .env 미설정 → 로컬 전용 모드 (온보딩 체험만)
  if (!isSupabaseConfigured) return <OnboardingFlow />

  // 로그인 완료 + 프로필 있음인데 새 온보딩 답변이 남아 있음 → 덮어쓸지 물어봄 (묵살하면 새 목표 학교가 반영 안 되는 버그)
  if (session && profile && pendingAnswers) {
    const pending = pendingAnswers
    return (
      <Screen>
        <div className="py-12 text-center">
          <p className="text-4xl">🔄</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('방금 입력한 답변으로 업데이트할까요?', 'Update your profile with the new answers?')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {t(`이미 저장된 프로필(${profile.nickname}님)이 있어요. 새 답변으로 바꾸면 목표 학교·전공·성적 정보가 갱신되고, 체크 기록·내 원서 기록은 그대로 유지돼요.`,
               `You already have a saved profile (${profile.nickname}). Updating replaces target schools, major and academics; your checks and application records are kept.`)}
          </p>
          <button
            onClick={async () => {
              const row = answersToRow(pending, profile.nickname ?? '', profile.research_consent)
              await saveProfile(session.user.id, row)
              localStorage.removeItem(PENDING_KEY)
              setPendingAnswers(null)
              setProfile({ ...row, user_id: session.user.id })
            }}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('새 답변으로 업데이트', 'Update with new answers')}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(PENDING_KEY)
              setPendingAnswers(null)
            }}
            className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
          >
            {t('기존 프로필 유지', 'Keep current profile')}
          </button>
        </div>
      </Screen>
    )
  }

  // 로그인 완료 + 프로필 있음 → (새 시즌이면 체크인 먼저) 시즌 리포트
  if (session && profile) {
    const needsCheckin =
      !checkinDone && typeof lastSeason === 'string' && lastSeason !== currentSeasonLabel()
    return (
      <RolloverGate
        userId={session.user.id}
        profile={profile}
        onUpdateGradYear={async (gradYear) => {
          const updated = { ...profile, grad_year: gradYear }
          await saveProfile(session.user.id, updated)
          setProfile(updated)
        }}
      >
        {needsCheckin ? (
          <CheckinFlow
            userId={session.user.id}
            profile={profile}
            prevSeasonLabel={lastSeason as string}
            onDone={(updated) => {
              setProfile(updated)
              setCheckinDone(true)
            }}
          />
        ) : showGuide ? (
          <Screen>
            <GuideView onBack={() => setShowGuide(false)} />
          </Screen>
        ) : (
          <Screen>
            <ReportView
              userId={session.user.id}
              profile={profile}
              onLogout={() => supabase!.auth.signOut()}
              onOpenGuide={() => setShowGuide(true)}
              onProfileChange={setProfile}
            />
          </Screen>
        )}
      </RolloverGate>
    )
  }

  // 로그인 완료 + 프로필 없음 → 닉네임 입력 후 저장 (온보딩 답변은 localStorage에)
  if (session) {
    const pending = loadPending()
    if (!pending) {
      // 답변이 없으면 온보딩부터 (로그인 상태라 이메일 단계는 건너뜀)
      return (
        <OnboardingFlow
          onComplete={(answers) => {
            localStorage.setItem(PENDING_KEY, JSON.stringify(answers))
            window.location.reload()
          }}
        />
      )
    }
    return (
      <Screen>
        <NicknameStep
          onSubmit={async (nickname) => {
            const consent = localStorage.getItem(RESEARCH_CONSENT_KEY) === '1'
            const row = answersToRow(pending, nickname, consent)
            await saveProfile(session.user.id, row)
            logEvent(session.user.id, 'signup')
            localStorage.removeItem(PENDING_KEY)
            localStorage.removeItem(RESEARCH_CONSENT_KEY)
            setProfile({ ...row, user_id: session.user.id })
          }}
        />
      </Screen>
    )
  }

  // 미로그인: 온보딩 → 리포트 프리뷰(블러) → 이메일 입력
  if (phase === 'email') {
    return (
      <Screen>
        <button
          onClick={() => setPhase('home')}
          aria-label="홈으로"
          className="mb-2 rounded-lg p-2 text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        <EmailStep />
      </Screen>
    )
  }
  if (phase === 'preview' && pendingAnswers) {
    return (
      <Screen>
        <PreviewReport answers={pendingAnswers} onContinue={() => setPhase('email')} />
      </Screen>
    )
  }
  // F1: 홈 이원화 — 학교 상세 CTA에서 프리필을 들고 돌아온 경우엔 바로 온보딩으로
  if (phase === 'home' && readPrefillSchoolIds().length === 0) {
    return (
      <Screen>
        <div className="py-10 text-center">
          <div className="flex justify-end"><LangToggle /></div>
          <p className="text-5xl">🎓</p>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">{t('미국 대학 입시 로드맵', 'US College Roadmap')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {t('학년·전공·목표 학교에 맞는 시즌별 체크리스트로', 'Season-by-season checklists tailored to your grade, major and target schools —')}
            <br />
            {t('4년을 관리하는 툴이에요.', 'manage all four years in one place.')}
          </p>
          {pendingAnswers ? (
            <>
              {/* 미인증 답변이 남은 경우: 이어서 인증 유도 */}
              <p className="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                {t('✍️ 작성해 둔 답변이 있어요 — 이메일 인증만 하면 리포트가 나와요.', '✍️ You have saved answers — verify your email to get the report.')}
              </p>
              <button
                onClick={() => setPhase('email')}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white active:bg-blue-700"
              >
                {t('이어서 이메일 인증하기', 'Continue to email verification')}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(PENDING_KEY)
                  setPendingAnswers(null)
                  setPhase('onboarding')
                }}
                className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-500 active:bg-gray-50"
              >
                {t('답변 버리고 처음부터 하기', 'Discard and start over')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setPhase('onboarding')}
              className="mt-8 w-full rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white active:bg-blue-700"
            >
              {t('내 리포트 받기', 'Get my report')}
            </button>
          )}
          <button
            onClick={() => navigate('/schools')}
            className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-4 font-semibold text-gray-700 active:bg-gray-50"
          >
            {t('대학 둘러보기', 'Browse colleges')}
          </button>
          {!pendingAnswers && (
            <button onClick={() => setPhase('email')} className="mt-6 text-sm text-gray-400 underline">
              {t('이미 가입했어요 — 이메일로 로그인', 'Already signed up — log in by email')}
            </button>
          )}
        </div>
      </Screen>
    )
  }
  return (
    <OnboardingFlow
      onComplete={(answers) => {
        localStorage.setItem(PENDING_KEY, JSON.stringify(answers))
        setPendingAnswers(answers)
        setPhase('preview')
      }}
    />
  )
}
