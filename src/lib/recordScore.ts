import type { Activity, Honor, HonorLevel } from '../app/appData'

// F5-6 기록 기반 축 점수 (VIRTUAL_COMMONAPP_SPEC §5, 사용자 승인 2026-08-10)
// 기록이 있으면 온보딩 자가진단 대신 이 값을 쓴다. 기록이 없으면 null → 기존 방식 유지.

// 리더십 키워드 (직책 필드에 포함되면 리더십 축 가산) — 승인 목록
const LEADERSHIP_KEYWORDS = [
  '회장', '부회장', '부장', '차장', '창립', '설립', '캡틴', '주장', '편집장', '단장', '팀장', '대표', '리더',
  'president', 'vice president', 'founder', 'co-founder', 'captain', 'co-captain', 'lead', 'leader',
  'head', 'chair', 'director', 'editor-in-chief', 'editor', 'organizer', 'coordinator', 'manager',
]

export function isLeadershipPosition(position: string): boolean {
  const p = position.toLowerCase()
  return LEADERSHIP_KEYWORDS.some((k) => p.includes(k.toLowerCase()))
}

const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

// spike: 2년 이상 & 주 5시간 이상 활동 1개당 +25 (상한 75) + 그 활동에 연결된 수상 있으면 +25
export function spikeFromRecords(activities: Activity[], honors: Honor[]): number | null {
  if (activities.length === 0) return null
  const deep = activities.filter((a) => a.grades.length >= 2 && (a.hours_per_week ?? 0) >= 5)
  let score = Math.min(75, deep.length * 25)
  const linkedHonor = deep.some((a) => honors.some((h) => h.activity_id === a.id))
  if (linkedHonor) score += 25
  return cap(score)
}

// leadership: 리더십 직책 활동 1개당 +35 (상한 70) + 그중 2년 이상 지속 시 +30
export function leadershipFromRecords(activities: Activity[]): number | null {
  if (activities.length === 0) return null
  const lead = activities.filter((a) => isLeadershipPosition(a.position))
  let score = Math.min(70, lead.length * 35)
  if (lead.some((a) => a.grades.length >= 2)) score += 30
  return cap(score)
}

// validation: 수상 최고 레벨 — 교내 30 / 지역·주 60 / 전국 85 / 국제 100, 2개 이상이면 +10
const levelPts: Record<HonorLevel, number> = { school: 30, regional: 60, national: 85, international: 100 }
export function validationFromRecords(honors: Honor[]): number | null {
  const leveled = honors.filter((h) => h.level)
  if (leveled.length === 0) return null
  const best = Math.max(...leveled.map((h) => levelPts[h.level as HonorLevel] ?? 0))
  return cap(best + (leveled.length >= 2 ? 10 : 0))
}

export interface RecordOverrides {
  spike: number | null
  leadership: number | null
  validation: number | null
}

export function recordOverrides(activities: Activity[], honors: Honor[]): RecordOverrides {
  return {
    spike: spikeFromRecords(activities, honors),
    leadership: leadershipFromRecords(activities),
    validation: validationFromRecords(honors),
  }
}
