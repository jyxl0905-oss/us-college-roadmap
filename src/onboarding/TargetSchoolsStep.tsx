import { schoolMatches } from '../data/schoolAliases'
import { tp } from '../lib/role'
import { Palette } from 'lucide-react'
import { useState } from 'react'
import { t } from '../i18n'
import type { School } from '../lib/types'
import schoolsData from '../data/schools.index.json' // 경량 인덱스(id·이름·티어) — 전체 시드는 schoolsCache에서만
import SchoolLogo from '../browse/SchoolLogo'
import { rankShort } from '../browse/rankGroups'
import { artSchoolsForMajors } from '../data/artSchools'
import { majorLabel } from '../data/majors'

const schools = schoolsData as School[]

interface TargetSchoolsStepProps {
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onNext: () => void
  majors?: (string | null)[] // 1·2순위 전공 — 창작 계열이면 미술·디자인 전문학교 추천
}

// Q6-구체 선택: 종합대·LAC·미술·디자인 전문학교 검색 + 복수 선택
export default function TargetSchoolsStep({ selectedIds, onChange, onNext, majors = [] }: TargetSchoolsStepProps) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'university' | 'lac' | 'art'>('university')
  const artRecs = artSchoolsForMajors(majors)
  const artMajor = majors.find((m) => artRecs.some((s) => (s.art_programs ?? []).includes(m ?? '')))
  const kindOrder = { university: 0, lac: 1, art: 2 } as const

  const q = query.trim().toLowerCase()
  // 검색 중엔 종합대·LAC 전체에서 찾고, 평소엔 탭으로 나눠 보여줌 (순위순)
  const filtered = (q
    ? schools.filter((s) => schoolMatches(s, q))
    : schools.filter((s) => (s.kind ?? 'university') === kind)
  ).slice().sort((a, b) =>
    (a.kind ?? 'university') !== (b.kind ?? 'university')
      ? kindOrder[a.kind ?? 'university'] - kindOrder[b.kind ?? 'university']
      : a.kind === 'lac'
        ? (a.lac_rank ?? 999) - (b.lac_rank ?? 999)
        : a.kind === 'art'
          ? a.name.localeCompare(b.name)
          : (a.usnews_rank ?? 9999) - (b.usnews_rank ?? 9999),
  )
  const count = (k: 'university' | 'lac' | 'art') => schools.filter((s) => (s.kind ?? 'university') === k).length

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id],
    )
  }

  return (
    <div className={selectedIds.length > 0 ? 'pb-24' : ''}>
      <h1 className="text-xl font-bold text-gray-900">{tp('목표 학교를 골라주세요', '자녀의 목표 학교를 골라주세요', 'Pick your target schools', 'Pick your child’s target schools')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('여러 개 선택할 수 있어요.', 'You can pick several.')}</p>
      {/* 창작 계열 전공이면: 그 전공을 개설한 미술·디자인 전문학교를 먼저 추천 */}
      {!q && artRecs.length > 0 && (
        <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-pink-900"><Palette size={15} strokeWidth={2} className="shrink-0" />{t(`${majorLabel(artMajor ?? null)} 전공 특화 학교 추천`, `Specialized schools for ${majorLabel(artMajor ?? null)}`)}</p>
          <p className="mt-0.5 text-xs text-pink-800">{t('이 전공을 공식 개설한 미술·디자인 전문학교와 종합대 예술대학이에요. 눌러서 목표에 담을 수 있어요.', 'Art & design schools and university arts schools that officially offer this major. Tap to add.')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artRecs.map((s) => {
              const on = selectedIds.includes(s.id)
              return (
                <button key={s.id} onClick={() => toggle(s.id)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-pink-200 bg-white text-gray-800'}`}>
                  <SchoolLogo schoolId={s.id} name={s.name} size={16} />
                  {t(s.name_ko, s.name)}{on ? ' ✓' : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {!q && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => setKind('university')} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${kind === 'university' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
            {t('종합대학', 'Universities')} <span className="font-normal opacity-70">{count('university')}</span>
          </button>
          <button onClick={() => setKind('lac')} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${kind === 'lac' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
            {count('art') > 0 ? t('리버럴 아츠', 'Liberal arts') : t('리버럴 아츠 칼리지', 'Liberal arts colleges')} <span className="font-normal opacity-70">{count('lac')}</span>
          </button>
          {count('art') > 0 && (
            <button onClick={() => setKind('art')} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${kind === 'art' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
              <Palette size={14} strokeWidth={2} className="mr-1 inline -mt-0.5" />{t('미술·디자인', 'Art & design')} <span className="font-normal opacity-70">{count('art')}</span>
            </button>
          )}
        </div>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('학교 이름 검색 (예: NYU, 하버드)', 'Search schools (e.g., NYU, Harvard)')}
        className="mt-3 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
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
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <SchoolLogo schoolId={s.id} name={s.name} size={32} />
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900">{s.name}</span>
                    <span className="block text-sm text-gray-500">
                      {t(`${s.name_ko} · `, '')}{rankShort(s)}
                    </span>
                  </span>
                </span>
                {isSelected && <span className="shrink-0 text-blue-600">✓</span>}
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">{t('검색 결과가 없어요.', 'No results.')}</p>
        )}
      </div>
      {/* 선택 완료 — 하나라도 고르면 화면 하단에 고정 (긴 목록을 끝까지 스크롤할 필요 없음) */}
      {selectedIds.length > 0 && (
        <div className="bottom-nav-offset fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
          <button
            onClick={onNext}
            className="mx-auto block w-full max-w-md rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t(`${selectedIds.length}개 학교 선택 완료 →`, `${selectedIds.length} school${selectedIds.length > 1 ? 's' : ''} selected — continue →`)}
          </button>
        </div>
      )}
      {selectedIds.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">{t('학교를 하나 이상 선택하면 완료 버튼이 나타나요.', 'Pick at least one school and the continue button will appear.')}</p>
      )}
    </div>
  )
}
