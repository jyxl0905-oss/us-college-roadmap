import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OnboardingAnswers } from './lib/types'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { answersToRow, loadProfile, saveProfile, type ProfileRow } from './lib/profile'
import { currentSeasonLabel } from './lib/academics'
import OnboardingFlow from './onboarding/OnboardingFlow'
import EmailStep, { RESEARCH_CONSENT_KEY } from './auth/EmailStep'
import NicknameStep from './auth/NicknameStep'
import ReportView from './report/ReportView'
import PreviewReport from './report/PreviewReport'
import CheckinFlow from './checkin/CheckinFlow'
import RolloverGate from './RolloverGate'
import GuideView from './report/GuideView'
import SchoolsListPage from './browse/SchoolsListPage'
import SchoolDetailPage from './browse/SchoolDetailPage'
import ComparePage from './browse/ComparePage'
import DeadlinesPage from './deadlines/DeadlinesPage'
import { usePath, navigate } from './lib/router'
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<OnboardingAnswers | null>(loadPending)
  // 답변을 이미 마친 상태(예: 만료된 링크로 되돌아옴)면 온보딩·프리뷰를 건너뛰고 이메일로
  const [phase, setPhase] = useState<GuestPhase>(() => (loadPending() ? 'email' : 'home'))
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
        <p className="mt-20 text-center text-gray-400">불러오는 중…</p>
      </Screen>
    )
  }

  // F1: 대학 둘러보기 — 로그인 여부와 무관하게 고유 URL로 접근 가능
  if (path === '/schools' || path === '/schools/') {
    return <SchoolsListPage profile={profile} />
  }
  // F2: 학교 비교 (?ids=1,2,3)
  if (path === '/compare' || path === '/compare/') {
    return <ComparePage profile={profile} />
  }
  // F3: 마감 캘린더 (로그인 전용)
  if (path === '/deadlines' || path === '/deadlines/') {
    if (profile) return <DeadlinesPage profile={profile} />
    return (
      <Screen>
        <div className="py-16 text-center">
          <p className="text-4xl">🗓️</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">마감 캘린더</h1>
          <p className="mt-3 text-sm text-gray-500">
            내 목표 학교 기준 캘린더는 리포트를 받은 뒤 볼 수 있어요.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            내 리포트 받기
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
          <p className="text-5xl">🎓</p>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">미국 대학 입시 로드맵</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            학년·전공·목표 학교에 맞는 시즌별 체크리스트로
            <br />
            4년을 관리하는 툴이에요.
          </p>
          <button
            onClick={() => setPhase('onboarding')}
            className="mt-8 w-full rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white active:bg-blue-700"
          >
            내 리포트 받기
          </button>
          <button
            onClick={() => navigate('/schools')}
            className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-4 font-semibold text-gray-700 active:bg-gray-50"
          >
            대학 둘러보기
          </button>
          <button onClick={() => setPhase('email')} className="mt-6 text-sm text-gray-400 underline">
            이미 가입했어요 — 이메일로 로그인
          </button>
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
