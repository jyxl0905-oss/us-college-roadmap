import { useState } from 'react'
import type { School } from '../lib/types'
import schoolsData from '../data/schools.seed.json'

const schools = schoolsData as School[]

interface TargetSchoolsStepProps {
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onNext: () => void
}

// Q6-구체 선택: 톱60 검색 + 복수 선택 (Phase 1은 시드 10개교만)
export default function TargetSchoolsStep({ selectedIds, onChange, onNext }: TargetSchoolsStepProps) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? schools.filter(
        (s) => s.name.toLowerCase().includes(q) || s.name_ko.includes(query.trim()),
      )
    : schools

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id],
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">목표 학교를 골라주세요</h1>
      <p className="mt-2 text-sm text-gray-500">여러 개 선택할 수 있어요.</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="학교 이름 검색 (예: NYU, 하버드)"
        className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      <div className="mt-4 flex flex-col gap-2">
        {filtered.map((s) => {
          const isSelected = selectedIds.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white active:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-between">
                <span>
                  <span className="block font-medium text-gray-900">{s.name}</span>
                  <span className="block text-sm text-gray-500">
                    {s.name_ko} · US News #{s.usnews_rank}
                  </span>
                </span>
                {isSelected && <span className="text-blue-600">✓</span>}
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">검색 결과가 없어요.</p>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={selectedIds.length === 0}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {selectedIds.length > 0 ? `${selectedIds.length}개 학교 선택 완료` : '학교를 선택해 주세요'}
      </button>
    </div>
  )
}
