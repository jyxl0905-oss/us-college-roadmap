import { gradeFromGradYear, currentSeason, currentSchoolYearEnd, seasonLabelKo } from '../lib/academics'
import { t } from '../i18n'

// 현재 학년도의 12학년(올해 졸업)부터 5개 — 8월 1일 롤오버에 맞춰 자동으로 한 해씩 밀림 (예: 2026-27 학년도 → 2027~2031)
const gradYears = Array.from({ length: 5 }, (_, i) => currentSchoolYearEnd() + i)

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
      <h1 className="text-xl font-bold text-gray-900">{t('몇 년도에 졸업 예정인가요?', 'What year will you graduate?')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('Class of 기준으로 골라주세요.', 'Pick your Class of year.')}</p>
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
                {t('지금은 ', 'Right now you are in ')}<strong>{t(`${grade}학년`, `grade ${grade}`)}</strong>{t(`, ${seasonLabelKo[currentSeason()]} 시즌이에요. 맞나요?`, `, ${seasonLabelKo[currentSeason()]} season. Correct?`)}
              </>
            ) : grade < 9 ? (
              <>
                {t('아직 9학년 전이네요. ', 'Not in 9th grade yet. ')}<strong>{t('예비 9학년', 'rising 9th')}</strong>{t(' 기준으로 시작할게요.', " — we'll start there.")}
              </>
            ) : (
              <>{t('이미 졸업 학년이 지났어요. 졸업연도를 다시 확인해 주세요.', 'That graduation year has passed — please check it.')}</>
            )}
          </div>
          {grade <= 12 && (
            <button
              onClick={onNext}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
            >
              {t('다음', 'Next')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
