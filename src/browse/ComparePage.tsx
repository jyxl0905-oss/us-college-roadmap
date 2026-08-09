import { useEffect, useState } from 'react'
import type { School, Tier } from '../lib/types'
import { supabase } from '../lib/supabase'
import { navigate, slugify } from '../lib/router'
import { satBandMid } from '../lib/score'
import { majorLabel } from '../data/majors'
import type { ProfileRow } from '../lib/profile'
import { setPrefillSchoolIds } from './prefill'
import schoolsSeed from '../data/schools.seed.json'

const tierTitles: Record<Tier, string> = { 1: 'Top 20', 2: '21–40위', 3: '41–60위' }

// URL ?ids=3,1,5 → 비교할 학교 id (최대 3)
export function compareIdsFromUrl(): number[] {
  const raw = new URLSearchParams(window.location.search).get('ids') ?? ''
  return [...new Set(raw.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 3)
}

interface ComparePageProps {
  profile: ProfileRow | null
}

// F2: 학교 비교 테이블 — 열=학교, 항목명 열은 가로 스크롤 시 고정
export default function ComparePage({ profile }: ComparePageProps) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const ids = compareIdsFromUrl()

  useEffect(() => {
    const pick = (list: School[]) =>
      ids.map((id) => list.find((s) => s.id === id)).filter(Boolean) as School[]
    if (!supabase) {
      setSchools(pick(schoolsSeed as School[]))
      return
    }
    supabase
      .from('schools')
      .select('*')
      .in('id', ids)
      .then(({ data }) => setSchools(pick((data ?? schoolsSeed) as School[])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  const mySat =
    profile && profile.sat_status === 'taken' && profile.sat_band ? satBandMid[profile.sat_band] : null
  const myMajor =
    profile?.major_primary && profile.major_primary !== 'undecided' ? profile.major_primary : null

  if (schools === null) return <p className="mt-20 text-center text-gray-400">불러오는 중…</p>
  if (schools.length < 2)
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-gray-500">비교하려면 학교를 2개 이상 골라야 해요.</p>
        <button onClick={() => navigate('/schools')} className="mt-4 text-blue-600 underline">
          둘러보기에서 고르기
        </button>
      </div>
    )

  // SAT mid-50 셀: 범위 + (로그인·응시 시) 내 위치 마커
  const satCell = (s: School) => {
    if (s.test_policy === 'test-free') return <span className="text-gray-500">시험 미반영</span>
    if (s.sat_mid50_low === null || s.sat_mid50_high === null)
      return <span className="text-gray-400">미공개</span>
    const pct =
      mySat !== null
        ? Math.max(0, Math.min(1, (mySat - s.sat_mid50_low) / (s.sat_mid50_high - s.sat_mid50_low)))
        : null
    return (
      <div>
        <span className="font-medium">{s.sat_mid50_low}–{s.sat_mid50_high}</span>
        {pct !== null && (
          <div className="relative mt-1.5 h-1.5 w-24 rounded-full bg-gray-100">
            <div className="absolute inset-y-0 left-[25%] right-[25%] rounded-full bg-blue-200" />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
              style={{ left: `${Math.round(25 + pct * 50)}%` }}
              title="내 SAT 위치"
            />
          </div>
        )}
      </div>
    )
  }

  const boolCell = (v: boolean | null, yes: string, no: string) =>
    v === null ? <span className="text-gray-400">미공개</span> : v ? yes : no

  const rows: { label: string; render: (s: School) => React.ReactNode }[] = [
    { label: '티어', render: (s) => tierTitles[s.tier] },
    { label: 'SAT 중간 50%', render: satCell },
    {
      label: '국제학생 합격률',
      render: (s) =>
        s.intl_accept_rate === null ? <span className="text-gray-400">미공개</span> : `${s.intl_accept_rate}%`,
    },
    { label: 'Need-blind (국제)', render: (s) => boolCell(s.need_blind_intl, '예', '아니오 (need-aware)') },
    {
      label: '시험 정책',
      render: (s) =>
        s.test_policy === 'test-required'
          ? 'SAT/ACT 필수'
          : s.test_policy === 'test-optional'
            ? 'Test-optional'
            : s.test_policy === 'test-free'
              ? '시험 미반영'
              : <span className="text-gray-400">미공개</span>,
    },
    { label: '관심 표현 반영', render: (s) => boolCell(s.demonstrated_interest, '반영함', '반영 안 함') },
    ...(myMajor
      ? [
          {
            label: `${majorLabel(myMajor)} 직접 선발`,
            render: (s: School) =>
              s.direct_admit_majors.includes(myMajor) ? (
                <span className="text-amber-700">⚠️ 직접 선발</span>
              ) : (
                '아니오'
              ),
          },
        ]
      : []),
    {
      label: '이 학교가 보는 것',
      render: (s) =>
        s.what_they_value && s.what_they_value !== 'PLACEHOLDER' ? (
          <span className="block max-w-52 whitespace-normal text-xs leading-relaxed text-gray-600">
            {s.what_they_value}
          </span>
        ) : (
          <span className="text-gray-400">미공개</span>
        ),
    },
  ]

  const guestCta = () => {
    setPrefillSchoolIds(schools.map((s) => s.id))
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-2xl px-5 py-6 pb-28">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/schools')} aria-label="목록으로" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">학교 비교</h1>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border-2 border-gray-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-24 border-b border-gray-200 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-400">
                  항목
                </th>
                {schools.map((s) => (
                  <th key={s.id} className="min-w-36 border-b border-gray-200 px-3 py-3 text-left align-top">
                    <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="text-left">
                      <span className="block font-semibold leading-snug text-gray-900">{s.name}</span>
                      <span className="mt-0.5 block text-xs font-normal text-gray-500">{s.name_ko}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-gray-100 last:border-b-0">
                  <td className="sticky left-0 z-10 bg-gray-50 px-3 py-3 align-top text-xs font-medium text-gray-500">
                    {row.label}
                  </td>
                  {schools.map((s) => (
                    <td key={s.id} className="px-3 py-3 align-top text-gray-900">
                      {row.render(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mySat === null && profile && (
          <p className="mt-3 text-xs text-gray-400">SAT 응시 후 프로필을 업데이트하면 내 위치 마커가 표시돼요.</p>
        )}
      </div>

      {/* 비로그인: 전환 CTA */}
      {!profile && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
          <button
            onClick={guestCta}
            className="mx-auto block w-full max-w-md rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            내 위치까지 보려면 리포트 받기
          </button>
        </div>
      )}
    </div>
  )
}
