import { bilingual } from '../i18n'

// 종합대 순위 그룹 — usnews_rank 기준 5단계 (둘러보기·지도 표시용. 목표 티어(profiles.target_tier)와는 별개)
export type UniGroup = 1 | 2 | 3 | 4 | 5

export const uniGroupOf = (rank: number): UniGroup =>
  rank <= 20 ? 1 : rank <= 40 ? 2 : rank <= 60 ? 3 : rank <= 80 ? 4 : 5

export const uniGroupTitles: Record<UniGroup, string> = bilingual(
  { 1: 'Top 20', 2: '21–40위', 3: '41–60위', 4: '61–80위', 5: '81위 이하' },
  { 1: 'Top 20', 2: 'Ranked 21–40', 3: 'Ranked 41–60', 4: 'Ranked 61–80', 5: 'Ranked 81+' },
)
export const uniGroups: UniGroup[] = [1, 2, 3, 4, 5]
