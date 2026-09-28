import { t } from '../i18n'
import { USNEWS_EDITION } from './rankGroups'

type RankSchool = { kind?: 'university' | 'lac' | 'art'; usnews_rank: number | null; lac_rank?: number | null; usnews_rank_prev?: number | null; lac_rank_prev?: number | null }

// 전년 대비 변화 (양수 = 순위 상승)
export function rankDelta(s: RankSchool): number | null {
  const lac = s.kind === 'lac'
  const now = lac ? s.lac_rank : s.usnews_rank
  const prev = lac ? s.lac_rank_prev : s.usnews_rank_prev
  return now != null && prev != null ? prev - now : null
}

// 'US News #12 ▲3' — 종합대는 National Universities, LAC는 National Liberal Arts Colleges 기준. 미술·디자인 전문학교는 표시 안 함
export default function RankTag({ s, className = '' }: { s: RankSchool; className?: string }) {
  if (s.kind === 'art') return null
  const lac = s.kind === 'lac'
  const now = lac ? s.lac_rank : s.usnews_rank
  if (now == null) return null
  const d = rankDelta(s)
  const prev = lac ? s.lac_rank_prev : s.usnews_rank_prev
  const title = t(
    `US News ${USNEWS_EDITION} ${lac ? '리버럴 아츠 칼리지' : '종합대학'} 순위${prev != null ? ` · ${USNEWS_EDITION - 1}년판 #${prev}` : ''}`,
    `US News ${USNEWS_EDITION} ${lac ? 'National Liberal Arts Colleges' : 'National Universities'}${prev != null ? ` · ${USNEWS_EDITION - 1} edition #${prev}` : ''}`,
  )
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-800 ${className}`}>
      <span className="font-medium text-blue-600/80">US News{lac ? ' LAC' : ''}</span>#{now}
      {d != null && d > 0 && <span className="text-emerald-600">▲{d}</span>}
      {d != null && d < 0 && <span className="text-rose-600">▼{-d}</span>}
      {d === 0 && <span className="font-normal text-gray-400">–</span>}
    </span>
  )
}
