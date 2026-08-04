import { useEffect, useState } from 'react'
import type { ChecklistItem, School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { filterChecklist, profileGrade, type ProfileRow } from '../lib/profile'
import { currentSeason, currentSeasonLabel, seasonLabelKo, nextCheckinKo } from '../lib/academics'
import { computeScores, weakestAxis, axisKo, axisDiagnosis } from '../lib/score'
import { majorLabel } from '../data/majors'
import { tierLabels } from '../onboarding/labels'
import RadarChart from './RadarChart'
import AoBox from './AoBox'
import SchoolCards from './SchoolCards'
import ChecklistSection from './ChecklistSection'

interface ReportViewProps {
  userId: string
  profile: ProfileRow
  onLogout: () => void
}

// 로그인 후 메인 화면 — 시즌 리포트 (차트·학교·체크리스트)
export default function ReportView({ userId, profile, onLogout }: ReportViewProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seasonLabel = currentSeasonLabel()
  const grade = profileGrade(profile)
  const isIntl = profile.applicant_status !== 'domestic'

  useEffect(() => {
    if (!supabase) return
    const schoolsQuery =
      profile.target_mode === 'schools'
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : profile.target_mode === 'tier' && profile.target_tier
          ? supabase.from('schools').select('*').eq('tier', profile.target_tier)
          : null

    Promise.all([
      supabase.from('checklist_items').select('*'),
      supabase
        .from('user_checks')
        .select('item_id')
        .eq('user_id', userId)
        .eq('season_label', seasonLabel)
        .eq('status', 'done'),
      schoolsQuery ?? Promise.resolve({ data: [], error: null }),
    ]).then(([itemsRes, checksRes, schoolsRes]) => {
      if (itemsRes.error) setError(itemsRes.error.message)
      else setItems(filterChecklist(itemsRes.data as ChecklistItem[], profile))
      if (checksRes.data) setCheckedIds(new Set(checksRes.data.map((c) => c.item_id)))
      if (schoolsRes.data) {
        const list = schoolsRes.data as School[]
        setSchools([...list].sort((a, b) => a.usnews_rank - b.usnews_rank))
      }
      setLoading(false)
    })
  }, [userId, seasonLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (itemId: number) => {
    if (!supabase) return
    const wasChecked = checkedIds.has(itemId)
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (wasChecked) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    const result = wasChecked
      ? await supabase
          .from('user_checks')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', itemId)
          .eq('season_label', seasonLabel)
      : await supabase
          .from('user_checks')
          .upsert({ user_id: userId, item_id: itemId, season_label: seasonLabel, status: 'done' })
    if (result.error) {
      setCheckedIds((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(itemId)
        else next.delete(itemId)
        return next
      })
    }
  }

  const checkedItems = items.filter((i) => checkedIds.has(i.id))
  const scores = computeScores(profile, checkedItems)
  const weakest = weakestAxis(scores)
  const commonItems = items.filter((i) => !i.intl_only)
  const intlItems = items.filter((i) => i.intl_only)

  const targetText =
    profile.target_mode === 'schools'
      ? schools.map((s) => s.name).join(' · ')
      : profile.target_mode === 'tier' && profile.target_tier
        ? tierLabels[profile.target_tier]
        : '목표 미정'

  if (loading) return <p className="mt-20 text-center text-gray-400">리포트 만드는 중…</p>
  if (error) return <p className="mt-20 text-center text-sm text-red-600">불러오기 실패: {error}</p>

  return (
    <div className="pb-10">
      {/* 1. 프로필 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.nickname}님의 시즌 리포트</h1>
          <p className="mt-1 text-sm text-gray-500">
            {grade}학년 · {majorLabel(profile.major_primary)} ·{' '}
            {seasonLabelKo[currentSeason()]}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{targetText}</p>
        </div>
        <button onClick={onLogout} className="shrink-0 text-sm text-gray-400 underline">
          로그아웃
        </button>
      </div>

      {/* 2. AO 박스 */}
      <div className="mt-5">
        <AoBox grade={grade} />
      </div>

      {/* 3. 시즌 진행률 */}
      {items.length > 0 && (
        <div className="mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-gray-900">이번 시즌 진행률</p>
            <p className="text-sm font-medium text-blue-700">
              {checkedItems.length} / {items.length}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.round((checkedItems.length / items.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. 6축 밸런스 + 약한 축 진단 */}
      <div className="mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <p className="font-semibold text-gray-900">6축 밸런스</p>
        <div className="mt-2">
          <RadarChart scores={scores} />
        </div>
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
          <strong>{axisKo[weakest]}</strong> 축이 가장 약해요. {axisDiagnosis[weakest]}
        </p>
      </div>

      {/* 5. 목표 학교 */}
      {schools.length > 0 && (
        <div className="mt-5">
          <h2 className="font-semibold text-gray-900">목표 학교</h2>
          <div className="mt-3">
            <SchoolCards
              schools={schools}
              satBand={profile.sat_status === 'taken' ? profile.sat_band : null}
              majorPrimary={profile.major_primary}
            />
          </div>
        </div>
      )}

      {/* 확인 필요 안내 */}
      {(profile.school_accredited === 'unknown' || profile.applicant_status === 'unknown') && (
        <div className="mt-5 flex flex-col gap-2">
          {profile.school_accredited === 'unknown' && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-medium text-amber-900">학교 국제 인증(WASC·Cognia) 확인하기</p>
              <p className="mt-0.5 text-sm text-amber-700">
                성적표 인정에 중요해요. 학교 행정실이나 홈페이지에서 확인해 보세요.
              </p>
            </div>
          )}
          {profile.applicant_status === 'unknown' && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-medium text-amber-900">지원 신분(국제학생 여부) 확인하기</p>
              <p className="mt-0.5 text-sm text-amber-700">
                시민권·영주권 여부에 따라 준비 항목이 달라져요. 지금은 국제학생 기준이에요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. 이번 시즌 체크리스트 */}
      <div className="mt-5">
        <h2 className="font-semibold text-gray-900">이번 시즌 체크리스트</h2>
        {commonItems.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">이번 시즌 공통 항목이 아직 없어요.</p>
        )}
        <div className="mt-3">
          <ChecklistSection items={commonItems} checkedIds={checkedIds} onToggle={toggle} />
        </div>
      </div>

      {/* 7. 국제학생 섹션 */}
      {isIntl && intlItems.length > 0 && (
        <div className="mt-5">
          <h2 className="font-semibold text-gray-900">국제학생 체크 (International)</h2>
          <div className="mt-3">
            <ChecklistSection items={intlItems} checkedIds={checkedIds} onToggle={toggle} />
          </div>
        </div>
      )}

      {/* 8. 푸터 */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>미국 대입 로드맵 · 시즌마다 돌아와서 체크하세요</p>
        <p className="mt-1">
          다음 체크인: <strong className="text-gray-500">{nextCheckinKo()}</strong>
        </p>
      </div>
    </div>
  )
}
