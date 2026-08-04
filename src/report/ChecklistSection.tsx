import type { ChecklistItem } from '../lib/types'

const axisLabels: Record<ChecklistItem['axis'], string> = {
  rigor: '학업 강도',
  testing: '시험',
  spike: '대표 활동',
  leadership: '리더십',
  validation: '교외 인정',
  story: '스토리',
}

interface ChecklistSectionProps {
  items: ChecklistItem[]
  checkedIds: Set<number>
  onToggle?: (itemId: number) => void // 없으면 읽기 전용(프리뷰)
}

// 체크리스트 항목 목록 — 리포트와 프리뷰에서 공용
export default function ChecklistSection({ items, checkedIds, onToggle }: ChecklistSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const checked = checkedIds.has(item.id)
        return (
          <button
            key={item.id}
            onClick={onToggle ? () => onToggle(item.id) : undefined}
            disabled={!onToggle}
            className={`w-full rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${
              checked ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
            } ${onToggle ? 'active:bg-gray-50' : ''}`}
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
                <span className="mt-1.5 inline-flex gap-1.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {axisLabels[item.axis]}
                  </span>
                  {item.is_guide && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
                      가이드
                    </span>
                  )}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
