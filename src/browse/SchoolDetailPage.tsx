import { useEffect, useState } from 'react'
import type { School, Tier } from '../lib/types'
import { supabase } from '../lib/supabase'
import { navigate, slugify } from '../lib/router'
import { majorLabel } from '../data/majors'
import { saveProfile, type ProfileRow } from '../lib/profile'
import { setPrefillSchoolIds } from './prefill'
import SchoolLogo from './SchoolLogo'
import schoolsSeed from '../data/schools.seed.json'

const tierTitles: Record<Tier, string> = { 1: 'Top 20', 2: '21–40위', 3: '41–60위' }

interface SchoolDetailPageProps {
  slug: string
  userId: string | null
  profile: ProfileRow | null
  onProfileChange: (p: ProfileRow) => void
}

// F1: 학교 상세 — 고유 URL 직접 접근 가능
export default function SchoolDetailPage({ slug, userId, profile, onProfileChange }: SchoolDetailPageProps) {
  const [school, setSchool] = useState<School | null | 'loading'>('loading')
  const [togglePending, setTogglePending] = useState(false)

  useEffect(() => {
    const pick = (list: School[]) => list.find((s) => slugify(s.name) === slug) ?? null
    if (!supabase) {
      setSchool(pick(schoolsSeed as School[]))
      return
    }
    supabase
      .from('schools')
      .select('*')
      .then(({ data }) => setSchool(pick((data ?? schoolsSeed) as School[])))
  }, [slug])

  if (school === 'loading')
    return <p className="mt-20 text-center text-gray-400">불러오는 중…</p>
  if (!school)
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-gray-500">학교를 찾을 수 없어요.</p>
        <button onClick={() => navigate('/schools')} className="mt-4 text-blue-600 underline">
          둘러보기로 돌아가기
        </button>
      </div>
    )

  const s = school
  const isTargeted = profile?.target_school_ids.includes(s.id) ?? false
  const dash = (v: string | number | null | undefined, suffix = '') =>
    v === null || v === undefined ? '미공개' : `${v}${suffix}`

  // 로그인 사용자: 내 목표에 추가/제거 (학교 선택 모드가 아니면 학교 모드로 전환하며 추가)
  const toggleTarget = async () => {
    if (!profile || !userId || togglePending) return
    setTogglePending(true)
    const base = profile.target_mode === 'schools' ? profile.target_school_ids : []
    const nextIds = isTargeted ? base.filter((id) => id !== s.id) : [...base, s.id]
    const updated: ProfileRow = {
      ...profile,
      target_mode: 'schools',
      target_tier: null,
      target_school_ids: nextIds,
    }
    await saveProfile(userId, updated)
    onProfileChange(updated)
    setTogglePending(false)
  }

  const cta = () => {
    if (profile) {
      navigate(`/#school-${s.id}`) // 내 리포트의 해당 학교 카드로
    } else {
      setPrefillSchoolIds([s.id])
      navigate('/')
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-32">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/schools')} aria-label="목록으로" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {tierTitles[s.tier]}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <SchoolLogo schoolId={s.id} name={s.name} size={52} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{s.name}</h1>
            <p className="text-gray-500">{s.name_ko}</p>
          </div>
        </div>

        {/* 지도 — 지연 로딩 임베드 */}
        <div className="mt-4 overflow-hidden rounded-xl border-2 border-gray-200">
          <iframe
            title={`${s.name} 지도`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(s.name)}&output=embed`}
            className="h-44 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {(s.intro_ko || s.location_note) && (
          <div className="mt-4 space-y-1.5 text-sm leading-relaxed text-gray-600">
            {s.intro_ko && <p>{s.intro_ko}</p>}
            {s.location_note && <p>{s.location_note}</p>}
          </div>
        )}

        {/* 인재상 카드 */}
        {s.what_they_value && s.what_they_value !== 'PLACEHOLDER' && (
          <div className="mt-5 rounded-xl bg-blue-600 px-4 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
              이 학교가 공식적으로 보는 것
            </p>
            <p className="mt-2 text-sm leading-relaxed">{s.what_they_value}</p>
            {s.source_url && (
              <a
                href={s.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-blue-200 underline"
              >
                공식 출처 보기 ↗
              </a>
            )}
          </div>
        )}

        {/* 데이터 블록 */}
        <div className="mt-5 divide-y divide-gray-100 rounded-xl border-2 border-gray-200 bg-white">
          {[
            [
              'SAT 중간 50%',
              s.test_policy === 'test-free'
                ? '시험 미반영 (test-free)'
                : s.sat_mid50_low && s.sat_mid50_high
                  ? `${s.sat_mid50_low} – ${s.sat_mid50_high}`
                  : '미공개',
            ],
            ['국제학생 합격률', dash(s.intl_accept_rate, '%')],
            [
              'Need-blind (국제학생)',
              s.need_blind_intl === true ? '네 — 재정 상황이 심사에 영향 없음' : s.need_blind_intl === false ? '아니요 (need-aware)' : '미공개',
            ],
            [
              '관심 표현(Demonstrated Interest)',
              s.demonstrated_interest === true ? '반영함' : s.demonstrated_interest === false ? '반영 안 함' : '미공개',
            ],
            [
              '시험 정책',
              s.test_policy === 'test-required'
                ? 'SAT/ACT 필수'
                : s.test_policy === 'test-optional'
                  ? 'Test-optional (선택 제출)'
                  : s.test_policy === 'test-free'
                    ? '시험 미반영'
                    : '미공개',
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
              <span className="shrink-0 text-sm text-gray-500">{label}</span>
              <span className="text-right text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* direct-admit 경고 */}
        {s.direct_admit_majors.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
            <p className="font-medium text-amber-900">⚠️ 전공 직접 선발(direct admit) 주의</p>
            <p className="mt-1 text-sm text-amber-800">
              이 학교는 다음 계열을 지원 시점에 전공·단과대 단위로 선발해요 — 해당 전공은 경쟁률이 따로
              움직이고 입학 후 전과도 어려울 수 있어요:
            </p>
            <p className="mt-1.5 text-sm font-medium text-amber-900">
              {s.direct_admit_majors.map((m) => majorLabel(m)).join(', ')}
            </p>
          </div>
        )}

        {/* 로그인: 목표 토글 */}
        {profile && (
          <button
            onClick={toggleTarget}
            disabled={togglePending}
            className={`mt-5 w-full rounded-xl border-2 px-4 py-3.5 font-semibold transition-colors ${
              isTargeted
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
            } disabled:opacity-50`}
          >
            {isTargeted ? '✓ 내 목표 학교예요 — 탭해서 제거' : '＋ 내 목표에 추가'}
          </button>
        )}
      </div>

      {/* 하단 고정 전환 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
        <button
          onClick={cta}
          className="mx-auto block w-full max-w-md rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          {profile ? '내 리포트에서 이 학교 보기' : '이 학교 합격자 범위에서 내 위치 확인하기 → 리포트 받기'}
        </button>
      </div>
    </div>
  )
}
