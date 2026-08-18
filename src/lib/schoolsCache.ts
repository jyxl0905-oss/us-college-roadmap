import { localizeRows } from '../i18n'
import type { School } from './types'
import { supabase } from './supabase'

// 전체 시드(120KB)는 DB 실패 시에만 지연 로드 — 메인 번들에 포함하지 않음
const loadSeed = () => import('../data/schools.seed.json').then((m) => m.default as School[])

// 63개교 전체 목록 — 둘러보기·상세·비교가 페이지 이동마다 다시 받지 않도록 세션 내 1회만 조회
let cache: Promise<School[]> | null = null

export function loadSchools(): Promise<School[]> {
  if (cache) return cache
  const client = supabase
  const p: Promise<School[]> = (async () => {
    if (!client) return loadSeed()
    const { data, error } = await client.from('schools').select('*')
    if (error || !data) {
      cache = null // 실패 시 다음 호출에서 재시도
      return loadSeed()
    }
    return localizeRows(data as School[])
  })()
  cache = p
  return p
}
