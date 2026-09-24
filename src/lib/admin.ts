import { supabase } from './supabase'

// 운영자 여부 — 화이트리스트는 DB 함수 is_admin()에만 있음 (공개 코드에 이메일 노출 방지)
// 실제 권한은 admin_* DB 함수가 각각 다시 검사함. 이 값은 관리자 메뉴 표시용
let cache: { uid: string; value: Promise<boolean> } | null = null

export function checkIsAdmin(uid: string | null | undefined): Promise<boolean> {
  if (!uid || !supabase) return Promise.resolve(false)
  if (cache?.uid === uid) return cache.value
  const value: Promise<boolean> = (async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin')
      return !error && data === true
    } catch {
      return false
    }
  })()
  cache = { uid, value }
  return value
}
