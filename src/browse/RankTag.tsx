import { t } from '../i18n'
import { USNEWS_EDITION, regionalLabel } from './rankGroups'

type RankSchool = { kind?: 'university' | 'lac' | 'art'; usnews_rank: number | null; lac_rank?: number | null; usnews_rank_prev?: number | null; lac_rank_prev?: number | null; regional_rank?: number | null; regional_list?: string | null }

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
  // 전국 순위가 없고 지역 순위만 있는 학교: 'US News 남부 지역 #12'
  if (now == null && !lac && s.regional_rank != null && regionalLabel(s.regional_list)) {
    return (
      <span title={t(`US News ${USNEWS_EDITION} ${regionalLabel(s.regional_list)} 순위 (전국 순위와 별개인 지역 순위)`, `US News ${USNEWS_EDITION} ${regionalLabel(s.regional_list)} (a regional ranking, separate from the national lists)`)} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-800 ${className}`}>
        <span className="font-medium text-teal-600/80">US News {regionalLabel(s.regional_list, true)}</span>#{s.regional_rank}
      </span>
    )
  }
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
