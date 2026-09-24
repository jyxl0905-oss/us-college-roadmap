import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { checkIsAdmin } from '../lib/admin'

// 상단 바·하단 탭·왼쪽 메뉴가 함께 쓰는 로그인/온보딩/관리자 상태
export function useNavState() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [onboarded, setOnboarded] = useState(true) // 기본 true = 기존 유저 동작 그대로
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
      void checkIsAdmin(data.session?.user.id).then(setAdmin)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoggedIn(!!s)
      void checkIsAdmin(s?.user.id).then(setAdmin)
    })
    const onOb = (e: Event) => setOnboarded((e as CustomEvent<boolean>).detail)
    window.addEventListener('app:onboarded', onOb)
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('app:onboarded', onOb) }
  }, [])

  // 개발 전용: ?navtest 로 로그인 후 메뉴 모양 확인 (프로덕션 빌드에서 제거됨)
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location.search.includes('navtest')) return { loggedIn: true, onboarded: true, admin: false }
  return { loggedIn, onboarded, admin }
}
