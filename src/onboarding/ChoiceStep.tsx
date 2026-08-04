interface ChoiceOption<T> {
  value: T
  label: string
  description?: string
}

interface ChoiceStepProps<T> {
  title: string
  subtitle?: string
  options: ChoiceOption<T>[]
  selected: T | null
  onSelect: (value: T) => void
}

// 단일 선택 질문 화면 — 탭하면 바로 다음 질문으로 넘어감
export default function ChoiceStep<T extends string | number>({
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: ChoiceStepProps<T>) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
      <div className="mt-6 flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onSelect(opt.value)}
            className={`w-full rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${
              selected === opt.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
          >
            <span className="block font-medium text-gray-900">{opt.label}</span>
            {opt.description && (
              <span className="mt-0.5 block text-sm text-gray-500">{opt.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
