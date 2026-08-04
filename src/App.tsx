import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OnboardingAnswers } from './lib/types'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { answersToRow, loadProfile, saveProfile, type ProfileRow } from './lib/profile'
import OnboardingFlow from './onboarding/OnboardingFlow'
import EmailStep from './auth/EmailStep'
import NicknameStep from './auth/NicknameStep'
import ChecklistView from './checklist/ChecklistView'

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

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [emailPhase, setEmailPhase] = useState(false) // 온보딩 완료 → 이메일 입력 화면

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

  // .env 미설정 → 로컬 전용 모드 (온보딩 체험만)
  if (!isSupabaseConfigured) return <OnboardingFlow />

  if (sessionLoading || profileLoading) {
    return (
      <Screen>
        <p className="mt-20 text-center text-gray-400">불러오는 중…</p>
      </Screen>
    )
  }

  // 로그인 완료 + 프로필 있음 → 체크리스트
  if (session && profile) {
    return (
      <Screen>
        <ChecklistView
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

  // 미로그인: 온보딩 → 이메일 입력
  if (emailPhase) {
    return (
      <Screen>
        <EmailStep />
      </Screen>
    )
  }
  return (
    <OnboardingFlow
      onComplete={(answers) => {
        localStorage.setItem(PENDING_KEY, JSON.stringify(answers))
        setEmailPhase(true)
      }}
    />
  )
}
