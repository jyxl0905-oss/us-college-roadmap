import { supabase } from './supabase'
import { DEMO_USER_ID } from '../demo/demoProfile'

export type AnalyticsEvent = 'signup' | 'login' | 'check' | 'report_view' | 'board_view' | 'round_assigned'

// 간단한 사용 로그 — 실패해도 앱 동작에 영향 없게 fire-and-forget
export function logEvent(userId: string, event: AnalyticsEvent): void {
  if (userId === DEMO_USER_ID) return // 체험 모드는 기록 안 함
  supabase
    ?.from('analytics_events')
    .insert({ user_id: userId, event })
    .then(({ error }) => {
      if (error) console.warn('analytics 기록 실패:', error.message)
    })
}
