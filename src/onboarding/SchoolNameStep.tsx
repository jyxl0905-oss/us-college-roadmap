import { useState } from 'react'
import { t } from '../i18n'
import { HS_SCHOOLS, searchHsSchools } from '../data/hs-schools'

interface Props {
  value: string | null
  onSelect: (name: string | null) => void
}

// Q4-b: 다니는 학교 이름 (선택) — 학교별 통계용. 목록 선택 우선, 없으면 직접 입력, 건너뛰기 가능
export default function SchoolNameStep({ value, onSelect }: Props) {
  const [query, setQuery] = useState(value && !HS_SCHOOLS.includes(value) ? value : '')
  const [custom, setCustom] = useState(!!value && !HS_SCHOOLS.includes(value))
  const list = searchHsSchools(query)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('다니는 학교는 어디예요?', 'Which school do you attend?')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {t('학교별로 어떤 준비가 부족한지 익명 통계로만 써요. 리포트에는 영향 없어요.', 'Used only for anonymous per-school statistics — it doesn’t change your report.')}
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCustom(false) }}
        placeholder={t('학교 이름 검색 (예: SIS, KIS, 제주)', 'Search school name (e.g., SIS, KIS, Jeju)')}
        className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {list.map((name) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${value === name ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-900 active:bg-gray-50'}`}
          >
            {name}
          </button>
        ))}
        {list.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">{t('목록에 없어요 — 아래에서 직접 입력할 수 있어요.', 'Not in the list — you can type it below.')}</p>
        )}
      </div>
      <button
        onClick={() => setCustom(true)}
        className="mt-3 text-sm text-blue-600 underline"
      >
        {t('목록에 없어요 (직접 입력)', 'Not listed (type it in)')}
      </button>
      {custom && (
        <div className="mt-2 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('학교 이름 (영문 권장)', 'School name (English preferred)')}
            className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
          />
          <button
            disabled={query.trim().length < 2}
            onClick={() => onSelect(query.trim().slice(0, 80))}
            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {t('확인', 'OK')}
          </button>
        </div>
      )}
      <button onClick={() => onSelect(null)} className="mt-6 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 active:bg-gray-50">
        {t('건너뛰기', 'Skip')}
      </button>
    </div>
  )
}
