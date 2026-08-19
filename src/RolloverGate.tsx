import { useEffect, useState } from 'react'
import type { ProfileRow } from './lib/profile'
import { gradeFromGradYear, currentSchoolYearEnd } from './lib/academics'
import { t } from './i18n'

interface RolloverGateProps {
  userId: string
  profile: ProfileRow
  onUpdateGradYear: (gradYear: number) => Promise<void>
  children: React.ReactNode
}

const seenKey = (userId: string) => `seen_grade_${userId}`

// 사용자가 직접 졸업연도를 바꾼 직후(온보딩 답변으로 프로필 업데이트 등)에는 '새 학년' 팝업이 뜨지 않도록 기준 학년을 갱신
export function markSeenGrade(userId: string, gradYear: number | null): void {
  if (gradYear) localStorage.setItem(seenKey(userId), String(gradeFromGradYear(gradYear)))
}

// 매년 8월 1일 학년 롤오버 — 마지막으로 본 학년과 달라지면 확인 팝업을 먼저 보여줌
export default function RolloverGate({ userId, profile, onUpdateGradYear, children }: RolloverGateProps) {
  const key = seenKey(userId)
  const rawGrade = profile.grad_year ? gradeFromGradYear(profile.grad_year) : null
  const [seenGrade] = useState(() => Number(localStorage.getItem(key) ?? '0'))
  const [acked, setAcked] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // 첫 방문이면 현재 학년만 기록 (팝업 없음)
  useEffect(() => {
    if (rawGrade !== null && seenGrade === 0) localStorage.setItem(key, String(rawGrade))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const needsConfirm = !acked && rawGrade !== null && seenGrade > 0 && rawGrade !== seenGrade

  if (!needsConfirm) return <>{children}</>

  const confirm = () => {
    localStorage.setItem(key, String(rawGrade))
    setAcked(true)
  }

  const gradYearOptions = Array.from({ length: 5 }, (_, i) => currentSchoolYearEnd() + i)

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-8">
        {editing ? (
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('졸업연도를 다시 골라주세요', 'Pick your graduation year again')}</h1>
            <div className="mt-5 flex flex-col gap-3">
              {gradYearOptions.map((year) => (
                <button
                  key={year}
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    await onUpdateGradYear(year)
                    localStorage.setItem(key, String(gradeFromGradYear(year)))
                    setAcked(true)
                  }}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50 disabled:opacity-50"
                >
                  Class of {year}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-16 rounded-2xl border-2 border-blue-200 bg-white px-5 py-6 text-center">
            <p className="text-3xl">🎒</p>
            <h1 className="mt-3 text-xl font-bold text-gray-900">{t('새 학년이 시작됐어요!', 'A new school year has started!')}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {rawGrade !== null && rawGrade <= 12
                ? t(`Class of ${profile.grad_year} 기준으로 이제 ${rawGrade}학년이에요. 맞나요?`, `Based on Class of ${profile.grad_year}, you’re now in grade ${rawGrade}. Is that right?`)
                : t('기록된 졸업연도로는 이미 졸업 학년이 지났어요. 확인해 주세요.', 'Based on your saved graduation year, you’ve already passed senior year. Please check.')}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {rawGrade !== null && rawGrade <= 12 && (
                <button
                  onClick={confirm}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
                >
                  {t('맞아요, 계속하기', 'Yes, continue')}
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
              >
                {t('아니요, 졸업연도 수정할게요', 'No, let me fix the graduation year')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
