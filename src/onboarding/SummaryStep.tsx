import type { OnboardingAnswers } from '../lib/types'
import { gradeFromGradYear, currentSeason, seasonLabelKo } from '../lib/academics'
import { summaryRows } from './labels'

interface SummaryStepProps {
  answers: OnboardingAnswers
  onRestart: () => void
  onComplete?: () => void
}

// 온보딩 완료 요약 — Phase 3에서 리포트 프리뷰(차트+블러)로 교체 예정
export default function SummaryStep({ answers, onRestart, onComplete }: SummaryStepProps) {
  const grade = answers.gradYear ? gradeFromGradYear(answers.gradYear) : null

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">입력이 끝났어요! 🎉</h1>
      <p className="mt-2 text-sm text-gray-500">
        {grade !== null && `${grade < 9 ? '예비 9' : grade}학년 · ${seasonLabelKo[currentSeason()]} 시즌 기준으로 정리했어요.`}
      </p>
      <div className="mt-6 divide-y divide-gray-100 rounded-xl border-2 border-gray-200 bg-white">
        {summaryRows(answers).map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-sm text-gray-500">{label}</span>
            <span className="text-right text-sm font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>
      {onComplete ? (
        <button
          onClick={onComplete}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          내 리포트 보기
        </button>
      ) : (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          서버 연결(.env) 전이라 저장은 아직 안 돼요. 다음 단계에서 이어집니다.
        </p>
      )}
      <button
        onClick={onRestart}
        className="mt-4 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
      >
        처음부터 다시 하기
      </button>
    </div>
  )
}
