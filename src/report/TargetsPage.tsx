import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { t, localizeRows } from '../i18n'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { tierLabels } from '../onboarding/labels'
import SchoolCards from './SchoolCards'

// 목표 학교 전용 페이지 — 상단 바에서 바로 진입 (리포트 스크롤 없이). 카드 내용은 리포트의 목표 학교 섹션과 동일
export default function TargetsPage({ profile }: { profile: ProfileRow }) {
  const [schools, setSchools] = useState<School[] | null>(null)

  useEffect(() => {
    if (!supabase) return
    const q =
      profile.target_mode === 'schools' && profile.target_school_ids.length > 0
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : profile.target_mode === 'tier' && profile.target_tier
          ? supabase.from('schools').select('*').eq('tier', profile.target_tier)
          : null
    if (!q) { setSchools([]); return }
    q.then(({ data }) => setSchools(localizeRows((data ?? []) as School[]).sort((a, b) => a.usnews_rank - b.usnews_rank)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (schools === null) return <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">🎯 {t('내 목표 학교', 'My target schools')}</h1>
          <span className="text-xs text-gray-400">
            {profile.target_mode === 'tier' && profile.target_tier
              ? tierLabels[profile.target_tier]
              : t(`${schools.length}개`, `${schools.length} school${schools.length === 1 ? '' : 's'}`)}
          </span>
        </div>

        {schools.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white px-5 py-8 text-center">
            <p className="text-sm text-gray-500">{t('아직 목표 학교가 없어요.', 'No target schools yet.')}</p>
            <button onClick={() => navigate('/schools')} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white active:bg-blue-700">
              {t('대학 둘러보고 담기', 'Browse and add colleges')}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              {schools.length >= 2 && (
                <button
                  onClick={() => navigate(`/compare?ids=${schools.slice(0, 3).map((s) => s.id).join(',')}`)}
                  className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50"
                >
                  ⚖️ {t('비교하기', 'Compare')}
                </button>
              )}
              <button onClick={() => navigate('/schools')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50">
                {t('둘러보기 · 추가/제거', 'Browse · add/remove')}
              </button>
              <button onClick={() => navigate('/app/colleges')} className="rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 active:bg-blue-100">
                📋 {t('지원 라운드 정하기', 'Set rounds')}
              </button>
            </div>
            <div className="mt-4">
              <SchoolCards
                schools={schools}
                satBand={profile.sat_status === 'taken' ? profile.sat_band : null}
                majorPrimary={profile.major_primary}
              />
            </div>
            <p className="mt-4 text-xs text-gray-400">
              {t('학교 추가·제거는 둘러보기의 각 학교 카드에서, Reach/Match/Safety와 라운드는 내 원서 → 지원에서 정해요.', 'Add or remove schools from each card in Browse; set Reach/Match/Safety and rounds in My App → Colleges.')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
