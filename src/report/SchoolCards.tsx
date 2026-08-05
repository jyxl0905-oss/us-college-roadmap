import type { School } from '../lib/types'
import { satBandMid } from '../lib/score'

interface SchoolCardsProps {
  schools: School[]
  satBand: string | null // 프로필 SAT 밴드 (응시한 경우만)
  majorPrimary: string | null
}

// 목표 학교 카드 (모바일 우선이라 테이블 대신 카드 목록)
export default function SchoolCards({ schools, satBand, majorPrimary }: SchoolCardsProps) {
  const mySat = satBand ? satBandMid[satBand] : null

  return (
    <div className="flex flex-col gap-3">
      {schools.map((s) => {
        const hasRange = s.sat_mid50_low !== null && s.sat_mid50_high !== null
        const markerPct =
          mySat !== null && hasRange
            ? Math.max(0, Math.min(1, (mySat - s.sat_mid50_low!) / (s.sat_mid50_high! - s.sat_mid50_low!)))
            : null
        const directAdmitWarning =
          majorPrimary !== null && s.direct_admit_majors.includes(majorPrimary)

        return (
          <div key={s.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-gray-900">{s.name}</p>
              <p className="shrink-0 text-xs text-gray-400">#{s.usnews_rank}</p>
            </div>
            <p className="text-sm text-gray-500">{s.name_ko}</p>

            {s.test_policy === 'test-free' ? (
              <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                이 학교는 SAT/ACT를 심사에 반영하지 않아요 (test-free)
              </p>
            ) : (
              hasRange && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>SAT {s.sat_mid50_low}</span>
                    <span>중간 50%</span>
                    <span>{s.sat_mid50_high}</span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-gray-100">
                    <div className="absolute inset-y-0 left-[25%] right-[25%] rounded-full bg-blue-200" />
                    {markerPct !== null && (
                      <div
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
                        style={{ left: `${Math.round(25 + markerPct * 50)}%` }}
                        title="내 SAT 위치"
                      />
                    )}
                  </div>
                  {markerPct === null && (
                    <p className="mt-1 text-xs text-gray-400">SAT 응시 후 내 위치가 표시돼요</p>
                  )}
                </div>
              )
            )}

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {s.test_policy === 'test-required' && (
                <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">SAT/ACT 필수</span>
              )}
              {s.test_policy === 'test-optional' && (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Test-optional</span>
              )}
              {s.intl_accept_rate !== null && (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                  국제학생 합격률 {s.intl_accept_rate}%
                </span>
              )}
              {s.need_blind_intl !== null && (
                <span
                  className={`rounded-full px-2 py-1 ${s.need_blind_intl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {s.need_blind_intl ? 'Need-blind (국제학생)' : 'Need-aware (국제학생)'}
                </span>
              )}
              {s.demonstrated_interest && (
                <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">
                  관심 표현(Demonstrated Interest) 반영
                </span>
              )}
            </div>

            {directAdmitWarning && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                ⚠️ 이 학교는 내 전공을 <strong>입학 시 직접 지원(direct admit)</strong>으로 뽑아요.
                전공별 경쟁률이 따로 있으니 전략이 필요해요.
              </p>
            )}

            {s.what_they_value && s.what_they_value !== 'PLACEHOLDER' && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                <span className="font-medium text-gray-600">이 학교가 보는 것:</span>{' '}
                {s.what_they_value}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
