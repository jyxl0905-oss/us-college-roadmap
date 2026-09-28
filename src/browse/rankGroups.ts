import { bilingual, t } from '../i18n'

// 종합대 순위 그룹 — usnews_rank 기준 (둘러보기·지도 표시용. 목표 티어(profiles.target_tier)와는 별개). 7 = US News 종합대 순위 밖
export type UniGroup = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const uniGroupOf = (rank: number | null | undefined): UniGroup =>
  rank == null || rank >= 9999 ? 7 : rank <= 20 ? 1 : rank <= 40 ? 2 : rank <= 60 ? 3 : rank <= 80 ? 4 : rank <= 150 ? 5 : 6

export const uniGroupTitles: Record<UniGroup, string> = bilingual(
  { 1: 'Top 20', 2: '21–40위', 3: '41–60위', 4: '61–80위', 5: '81–150위', 6: '151위 이하', 7: '지역 순위·순위 밖' },
  { 1: 'Top 20', 2: 'Ranked 21–40', 3: 'Ranked 41–60', 4: 'Ranked 61–80', 5: 'Ranked 81–150', 6: 'Ranked 151+', 7: 'Regional / not ranked' },
)
export const uniGroups: UniGroup[] = [1, 2, 3, 4, 5, 6, 7]

// 지금 반영된 US News Best Colleges 판 (전년 대비 변화는 _prev 컬럼과 비교)
export const USNEWS_EDITION = 2027

// 학교 종류별 표시 — 종합대(US News 순위)·LAC(LAC 순위)·미술·디자인 전문학교(순위 없음)
type RankLike = { kind?: 'university' | 'lac' | 'art'; usnews_rank: number | null; lac_rank?: number | null; regional_rank?: number | null; regional_list?: string | null }

// US News 지역 순위 목록 (전국 순위가 없는 학교만) — 'ru-south' = Regional Universities South, 'rc-west' = Regional Colleges West
const REGION_KO: Record<string, string> = { north: '북부', south: '남부', midwest: '중서부', west: '서부' }
const REGION_EN: Record<string, string> = { north: 'North', south: 'South', midwest: 'Midwest', west: 'West' }
export function regionalLabel(list: string | null | undefined, short = false): string | null {
  const m = list?.match(/^(ru|rc)-(north|south|midwest|west)$/)
  if (!m) return null
  const college = m[1] === 'rc'
  return short
    ? t(`${REGION_KO[m[2]]} 지역`, `Regional ${REGION_EN[m[2]]}`)
    : t(`${REGION_KO[m[2]]} 지역 ${college ? '칼리지' : '대학'}`, `Regional ${college ? 'Colleges' : 'Universities'} ${REGION_EN[m[2]]}`)
}
export const isArtSchool = (s: { kind?: string }) => s.kind === 'art'
// 정렬 키 — 순위 없는 전문학교는 맨 뒤
export const rankSortKey = (s: { usnews_rank: number | null }) => s.usnews_rank ?? 9999
// 상세·비교 화면 배지: 'Top 20' / 'LAC #3' / '미술·디자인 전문학교'
export function rankBadge(s: RankLike): string {
  if (s.kind === 'lac') return `LAC #${s.lac_rank ?? '–'}`
  if (s.kind === 'art') return t('미술·디자인 전문학교', 'Art & design school')
  if (s.usnews_rank == null) return s.regional_rank != null ? `US News ${regionalLabel(s.regional_list)} #${s.regional_rank}` : t('US News 종합대 순위 밖', 'Not in US News national ranking')
  return uniGroupTitles[uniGroupOf(s.usnews_rank)]
}
// 목록 한 줄 표기: 'US News #12' / 'LAC #3' / '미술·디자인 전문'
export function rankShort(s: RankLike): string {
  if (s.kind === 'lac') return `LAC #${s.lac_rank ?? '–'}`
  if (s.kind === 'art') return t('미술·디자인 전문', 'Art & design')
  if (s.usnews_rank == null) return s.regional_rank != null ? `US News ${regionalLabel(s.regional_list, true)} #${s.regional_rank}` : t('US News 순위 밖', 'Not ranked (US News)')
  return `US News #${s.usnews_rank}`
}
