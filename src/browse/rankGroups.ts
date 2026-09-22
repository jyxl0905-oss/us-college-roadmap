import { bilingual, t } from '../i18n'

// 종합대 순위 그룹 — usnews_rank 기준 5단계 (둘러보기·지도 표시용. 목표 티어(profiles.target_tier)와는 별개)
export type UniGroup = 1 | 2 | 3 | 4 | 5

export const uniGroupOf = (rank: number): UniGroup =>
  rank <= 20 ? 1 : rank <= 40 ? 2 : rank <= 60 ? 3 : rank <= 80 ? 4 : 5

export const uniGroupTitles: Record<UniGroup, string> = bilingual(
  { 1: 'Top 20', 2: '21–40위', 3: '41–60위', 4: '61–80위', 5: '81위 이하' },
  { 1: 'Top 20', 2: 'Ranked 21–40', 3: 'Ranked 41–60', 4: 'Ranked 61–80', 5: 'Ranked 81+' },
)
export const uniGroups: UniGroup[] = [1, 2, 3, 4, 5]

// 학교 종류별 표시 — 종합대(US News 순위)·LAC(LAC 순위)·미술·디자인 전문학교(순위 없음)
type RankLike = { kind?: 'university' | 'lac' | 'art'; usnews_rank: number | null; lac_rank?: number | null }
export const isArtSchool = (s: { kind?: string }) => s.kind === 'art'
// 정렬 키 — 순위 없는 전문학교는 맨 뒤
export const rankSortKey = (s: { usnews_rank: number | null }) => s.usnews_rank ?? 9999
// 상세·비교 화면 배지: 'Top 20' / 'LAC #3' / '미술·디자인 전문학교'
export function rankBadge(s: RankLike): string {
  if (s.kind === 'lac') return `LAC #${s.lac_rank ?? '–'}`
  if (s.kind === 'art' || s.usnews_rank == null) return t('미술·디자인 전문학교', 'Art & design school')
  return uniGroupTitles[uniGroupOf(s.usnews_rank)]
}
// 목록 한 줄 표기: 'US News #12' / 'LAC #3' / '미술·디자인 전문'
export function rankShort(s: RankLike): string {
  if (s.kind === 'lac') return `LAC #${s.lac_rank ?? '–'}`
  if (s.kind === 'art' || s.usnews_rank == null) return t('미술·디자인 전문', 'Art & design')
  return `US News #${s.usnews_rank}`
}
