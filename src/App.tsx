import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OnboardingAnswers } from './lib/types'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { answersToRow, loadProfile, saveProfile, type ProfileRow } from './lib/profile'
import { currentSeasonLabel } from './lib/academics'
import OnboardingFlow from './onboarding/OnboardingFlow'
import EmailStep from './auth/EmailStep'
import NicknameStep from './auth/NicknameStep'
import ReportView from './report/ReportView'
import PreviewReport from './report/PreviewReport'
import CheckinFlow from './checkin/CheckinFlow'

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

type GuestPhase = 'onboarding' | 'preview' | 'email'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<OnboardingAnswers | null>(loadPending)
  // 답변을 이미 마친 상태(예: 만료된 링크로 되돌아옴)면 온보딩·프리뷰를 건너뛰고 이메일로
  const [phase, setPhase] = useState<GuestPhase>(() => (loadPending() ? 'email' : 'onboarding'))
  // 마지막 리포트 시즌 — 현재 시즌과 다르면 체크인 플로우부터
  // undefined = 아직 조회 전 (조회가 끝나기 전에 리포트를 먼저 그리면 안 됨)
  const [lastSeason, setLastSeason] = useState<string | null | undefined>(undefined)
  const [checkinDone, setCheckinDone] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
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

  // .env 미설정 → 로컬 전용 모드 (온보딩 체험만)
  if (!isSupabaseConfigured) return <OnboardingFlow />

  if (sessionLoading || profileLoading || (session && profile && lastSeason === undefined)) {
    return (
      <Screen>
        <p className="mt-20 text-center text-gray-400">불러오는 중…</p>
      </Screen>
    )
  }

  // 로그인 완료 + 프로필 있음 → (새 시즌이면 체크인 먼저) 시즌 리포트
  if (session && profile) {
    const needsCheckin =
      !checkinDone && typeof lastSeason === 'string' && lastSeason !== currentSeasonLabel()
    if (needsCheckin) {
      return (
        <CheckinFlow
          userId={session.user.id}
          profile={profile}
          prevSeasonLabel={lastSeason}
          onDone={(updated) => {
            setProfile(updated)
            setCheckinDone(true)
          }}
        />
      )
    }
    return (
      <Screen>
        <ReportView
          userId={session.user.id}
          profile={profile}
          onLogout={() => supabase!.auth.signOut()}
        />
      </Screen>
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
            const row = answersToRow(pending, nickname)
            await saveProfile(session.user.id, row)
            localStorage.removeItem(PENDING_KEY)
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
