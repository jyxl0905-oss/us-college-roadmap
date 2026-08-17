import type { ProfileRow } from '../lib/profile'
import AppHome from './AppHome'

interface AppRouterProps {
  path: string
  userId: string
  profile: ProfileRow
}

// F5 내 원서 하위 라우팅 (/app, /app/activities, …) — 탭은 단계별로 추가
export default function AppRouter({ path, userId, profile }: AppRouterProps) {
  const sub = path.replace(/^\/app\/?/, '').replace(/\/+$/, '')
  switch (sub) {
    default:
      return <AppHome userId={userId} profile={profile} />
  }
}
