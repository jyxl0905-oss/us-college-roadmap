import { gradeFromGradYear, currentSeason, seasonLabelKo } from '../lib/academics'

const gradYears = [2027, 2028, 2029, 2030, 2031]

interface GradYearStepProps {
  selected: number | null
  onSelect: (year: number) => void
  onNext: () => void
}

// Q1: 졸업연도 선택 → 학년 자동 계산 확인 후 다음
export default function GradYearStep({ selected, onSelect, onNext }: GradYearStepProps) {
  const grade = selected ? gradeFromGradYear(selected) : null

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">몇 년도에 졸업 예정인가요?</h1>
      <p className="mt-2 text-sm text-gray-500">Class of 기준으로 골라주세요.</p>
      <div className="mt-6 flex flex-col gap-3">
        {gradYears.map((year) => (
          <button
            key={year}
            onClick={() => onSelect(year)}
            className={`w-full rounded-xl border-2 px-4 py-3.5 text-left font-medium transition-colors ${
              selected === year
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
          >
            Class of {year}
          </button>
        ))}
      </div>
      {selected && grade !== null && (
        <div className="mt-6">
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {grade >= 9 && grade <= 12 ? (
              <>
                지금은 <strong>{grade}학년</strong>, {seasonLabelKo[currentSeason()]} 시즌이에요. 맞나요?
              </>
            ) : grade < 9 ? (
              <>
                아직 9학년 전이네요. <strong>예비 9학년</strong> 기준으로 시작할게요.
              </>
            ) : (
              <>이미 졸업 학년이 지났어요. 졸업연도를 다시 확인해 주세요.</>
            )}
          </div>
          {grade <= 12 && (
            <button
              onClick={onNext}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
            >
              다음
            </button>
          )}
        </div>
      )}
    </div>
  )
}
