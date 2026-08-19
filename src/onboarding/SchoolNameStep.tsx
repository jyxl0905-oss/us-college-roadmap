import { useState } from 'react'
import { t } from '../i18n'
import { searchHsSchools } from '../data/hs-schools'

interface Props {
  value: string | null
  onSelect: (name: string | null) => void
}

// Q4-b: 다니는 학교 이름 (선택, 직접 입력) — 학교별 통계용. 입력 중 비슷한 이름이 있으면 탭으로 통일 가능, 건너뛰기 가능
export default function SchoolNameStep({ value, onSelect }: Props) {
  const [name, setName] = useState(value ?? '')
  const q = name.trim()
  const suggestions = q.length >= 2 ? searchHsSchools(q).filter((s) => s !== q).slice(0, 4) : []
  const clean = q.replace(/\s+/g, ' ').slice(0, 80)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('다니는 학교는 어디예요?', 'Which school do you attend?')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {t('학교별로 어떤 준비가 부족한지 익명 통계로만 써요. 리포트에는 영향 없어요.', 'Used only for anonymous per-school statistics — it doesn’t change your report.')}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && clean.length >= 2) onSelect(clean) }}
        placeholder={t('학교 이름 (예: Seoul International School)', 'School name (e.g., Seoul International School)')}
        autoFocus
        className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setName(s)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 active:bg-gray-50">
              {s}
            </button>
          ))}
        </div>
      )}
      <button
        disabled={clean.length < 2}
        onClick={() => onSelect(clean)}
        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {t('다음', 'Next')}
      </button>
      <button onClick={() => onSelect(null)} className="mt-3 w-full py-2 text-sm text-gray-400 underline">
        {t('건너뛰기', 'Skip')}
      </button>
    </div>
  )
}
