import { useEffect, useState } from 'react'
import type { ChecklistItem } from '../lib/types'
import { supabase } from '../lib/supabase'
import { filterChecklist, profileGrade, type ProfileRow } from '../lib/profile'
import { currentSeason, currentSeasonLabel, seasonLabelKo } from '../lib/academics'

const axisLabels: Record<ChecklistItem['axis'], string> = {
  rigor: '학업 강도',
  testing: '시험',
  spike: '대표 활동',
  leadership: '리더십',
  validation: '교외 인정',
  story: '스토리',
}

interface ChecklistViewProps {
  userId: string
  profile: ProfileRow
  onLogout: () => void
}

// 이번 시즌 체크리스트 — 항목 조회 + 체크(user_checks 저장)
export default function ChecklistView({ userId, profile, onLogout }: ChecklistViewProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seasonLabel = currentSeasonLabel()

  useEffect(() => {
    if (!supabase) return
    Promise.all([
      supabase.from('checklist_items').select('*'),
      supabase
        .from('user_checks')
        .select('item_id')
        .eq('user_id', userId)
        .eq('season_label', seasonLabel)
        .eq('status', 'done'),
    ]).then(([itemsRes, checksRes]) => {
      if (itemsRes.error) setError(itemsRes.error.message)
      else setItems(filterChecklist(itemsRes.data as ChecklistItem[], profile))
      if (checksRes.data) setCheckedIds(new Set(checksRes.data.map((c) => c.item_id)))
      setLoading(false)
    })
  }, [userId, seasonLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (itemId: number) => {
    if (!supabase) return
    const wasChecked = checkedIds.has(itemId)
    // 낙관적 업데이트
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
      // 실패 시 롤백
      setCheckedIds((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(itemId)
        else next.delete(itemId)
        return next
      })
    }
  }

  const doneCount = items.filter((i) => checkedIds.has(i.id)).length

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {profile.nickname}님의 체크리스트
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {profileGrade(profile)}학년 · {seasonLabelKo[currentSeason()]} 시즌
          </p>
        </div>
        <button onClick={onLogout} className="text-sm text-gray-400 underline">
          로그아웃
        </button>
      </div>

      {items.length > 0 && (
        <p className="mt-4 text-sm font-medium text-blue-700">
          {doneCount} / {items.length} 완료
        </p>
      )}

      {profile.school_accredited === 'unknown' && (
        <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <p className="font-medium text-amber-900">학교 국제 인증(WASC·Cognia) 확인하기</p>
          <p className="mt-0.5 text-sm text-amber-700">
            성적표 인정에 중요해요. 학교 행정실이나 홈페이지에서 확인해 보세요.
          </p>
        </div>
      )}
      {profile.applicant_status === 'unknown' && (
        <div className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <p className="font-medium text-amber-900">지원 신분(국제학생 여부) 확인하기</p>
          <p className="mt-0.5 text-sm text-amber-700">
            시민권·영주권 여부에 따라 준비 항목이 달라져요. 지금은 국제학생 기준으로 보여드려요.
          </p>
        </div>
      )}

      {loading && <p className="mt-8 text-center text-gray-400">불러오는 중…</p>}
      {error && <p className="mt-8 text-center text-sm text-red-600">불러오기 실패: {error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="mt-8 text-center text-sm text-gray-400">
          이번 시즌에 해당하는 항목이 아직 없어요.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const checked = checkedIds.has(item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${
                checked ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white active:bg-gray-50'
              }`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    checked ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'
                  }`}
                >
                  {checked && '✓'}
                </span>
                <span>
                  <span
                    className={`block font-medium ${checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-500">{item.why_how}</span>
                  <span className="mt-1.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {axisLabels[item.axis]}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
