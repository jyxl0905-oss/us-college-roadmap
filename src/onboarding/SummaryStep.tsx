import type { OnboardingAnswers } from '../lib/types'
import { gradeFromGradYear, currentSeason, seasonLabelKo } from '../lib/academics'
import { summaryRows } from './labels'

interface SummaryStepProps {
  answers: OnboardingAnswers
  onRestart: () => void
}

// 온보딩 완료 요약 — Phase 3에서 리포트 프리뷰(차트+블러)로 교체 예정
export default function SummaryStep({ answers, onRestart }: SummaryStepProps) {
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
      <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        다음 단계(Phase 2~3)에서 이메일 로그인, 시즌 체크리스트, 리포트가 이어집니다.
      </p>
      <button
        onClick={onRestart}
        className="mt-4 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
      >
        처음부터 다시 하기
      </button>
    </div>
  )
}
