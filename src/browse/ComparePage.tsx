import { useEffect, useState } from 'react'
import type { School, Tier } from '../lib/types'
import { loadSchools } from '../lib/schoolsCache'
import { navigate, slugify } from '../lib/router'
import { satBandMid } from '../lib/score'
import { majorLabel, directAdmitParent } from '../data/majors'
import type { ProfileRow } from '../lib/profile'
import { setPrefillSchoolIds } from './prefill'
import SchoolLogo from './SchoolLogo'
import { t, bilingual } from '../i18n'
import { timingLabel } from '../lib/academics'

const tierTitles: Record<Tier, string> = bilingual(
  { 1: 'Top 20', 2: '21–40위', 3: '41–60위' },
  { 1: 'Top 20', 2: 'Ranked 21–40', 3: 'Ranked 41–60' },
)

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
    loadSchools().then((list) =>
      setSchools(ids.map((id) => list.find((s) => s.id === id)).filter(Boolean) as School[]),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  const mySat =
    profile && profile.sat_status === 'taken' && profile.sat_band ? satBandMid[profile.sat_band] : null
  const myMajor =
    profile?.major_primary && profile.major_primary !== 'undecided' ? profile.major_primary : null

  if (schools === null) return <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
  if (schools.length < 2)
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-gray-500">{t('비교하려면 학교를 2개 이상 골라야 해요.', 'Pick at least 2 schools to compare.')}</p>
        <button onClick={() => navigate('/schools')} className="mt-4 text-blue-600 underline">
          {t('둘러보기에서 고르기', 'Pick from browse')}
        </button>
      </div>
    )

  // SAT mid-50 셀: 범위 + (로그인·응시 시) 내 위치 마커
  const satCell = (s: School) => {
    if (s.test_policy === 'test-free') return <span className="text-gray-500">{t('시험 미반영', 'Test-free')}</span>
    if (s.sat_mid50_low === null || s.sat_mid50_high === null)
      return <span className="text-gray-400">{t('미공개', 'Not disclosed')}</span>
    const span = s.sat_mid50_high - s.sat_mid50_low
    const pct =
      mySat !== null
        ? span > 0
          ? Math.max(0, Math.min(1, (mySat - s.sat_mid50_low) / span))
          : mySat >= s.sat_mid50_high ? 1 : 0
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
              title={t('내 SAT 위치', 'My SAT position')}
            />
          </div>
        )}
      </div>
    )
  }

  const boolCell = (v: boolean | null, yes: string, no: string) =>
    v === null ? <span className="text-gray-400">{t('미공개', 'Not disclosed')}</span> : v ? yes : no

  const rows: { label: string; render: (s: School) => React.ReactNode }[] = [
    { label: t('티어', 'Tier'), render: (s) => (s.kind === 'lac' ? `LAC #${s.lac_rank ?? '–'}` : tierTitles[s.tier]) },
    { label: t('SAT 중간 50%', 'SAT middle 50%'), render: satCell },
    {
      label: t('국제학생 합격률', 'Intl. accept rate'),
      render: (s) =>
        s.intl_accept_rate === null ? <span className="text-gray-400">{t('미공개', 'Not disclosed')}</span> : `${s.intl_accept_rate}%`,
    },
    { label: t('Need-blind (국제)', 'Need-blind (intl.)'), render: (s) => boolCell(s.need_blind_intl, t('예', 'Yes'), t('아니오 (need-aware)', 'No (need-aware)')) },
    {
      label: t('시험 정책', 'Test policy'),
      render: (s) =>
        s.test_policy === 'test-required'
          ? t('SAT/ACT 필수', 'SAT/ACT required')
          : s.test_policy === 'test-optional'
            ? 'Test-optional'
            : s.test_policy === 'test-free'
              ? t('시험 미반영', 'Test-free')
              : <span className="text-gray-400">{t('미공개', 'Not disclosed')}</span>,
    },
    { label: t('관심 표현 반영', 'Demonstrated interest'), render: (s) => boolCell(s.demonstrated_interest, t('반영함', 'Considered'), t('반영 안 함', 'Not considered')) },
    ...(myMajor
      ? [
          {
            label: t(`${majorLabel(myMajor)} 직접 선발`, `Direct admit: ${majorLabel(myMajor)}`),
            render: (s: School) =>
              s.direct_admit_majors.includes(directAdmitParent(myMajor) as string) ? (
                <span className="text-amber-700">{t('⚠️ 직접 선발', '⚠️ Direct admit')}</span>
              ) : (
                t('아니오', 'No')
              ),
          },
        ]
      : []),
    {
      // 재정지원: 국제학생 CDS H6 평균 (데이터 있으면)
      label: t('국제학생 평균 지원', 'Avg. intl aid'),
      render: (s) =>
        s.intl_aid_count != null && s.intl_aid_count > 0 && s.intl_aid_avg != null ? (
          <span className="text-xs">
            ${s.intl_aid_avg.toLocaleString('en-US')} <span className="text-gray-400">({s.intl_aid_count.toLocaleString()}{t('명', '')}{s.intl_aid_year ? ` · ${s.intl_aid_year}` : ''})</span>
          </span>
        ) : s.intl_aid_count === 0 ? (
          <span className="text-xs text-gray-400">{t('기록 없음', 'None reported')}</span>
        ) : (
          <span className="text-gray-400">{t('미확인', 'Not verified')}</span>
        ),
    },
    {
      // F3 데이터 연동: 마감 유형·시기 요약
      label: t('지원 마감', 'Deadlines'),
      render: (s) => {
        const parts = [
          s.ed_offered && `ED ${timingLabel(s.ed_timing) ?? '?'}`,
          s.rea_offered && `REA ${timingLabel(s.ea_timing) ?? '?'}`,
          s.ea_offered && `EA ${timingLabel(s.ea_timing) ?? '?'}`,
          s.ed2_offered && `ED II ${timingLabel(s.ed2_timing) ?? '?'}`,
          s.rd_timing && `RD ${timingLabel(s.rd_timing)}`,
        ].filter(Boolean)
        return parts.length > 0 ? (
          <span className="block max-w-40 whitespace-normal text-xs leading-relaxed">
            {parts.join(' · ')}
          </span>
        ) : (
          <span className="text-gray-400">{t('미공개', 'Not disclosed')}</span>
        )
      },
    },
    {
      label: t('이 학교가 보는 것', 'What they look for'),
      render: (s) =>
        s.what_they_value && s.what_they_value !== 'PLACEHOLDER' ? (
          <span className="block max-w-52 whitespace-normal text-xs leading-relaxed text-gray-600">
            {s.what_they_value}
          </span>
        ) : (
          <span className="text-gray-400">{t('미공개', 'Not disclosed')}</span>
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
          <button onClick={() => navigate('/schools')} aria-label={t('목록으로', 'Back to list')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('학교 비교', 'Compare Schools')}</h1>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border-2 border-gray-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-24 border-b border-gray-200 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-400">
                  {t('항목', 'Item')}
                </th>
                {schools.map((s) => (
                  <th key={s.id} className="min-w-36 border-b border-gray-200 px-3 py-3 text-left align-top">
                    <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="text-left">
                      <SchoolLogo schoolId={s.id} name={s.name} size={28} />
                      <span className="mt-1 block font-semibold leading-snug text-gray-900">{s.name}</span>
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
          <p className="mt-3 text-xs text-gray-400">{t('SAT 응시 후 프로필을 업데이트하면 내 위치 마커가 표시돼요.', 'Update your profile after taking the SAT to see your position marker.')}</p>
        )}
      </div>

      {/* 비로그인: 전환 CTA */}
      {!profile && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
          <button
            onClick={guestCta}
            className="mx-auto block w-full max-w-md rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('내 위치까지 보려면 리포트 받기', 'Get my report to see where I stand')}
          </button>
        </div>
      )}
    </div>
  )
}
