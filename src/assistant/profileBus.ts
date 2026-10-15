import { useEffect, useState } from 'react'
import type { ProfileRow } from '../lib/profile'

// 라우트 밖(AI 도우미 버튼)에서 현재 프로필을 읽고, 동의 변경을 App의 프로필 상태에 반영하기 위한 작은 연결 통로
// (App이 들고 있는 프로필을 통째로 저장하는 화면이 있어서, 따로 바꾼 값이 옛 값으로 덮이지 않게 App 상태도 함께 갱신)
type P = ProfileRow | null
let current: P = null
const subs = new Set<(p: P) => void>()
let patcher: ((patch: Partial<ProfileRow>) => void) | null = null

export const profileBus = {
  set(p: P) { current = p; subs.forEach((f) => f(p)) },
  registerPatcher(f: ((patch: Partial<ProfileRow>) => void) | null) { patcher = f },
  patch(x: Partial<ProfileRow>) { patcher?.(x) },
}

export function useBusProfile(): P {
  const [p, setP] = useState<P>(current)
  useEffect(() => {
    subs.add(setP)
    return () => { subs.delete(setP) }
  }, [])
  return p
}
