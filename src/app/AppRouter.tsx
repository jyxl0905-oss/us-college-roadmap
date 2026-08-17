import type { ProfileRow } from '../lib/profile'
import AppHome from './AppHome'
import ActivitiesTab from './ActivitiesTab'
import TestingTab from './TestingTab'
import EducationTab from './EducationTab'

interface AppRouterProps {
  path: string
  userId: string
  profile: ProfileRow
  onProfileChange: (p: ProfileRow) => void
}

// F5 내 원서 하위 라우팅 (/app, /app/activities, …) — 탭은 단계별로 추가
export default function AppRouter({ path, userId, profile, onProfileChange }: AppRouterProps) {
  const sub = path.replace(/^\/app\/?/, '').replace(/\/+$/, '')
  switch (sub) {
    case 'activities':
      return <ActivitiesTab userId={userId} />
    case 'testing':
      return <TestingTab userId={userId} profile={profile} onProfileChange={onProfileChange} />
    case 'education':
      return <EducationTab userId={userId} profile={profile} onProfileChange={onProfileChange} />
    default:
      return <AppHome userId={userId} profile={profile} />
  }
}
