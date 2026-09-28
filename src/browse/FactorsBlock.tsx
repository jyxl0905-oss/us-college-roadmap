import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { t } from '../i18n'
import type { School } from '../lib/types'
import { loadC7, FACTORS, LEVELS, LEVEL_STYLE, factorLabel, levelLabel, type C7Row } from '../lib/c7'

export const testPolicyLabel = (p: School['test_policy']) =>
  p === 'test-required' ? t('SAT/ACT 필수', 'SAT/ACT required') : p === 'test-optional' ? t('선택 제출(test-optional)', 'Test-optional') : p === 'test-free' ? t('시험 미반영(test-free)', 'Test-free') : null

// 학교 상세: CDS C7 요소별 비중 — 대학이 공시한 그대로 4단계로 묶어 보여줌 (해석·예측 문구 없음)
export default function FactorsBlock({ school, gradYear }: { school: School; gradYear?: number | null }) {
  const [row, setRow] = useState<C7Row | null>(null)
  useEffect(() => {
    let alive = true
    void loadC7().then((m) => alive && setRow(m.get(school.id) ?? null))
    return () => { alive = false }
  }, [school.id])
  if (!row) return null

  const test = row.levels.standardized_tests
  const policy = testPolicyLabel(school.test_policy)
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <Scale size={18} strokeWidth={2} className="text-blue-600" />
        {t('이 학교가 공시한 평가 요소 비중', 'How this school weighs each factor')}
        <span className="text-xs font-normal text-gray-400">CDS {row.year} · C7</span>
      </p>

      {/* 시험 점수 — 비중과 제출 정책을 나란히 */}
      {(test || policy) && (
        <div className="mt-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-gray-900">{t('시험 점수(SAT·ACT)', 'Test scores (SAT/ACT)')}</span>
            {test && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[test].chip}`}>{levelLabel(test)}</span>}
            {policy && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">{t('제출: ', 'Submission: ')}{policy}</span>}
          </div>
          {row.note && (
            <p className="mt-1.5 text-[12px] leading-snug text-gray-700">
              {t(row.note[0], row.note[1])} <a href={row.note[2]} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 ↗', 'Official ↗')}</a>
            </p>
          )}
          {row.next && (
            <p className={`mt-1.5 rounded-md px-2 py-1 text-[12px] font-medium ${gradYear != null && gradYear >= row.next.entry ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'text-gray-700'}`}>
              {t(`${row.next.entry}년 가을 입학(Class of ${row.next.entry})부터 ${testPolicyLabel(row.next.policy)}로 바뀌어요`, `Changes to ${testPolicyLabel(row.next.policy)} from fall ${row.next.entry} entry (Class of ${row.next.entry})`)}
              {gradYear != null && gradYear >= row.next.entry && t(' — 내 입학 연도에 해당', ' — applies to you')}
              {' '}<a href={row.next.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 발표 ↗', 'Announcement ↗')}</a>
            </p>
          )}
          {school.test_policy === 'test-free' && test && test !== 'NC' ? (
            <p className="mt-1 text-[11px] leading-snug text-gray-500">
              {t(`공시 표에는 "${levelLabel(test)}"로 적혀 있지만, 이번 입시 공식 정책상 입학 심사에는 시험 점수를 쓰지 않아요.`, `The report lists "${levelLabel(test).toLowerCase()}", but under the current official policy test scores are not used in admission decisions.`)}
            </p>
          ) : test && policy && (
            <p className="mt-1 text-[11px] leading-snug text-gray-500">
              {t(`비중은 ${row.year} 공시 기준, 제출 정책은 이번 입시 기준이에요. 정책이 바뀐 학교는 둘이 다를 수 있어요.`, `The weight is from the ${row.year} report; the submission policy is for the current cycle. They can differ where a policy changed.`)}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {LEVELS.map((lv) => {
          const keys = FACTORS.filter((f) => row.levels[f] === lv)
          if (keys.length === 0) return null
          return (
            <div key={lv} className="flex gap-2">
              <span className="flex w-[4.5rem] shrink-0 items-center gap-1.5 self-start pt-1 text-[12px] font-semibold text-gray-600">
                <span className={`h-2.5 w-2.5 rounded-full ${LEVEL_STYLE[lv].dot}`} />{levelLabel(lv)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {keys.map((k) => <span key={k} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${LEVEL_STYLE[lv].chip}`}>{factorLabel(k)}</span>)}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        {t('대학이 공식 통계 자료(Common Data Set)에 직접 체크한 비중이에요. 실제 심사 방식은 학교마다 달라요. "고려"도 심사에 반영된다는 뜻이에요. ', 'Weights the college itself reported in its Common Data Set. Actual review differs by school. "Considered" still means it counts. ')}
        <a href={row.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 원문 ↗', 'Official source ↗')}</a>
      </p>
    </div>
  )
}
