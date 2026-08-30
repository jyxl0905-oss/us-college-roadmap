import { Suspense, lazy, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { emptyAnswers, type OnboardingAnswers } from './lib/types'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { answersToRow, loadProfile, saveProfile, type ProfileRow } from './lib/profile'
import { currentSeasonLabel } from './lib/academics'
import EmailStep, { RESEARCH_CONSENT_KEY } from './auth/EmailStep'
import NicknameStep from './auth/NicknameStep'
import RolloverGate, { markSeenGrade } from './RolloverGate'
import SchoolsListPage from './browse/SchoolsListPage'
import SchoolDetailPage from './browse/SchoolDetailPage'
import ComparePage from './browse/ComparePage'
import { usePath, navigate } from './lib/router'
import { getLang, t } from './i18n'
import TopNav from './nav/TopNav'

// 무거운 화면(차트·리포트·보드·온보딩)은 필요할 때만 내려받음 — 둘러보기 첫 로딩을 가볍게
const OnboardingFlow = lazy(() => import('./onboarding/OnboardingFlow'))
const ReportView = lazy(() => import('./report/ReportView'))
const CheckinFlow = lazy(() => import('./checkin/CheckinFlow'))
const GuideView = lazy(() => import('./report/GuideView'))
const DeadlinesPage = lazy(() => import('./deadlines/DeadlinesPage'))
const AppRouter = lazy(() => import('./app/AppRouter'))
const MajorRoadmapPage = lazy(() => import('./major/MajorRoadmapPage'))
const AdminPage = lazy(() => import('./admin/AdminPage'))
const TargetsPage = lazy(() => import('./report/TargetsPage'))
const MajorsIndexPage = lazy(() => import('./major/MajorsIndexPage'))
const MapPage = lazy(() => import('./browse/MapPage'))
// 개발용: /admin?demo=1 → 샘플 데이터로 레이아웃 확인 (프로덕션 빌드에서 제거됨)
const AdminDemo = lazy(async () => {
  const [{ default: Page }, { default: demo }] = await Promise.all([import('./admin/AdminPage'), import('./admin/demo-stats.json')])
  return { default: () => <Page email="demo" demo={demo as unknown as Parameters<typeof Page>[0]['demo']} /> }
})
import LandingPage from './landing/LandingPage'
import MainHome from './home/MainHome'
import ReportGate from './report/ReportGate'
import { readPrefillSchoolIds, clearPrefill } from './browse/prefill'
import { logEvent } from './lib/analytics'

const PENDING_KEY = 'pending_answers' // 매직 링크로 나갔다 돌아와도 온보딩 답변 유지

function loadPending(): OnboardingAnswers | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    // 예전 버전에서 저장된 답변에 새 필드(infoSources 등)가 없을 수 있음 → 기본값과 병합
    return { ...emptyAnswers, ...(parsed as Partial<OnboardingAnswers>) }
  } catch {
    localStorage.removeItem(PENDING_KEY)
    return null
  }
}

// 만료·사용된 매직 링크로 돌아온 경우 URL 해시에 에러가 담겨 옴 → 홈 대신 이메일 화면(안내 문구 포함)부터
const cameFromAuthError = window.location.hash.includes('error')

// 리포트 전용: 데스크톱에서 2열(본문+사이드 패널) 허용
function WideScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-8 lg:max-w-5xl">{children}</div>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-8">{children}</div>
    </div>
  )
}

type GuestPhase = 'home' | 'email' // 개편: 게스트 온보딩·프리뷰 제거 (온보딩은 로그인 후 /report 게이트에서)

// 다른 브라우저에서 매직 링크를 연 경우: 서버에 보관된 온보딩 답변(take_onboarding)을 한 번 가져옴
function StashFetcher({ userId, onDone }: { userId: string; onDone: (r: { answers: OnboardingAnswers; research_consent: boolean } | null) => void }) {
  useEffect(() => {
    let cancelled = false
    const finish = (r: { answers: OnboardingAnswers; research_consent: boolean } | null) => { if (!cancelled) onDone(r) }
    if (!supabase) { finish(null); return }
    const timer = window.setTimeout(() => finish(null), 6000)
    supabase.rpc('take_onboarding').then(({ data }) => {
      window.clearTimeout(timer)
      const d = data as { answers?: Partial<OnboardingAnswers>; research_consent?: boolean } | null
      finish(d?.answers ? { answers: { ...emptyAnswers, ...d.answers }, research_consent: !!d.research_consent } : null)
    }, () => { window.clearTimeout(timer); finish(null) })
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  return <LoadingScreen />
}

// 렌더 중 navigate 호출 대신 effect에서 이동 (StrictMode 이중 push 방지)
function Redirect({ to }: { to: string }) {
  useEffect(() => { navigate(to) }, [to])
  return <LoadingScreen />
}

// 온보딩 완료 여부 — 기존 유저는 전부 grad_year가 있음. 스텁 프로필(구글 로그인 직후)만 null
const isOnboarded = (p: ProfileRow | null): boolean => !!p && p.grad_year !== null

// TopNav에 온보딩 상태 알림 (미완료 유저는 '홈'과 '리포트' 링크가 분리됨)
function broadcastOnboarded(v: boolean) {
  try { window.dispatchEvent(new CustomEvent('app:onboarded', { detail: v })) } catch { /* ignore */ }
}

// /report 게이트 — 온보딩 미완료 유저: 블러 샘플 → [지금 알려주기] → 12문항 → 프로필 완성
function GateFlow({ userId, profile, onDone }: { userId: string; profile: ProfileRow; onDone: (p: ProfileRow) => void }) {
  const [started, setStarted] = useState(false)
  if (!started) return <Screen><ReportGate onStart={() => setStarted(true)} /></Screen>
  return (
    <OnboardingFlow
      onExit={() => setStarted(false)}
      onComplete={async (answers) => {
        const row = answersToRow(answers, profile.nickname ?? '', profile.research_consent)
        // 온보딩 전 담아둔 목표 학교 보존: 답변이 미정이면 기존 목록 유지, 학교 선택이면 합집합
        const prevIds = profile.target_mode === 'schools' ? profile.target_school_ids : []
        if (prevIds.length > 0) {
          if (row.target_mode === 'schools') row.target_school_ids = [...new Set([...prevIds, ...row.target_school_ids])]
          else if (row.target_mode === 'undecided' || !row.target_mode) { row.target_mode = 'schools'; row.target_school_ids = prevIds; row.target_tier = null }
        }
        try {
          await saveProfile(userId, row)
        } catch {
          alert(t('저장에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.', 'Could not save. Check your connection and try again.'))
          return
        }
        markSeenGrade(userId, row.grad_year)
        localStorage.removeItem(PENDING_KEY)
        onDone({ ...profile, ...row, user_id: userId })
        navigate('/')
      }}
    />
  )
}

// 구글 로그인 직후: 온보딩 없이 최소 프로필(스텁) 자동 생성 → 바로 메인
function StubCreator({ userId, onDone }: { userId: string; onDone: (p: ProfileRow) => void }) {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase!.auth.getUser()
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string }
      const nickname = (meta.full_name || meta.name || data.user?.email?.split('@')[0] || '').trim().slice(0, 30) || null
      const prefill = readPrefillSchoolIds()
      let ref: string | null = null
      try { ref = localStorage.getItem('ref_source') } catch { /* ignore */ }
      const row: ProfileRow = {
        nickname,
        grad_year: null, applicant_status: null, has_counselor: null, school_accredited: null,
        major_primary: null, major_secondary: null,
        target_mode: prefill.length > 0 ? 'schools' : null, target_school_ids: prefill, target_tier: null,
        gpa_band: null, math_course: null, sat_status: null, sat_band: null,
        ap_completed: null, ap_current: null, toefl_status: null,
        activity_spike: null, activity_leadership: null, activity_validation: null,
        quiz_answers: null, info_sources: null,
        research_consent: localStorage.getItem(RESEARCH_CONSENT_KEY) === '1',
        lang: getLang(), ref_source: ref,
      }
      try {
        await saveProfile(userId, row)
        clearPrefill()
        logEvent(userId, 'signup')
        if (!cancelled) onDone({ ...row, user_id: userId })
      } catch {
        // 저장 실패 시 로딩 화면 유지 대신 재시도 여지를 두고 로그아웃 안내는 profileError 경로에 맡김
        if (!cancelled) setTimeout(() => { if (!cancelled) onDone(row) }, 0)
      }
    })()
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  return <LoadingScreen />
}

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
    const on = () => {
      setLangKey(getLang())
      // 로그인 상태면 프로필에도 언어 저장 (알림 메일 언어) — 실패해도 무시
      supabase?.auth.getSession().then(({ data }) => {
        const uid = data.session?.user.id
        if (uid) supabase!.from('profiles').update({ lang: getLang() }).eq('user_id', uid).then(() => {})
      })
    }
    window.addEventListener('app:lang', on)
    return () => window.removeEventListener('app:lang', on)
  }, [])
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TopNav key={`nav-${langKey}`} />
      <AppRoutes key={langKey} />
    </Suspense>
  )
}

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null)
  // 로그인 후 지정 경로로 이동 (예: /admin에서 로그인 요청한 경우)
  useEffect(() => {
    if (!session) return
    try {
      const to = localStorage.getItem('post_login_path')
      if (to) { localStorage.removeItem('post_login_path'); if (window.location.pathname !== to) navigate(to) }
    } catch { /* ignore */ }
  }, [session])
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileLoadedFor, setProfileLoadedFor] = useState<string | null>(null) // 프로필 조회를 마친 user id
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileRetry, setProfileRetry] = useState(0)
  const [pendingAnswers, setPendingAnswers] = useState<OnboardingAnswers | null>(loadPending)
  const [stashChecked, setStashChecked] = useState<string | null>(null) // 서버 보관 답변 확인한 user id
  // 항상 홈에서 시작 — 미인증 답변이 남아 있으면 홈에 '이어서 인증하기' 배너를 보여줌
  // (만료 링크로 돌아온 경우만 이메일 화면부터)
  const [phase, setPhase] = useState<GuestPhase>(cameFromAuthError ? 'email' : 'home')
  const path = usePath() // F1: /schools 라우팅
  // 마지막 리포트 시즌 — 현재 시즌과 다르면 체크인 플로우부터
  // undefined = 아직 조회 전 (조회가 끝나기 전에 리포트를 먼저 그리면 안 됨)
  const [lastSeason, setLastSeason] = useState<string | null | undefined>(undefined)
  // TopNav 링크 구성용 — 온보딩 미완료 유저는 '홈'/'리포트' 분리
  useEffect(() => { broadcastOnboarded(session ? isOnboarded(profile) : true) }, [session, profile])
  const [checkinDone, setCheckinDone] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession((prev) => {
        // 콜백 안에서 다른 Supabase 호출을 바로 하면 auth 락 교착 가능 → 다음 틱으로 미룸.
        // SIGNED_IN은 탭 복귀·토큰 갱신 때도 재발행되므로 '세션 없음 → 있음' 전환일 때만 로그인으로 기록
        if (event === 'SIGNED_IN' && s && prev?.user.id !== s.user.id) setTimeout(() => logEvent(s.user.id, 'login'), 0)
        return s
      })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 세션 객체는 토큰 갱신(약 1시간마다·탭 복귀 시)마다 새로 생기므로 user id 기준으로만 프로필을 다시 불러옴
  // (세션 객체 기준이면 갱신 때마다 로딩 화면으로 바뀌며 리포트·원서 화면 상태가 날아감)
  const userId = session?.user.id ?? null

  // 접속자 집계용 하트비트 — 로그인 상태에서 접속 시 + 1분마다 last_seen 갱신 (운영 통계의 '현재 접속자', 실패는 무시)
  useEffect(() => {
    if (!supabase || !userId) return
    const beat = () => {
      supabase!.from('presence').upsert({ user_id: userId, last_seen: new Date().toISOString() }).then(() => {}, () => {})
    }
    beat()
    const iv = window.setInterval(() => { if (document.visibilityState === 'visible') beat() }, 60_000)
    const onVis = () => { if (document.visibilityState === 'visible') beat() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [userId])
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      setProfileLoadedFor(null)
      return
    }
    let cancelled = false
    setProfileError(null)
    loadProfile(userId)
      .then((p) => {
        if (cancelled) return
        setProfile(p)
        setProfileLoadedFor(userId)
      })
      .catch((e: unknown) => {
        // 조회 실패를 '프로필 없음'으로 오인하면 기존 사용자에게 온보딩을 다시 시키고 덮어쓰게 됨 → 에러 화면으로
        if (!cancelled) setProfileError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [userId, profileRetry])
  // 세션은 있는데 그 사용자의 프로필 조회가 아직 안 끝남 (effect 실행 전 첫 렌더 포함 — 온보딩 화면이 잠깐 비치는 일 방지)
  const profileLoading = userId !== null && profileLoadedFor !== userId && !profileError

  // 마지막 리포트 시즌 확인 (시즌 체크인 판단용)
  useEffect(() => {
    if (!userId || !profile || !supabase) {
      setLastSeason(undefined)
      return
    }
    supabase
      .from('reports')
      .select('season_label')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setLastSeason(data && data.length > 0 ? data[0].season_label : null)
      })
  }, [userId, profile])

  if (sessionLoading || profileLoading || (session && profile && lastSeason === undefined)) {
    return (
      <Screen>
        <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
      </Screen>
    )
  }

  // 프로필 조회 실패 화면 — 프로필이 필요한 화면(/app·/deadlines·리포트)에서만 사용, 둘러보기 계열은 profile=null로 그대로 열림
  const profileErrorScreen =
    session && profileError ? (
      <Screen>
        <div className="py-16 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('프로필을 불러오지 못했어요', "Couldn't load your profile")}</h1>
          <p className="mt-3 text-sm text-gray-500">{t('네트워크 상태를 확인하고 다시 시도해 주세요.', 'Check your connection and try again.')}</p>
          <p className="mt-2 text-xs text-gray-400">{profileError}</p>
          <button
            onClick={() => setProfileRetry((n) => n + 1)}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('다시 시도', 'Retry')}
          </button>
          <button
            onClick={() => supabase!.auth.signOut()}
            className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
          >
            {t('로그아웃', 'Log out')}
          </button>
        </div>
      </Screen>
    ) : null

  // 운영자 통계 (서버 함수가 이메일 화이트리스트로 권한 검사)
  if (path === '/admin' || path === '/admin/') {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo'))
      return <AdminDemo />
    if (!session)
      return (
        <Screen>
          <button onClick={() => navigate('/')} aria-label={t('홈으로', 'Back to home')} className="mb-2 rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <EmailStep redirectPath="/admin" title={t('운영자 로그인', 'Admin login')} minimal />
        </Screen>
      )
    return <AdminPage email={session.user.email ?? null} />
  }
  if (path === '/map' || path === '/map/') {
    return <MapPage profile={profile} />
  }
  // F1: 대학 둘러보기 — 로그인 여부와 무관하게 고유 URL로 접근 가능
  if (path === '/schools' || path === '/schools/') {
    return <SchoolsListPage profile={profile} userId={session?.user.id ?? null} onProfileChange={setProfile} />
  }
  // F2: 학교 비교 (?ids=1,2,3)
  if (path === '/compare' || path === '/compare/') {
    return <ComparePage profile={profile} />
  }
  // F5: 내 원서 (가상 Common App) — 로그인 전용, 9학년부터
  if (path === '/app' || path.startsWith('/app/')) {
    if (profileErrorScreen) return profileErrorScreen
    if (session && profile)
      return <AppRouter path={path} userId={session.user.id} profile={profile} onProfileChange={setProfile} />
    return (
      <Screen>
        <div className="py-16 text-center">
          <p className="text-4xl">📋</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('내 원서', 'My Application')}</h1>
          <p className="mt-3 text-sm text-gray-500">{t('로그인하면 바로 기록을 시작할 수 있어요 — 질문 없이.', 'Log in and start recording right away — no questions asked.')}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('로그인하러 가기', 'Go log in')}
          </button>
        </div>
      </Screen>
    )
  }
  // 전공 로드맵 (비로그인도 열람 가능, 계획 담기는 로그인 필요)
  if (path === '/majors' || path === '/majors/') {
    return <MajorsIndexPage />
  }
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
    return <Redirect to="/app/colleges" />
  }
  // 리포트·체크리스트 게이트 — 온보딩 미완료 유저 전용 진입점 (완료 유저·게스트는 '/'로)
  if (path === '/report' || path === '/report/') {
    if (session && profile && !isOnboarded(profile)) {
      return <GateFlow userId={session.user.id} profile={profile} onDone={setProfile} />
    }
    return <Redirect to="/" />
  }
  // F3: 마감 캘린더 (로그인 전용)
  if (path === '/targets' || path === '/targets/') {
    if (session && profile) return <TargetsPage profile={profile} />
    return <Redirect to="/" />
  }
  if (path === '/deadlines' || path === '/deadlines/') {
    if (profileErrorScreen) return profileErrorScreen
    if (session && profile) return <DeadlinesPage userId={session.user.id} profile={profile} />
    return (
      <Screen>
        <div className="py-16 text-center">
          <p className="text-4xl">🗓️</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('마감 캘린더', 'Deadline Calendar')}</h1>
          <p className="mt-3 text-sm text-gray-500">
            {t('로그인하면 목표 학교 기준 마감 캘린더를 바로 볼 수 있어요.', 'Log in to see the deadline calendar for your target schools.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('로그인하러 가기', 'Go log in')}
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

  if (profileErrorScreen) return profileErrorScreen

  // 로그인 완료 + 프로필 있음인데 새 온보딩 답변이 남아 있음 → 덮어쓸지 물어봄 (묵살하면 새 목표 학교가 반영 안 되는 버그)
  if (session && profile && pendingAnswers && isOnboarded(profile)) {
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
              markSeenGrade(session.user.id, row.grad_year)
              localStorage.removeItem(PENDING_KEY)
              setPendingAnswers(null)
              // reminder_opt_out 등 온보딩 답변에 없는 컬럼은 DB에서 유지되므로 로컬 상태도 기존 값 위에 덮어씀
              setProfile({ ...profile, ...row, user_id: session.user.id })
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

  // 로그인 완료 + 온보딩 미완료(스텁 프로필) → 기록 중심 메인 홈
  if (session && profile && !isOnboarded(profile)) {
    return <MainHome userId={session.user.id} profile={profile} />
  }

  // 로그인 완료 + 프로필 있음 → (새 시즌이면 체크인 먼저) 시즌 리포트 — 기존 유저 흐름 그대로
  if (session && profile) {
    const needsCheckin =
      !profile.graduated && !checkinDone && typeof lastSeason === 'string' && lastSeason !== currentSeasonLabel()
    return (
      <RolloverGate
        userId={session.user.id}
        profile={profile}
        onUpdateGradYear={async (gradYear) => {
          const updated = { ...profile, grad_year: gradYear, graduated: false }
          await saveProfile(session.user.id, updated)
          setProfile(updated)
        }}
        onGraduate={async () => {
          const updated = { ...profile, graduated: true }
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
          <WideScreen>
            <ReportView
              userId={session.user.id}
              profile={profile}
              onLogout={() => supabase!.auth.signOut()}
              onOpenGuide={() => setShowGuide(true)}
              onProfileChange={setProfile}
            />
          </WideScreen>
        )}
      </RolloverGate>
    )
  }

  // 로그인 완료 + 프로필 없음 → 닉네임 입력 후 저장 (온보딩 답변은 localStorage에, 없으면 서버 보관분을 가져옴)
  if (session) {
    const pending = loadPending()
    if (!pending && stashChecked !== session.user.id) {
      return <StashFetcher userId={session.user.id} onDone={(answers) => {
        if (answers) {
          localStorage.setItem(PENDING_KEY, JSON.stringify(answers.answers))
          if (answers.research_consent) localStorage.setItem(RESEARCH_CONSENT_KEY, '1')
          setPendingAnswers(answers.answers)
        }
        setStashChecked(session.user.id)
      }} />
    }
    if (!pending) {
      // 답변이 없으면 온보딩 강제 대신 최소 프로필을 만들고 바로 메인으로 (개편: 온보딩은 리포트 게이트에서)
      return <StubCreator userId={session.user.id} onDone={setProfile} />
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
            // 마운트 시 읽어둔 pendingAnswers 상태도 비워야 저장 직후 '새 답변으로 업데이트할까요?' 화면이 뜨지 않음
            setPendingAnswers(null)
            setProfile({ ...row, user_id: session.user.id })
          }}
        />
      </Screen>
    )
  }

  // 미로그인: 훅 랜딩 (개편 — 리포트 강제 진입 제거, CTA는 구글 로그인 하나)
  if (phase === 'email') {
    return (
      <Screen>
        <button
          onClick={() => setPhase('home')}
          aria-label={t('홈으로', 'Back to home')}
          className="mb-2 rounded-lg p-2 text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        {pendingAnswers && (
          <p className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {t('✍️ 예전에 작성해 둔 답변이 있어요 — 로그인하면 이어서 저장돼요.', '✍️ You have saved answers — log in and they will be saved.')}
          </p>
        )}
        <EmailStep />
      </Screen>
    )
  }
  return <LandingPage onEmailLogin={() => setPhase('email')} />
}
