import { t } from '../i18n'
const countOptions = [0, 1, 2, 3, 4, 5, 6, 7] // 7은 "7+"

interface ApStepProps {
  completed: number | null
  current: number | null
  onChange: (patch: { apCompleted?: number; apCurrent?: number }) => void
  onNext: () => void
}

function ChipRow({
  label,
  value,
  onSelect,
}: {
  label: string
  value: number | null
  onSelect: (n: number) => void
}) {
  return (
    <div className="mt-5">
      <p className="font-medium text-gray-900">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {countOptions.map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className={`h-11 w-11 rounded-full border-2 font-medium transition-colors ${
              value === n
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
            }`}
          >
            {n === 7 ? '7+' : n}
          </button>
        ))}
      </div>
    </div>
  )
}

// Q10: AP 이수 완료 수 + 수강 중 수
export default function ApStep({ completed, current, onChange, onNext }: ApStepProps) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('AP 과목은 몇 개인가요?', 'How many AP courses?')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('AP가 없는 학교라면 둘 다 0을 골라주세요.', 'If your school has no APs, choose 0 for both.')}</p>
      <ChipRow
        label={t('이수 완료한 AP', 'APs completed')}
        value={completed}
        onSelect={(n) => onChange({ apCompleted: n })}
      />
      <ChipRow
        label={t('지금 수강 중인 AP', 'APs in progress')}
        value={current}
        onSelect={(n) => onChange({ apCurrent: n })}
      />
      <button
        onClick={onNext}
        disabled={completed === null || current === null}
        className="mt-8 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {t('다음', 'Next')}
      </button>
    </div>
  )
}
