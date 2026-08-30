import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import { fitOrder, fitLabels, type Fit } from '../board/boardLogic'

// 목표학교 티어(예측) 선택 칩 — "네 생각엔 이 학교, 너한테 뭐야?"
// 저장은 두 곳: applications.fit (지원 보드와 공유되는 실사용 값) + predictions (예측 기록, 데이터 분류와의 비교용)
export const fitChipColors: Record<Fit, string> = {
  reach: 'border-[#E74C3C] bg-[#E74C3C]/10 text-[#E74C3C]',
  hard_target: 'border-[#F39C12] bg-[#F39C12]/10 text-[#B9770E]',
  target: 'border-[#F1C40F] bg-[#F1C40F]/10 text-[#9A7D0A]',
  safety: 'border-[#27AE60] bg-[#27AE60]/10 text-[#27AE60]',
}

export async function saveFit(userId: string, schoolId: number, fit: Fit, dataFit: Fit | null): Promise<boolean> {
  if (!supabase) return false
  // applications: 기존 행 값 보존을 위해 select 후 upsert (보드의 round·status를 덮어쓰지 않게)
  const { data: prev } = await supabase
    .from('applications')
    .select('round,status,student_deadline')
    .eq('user_id', userId)
    .eq('school_id', schoolId)
    .maybeSingle()
  const { error } = await supabase.from('applications').upsert({
    user_id: userId,
    school_id: schoolId,
    round: prev?.round ?? null,
    status: prev?.status ?? 'preparing',
    student_deadline: prev?.student_deadline ?? null,
    fit,
    updated_at: new Date().toISOString(),
  })
  if (error) return false
  // predictions: 예측 기록 (실패해도 무시 — 기록용)
  await supabase
    .from('predictions')
    .upsert({ user_id: userId, school_id: schoolId, user_fit: fit, data_fit: dataFit, updated_at: new Date().toISOString() }, { onConflict: 'user_id,school_id' })
    .then(() => {}, () => {})
  return true
}

export default function FitPicker({ userId, schoolId, value, dataFit, onSaved, size = 'sm' }: {
  userId: string
  schoolId: number
  value: Fit | null
  dataFit: Fit | null // 온보딩 완료 + 데이터 있으면 계산값, 아니면 null
  onSaved?: (fit: Fit) => void
  size?: 'sm' | 'xs'
}) {
  const [busy, setBusy] = useState(false)
  const [current, setCurrent] = useState<Fit | null>(value)

  const pick = async (f: Fit) => {
    if (busy) return
    setBusy(true)
    const ok = await saveFit(userId, schoolId, f, dataFit)
    setBusy(false)
    if (!ok) {
      alert(t('저장에 실패했어요. 네트워크를 확인해 주세요.', 'Could not save. Check your connection.'))
      return
    }
    setCurrent(f)
    onSaved?.(f)
  }

  const pad = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  return (
    <div className="flex flex-wrap gap-1.5">
      {fitOrder.map((f) => (
        <button
          key={f}
          disabled={busy}
          onClick={() => void pick(f)}
          className={`rounded-full border-2 font-semibold ${pad} ${
            current === f ? fitChipColors[f] : 'border-gray-200 bg-white text-gray-500'
          }`}
        >
          {fitLabels[f]}
        </button>
      ))}
    </div>
  )
}
