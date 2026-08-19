import { useState } from 'react'
import { t } from '../i18n'

// R1-A②: 대입 정보원 문항 (복수 선택)
// 함수로 두어야 언어 토글 후에도 현재 언어로 그려짐 (모듈 상수면 첫 로딩 언어로 고정됨)
const OPTIONS = (): { value: string; label: string }[] => [
  { value: 'agency', label: t('유학원', 'Admissions consultancy') },
  { value: 'youtube', label: t('유튜브', 'YouTube') },
  { value: 'community', label: t('인터넷 커뮤니티', 'Online communities') },
  { value: 'ai_chatbot', label: t('AI 챗봇', 'AI chatbot') },
  { value: 'family', label: t('부모님·지인', 'Parents / friends') },
  { value: 'teacher', label: t('학교 선생님', 'School teachers') },
  { value: 'none', label: t('특별히 없음', 'None in particular') },
]

interface InfoSourcesStepProps {
  onDone: (sources: string[]) => void
}

export default function InfoSourcesStep({ onDone }: InfoSourcesStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (value === 'none') return next.has('none') ? new Set() : new Set(['none'])
      next.delete('none')
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('대입 정보를 주로 어디서 얻나요?', 'Where do you get admissions info?')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('해당하는 것을 모두 골라주세요.', 'Select all that apply.')}</p>
      <div className="mt-6 flex flex-col gap-2.5">
        {OPTIONS().map((opt) => {
          const on = selected.has(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition-colors ${
                on ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-900 active:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-between">
                {opt.label}
                {on && <span className="text-blue-600">✓</span>}
              </span>
            </button>
          )
        })}
      </div>
      <button
        onClick={() => onDone([...selected])}
        disabled={selected.size === 0}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {t('다음', 'Next')}
      </button>
    </div>
  )
}
