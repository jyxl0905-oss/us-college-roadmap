import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { t } from '../i18n'
import { rigorTrend, type CourseInput } from '../lib/courseRecs'

// 학년별 AP·IB·Honors 개수 추이 + 지난 학년 대비 판단 (사이트 참고 기준)
export default function RigorTrendBox({ courses, grade }: { courses: CourseInput[]; grade: number }) {
  const r = rigorTrend(courses, grade)
  if (r.verdict === 'none') return null
  const max = Math.max(1, ...r.years.map((y) => y.total))
  const up = r.verdict === 'strong_up' || r.verdict === 'up'
  const Icon = up ? TrendingUp : r.verdict === 'down' ? TrendingDown : Minus
  const tone = r.verdict === 'strong_up' ? 'text-emerald-700' : r.verdict === 'up' || r.verdict === 'steady_high' ? 'text-blue-700' : r.verdict === 'down' ? 'text-rose-700' : 'text-gray-700'
  const label = { strong_up: ['뚜렷한 상승', 'Clear upward trend'], up: ['조금 상승', 'Slightly up'], steady_high: ['높은 수준 유지', 'Holding a high level'], steady: ['제자리', 'Flat'], down: ['감소', 'Down'], no_prev: ['비교 기록 없음', 'Nothing to compare'] }[r.verdict]
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900">
        {t('수업 난이도 추이', 'Course rigor trend')}
        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${tone}`}><Icon size={14} strokeWidth={2.2} />{t(label[0], label[1])}</span>
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {r.years.map((y) => (
          <div key={y.grade} className="flex items-center gap-2 text-[11px]">
            <span className={`w-12 shrink-0 ${y.grade === grade ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{t(`${y.grade}학년`, `Gr ${y.grade}`)}</span>
            <div className="flex h-3.5 flex-1 overflow-hidden rounded bg-gray-100" style={{ maxWidth: `${(y.total / max) * 100}%` }}>
              <div className="bg-emerald-500" style={{ width: `${(y.ap / y.total) * 100}%` }} />
              <div className="bg-blue-400" style={{ width: `${(y.honors / y.total) * 100}%` }} />
            </div>
            <span className="w-28 shrink-0 text-right tabular-nums text-gray-600">AP·IB {y.ap} · H {y.honors} / {y.total}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 flex gap-3 text-[10.5px] text-gray-400">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />AP·IB</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-400" />Honors</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-gray-200" />{t('일반', 'Regular')}</span>
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-800">{t(r.ko, r.en)}</p>
      {r.years.length > 0 && r.years[0].grade > 9 && (
        <p className="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] leading-snug text-gray-600">{t(`${r.years[0].grade - 1}학년 이전 기록이 없어요. 전학·편입했다면 이전 학교 과목도 학업 탭에 적어두세요 — 대학에는 고등학교 전체(이전 학교 포함) 성적표가 들어가서, 추이도 9학년부터 보는 게 정확해요.`, `No courses before grade ${r.years[0].grade}. If you transferred, add your previous school’s courses too — colleges see transcripts from every high school you attended, so the trend reads best from grade 9.`)}</p>
      )}
      <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{t('Common App 학교 보고서에서 카운슬러는 학생의 과목 선택 난이도를 같은 학교 학생들과 비교해 평가해요. 그래서 개수의 절대값보다 "우리 학교에서 들을 수 있는 것 중 얼마나 도전했나"가 중요해요. 이 판단은 사이트 참고 기준이에요.', 'On the Common App school report, counselors rate your course rigor relative to other students at your school — so what matters is how much you challenged yourself within what your school offers, not a raw count. This read is a site guideline.')}</p>
    </div>
  )
}
