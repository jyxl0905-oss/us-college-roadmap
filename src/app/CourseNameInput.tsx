import { useMemo, useState } from 'react'
import { t } from '../i18n'
import { suggestCourses, levelFromName } from '../lib/courseSuggest'

// 과목명 입력 + 표준 과목명 자동완성 (↑↓ 선택 · Enter 확정 · 그냥 Enter면 적은 그대로 추가)
interface Props {
  value: string
  onChange: (v: string) => void
  onPick: (name: string, level: 'ap' | 'ib' | null) => void
  onEnter: () => void
  placeholder: string
  className: string
}

export default function CourseNameInput({ value, onChange, onPick, onEnter, placeholder, className }: Props) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const list = useMemo(() => suggestCourses(value).filter((n) => n.toLowerCase() !== value.trim().toLowerCase()), [value])
  const show = open && value.trim().length > 0 && list.length > 0

  const pick = (name: string) => {
    onPick(name, levelFromName(name))
    setOpen(false)
    setHi(-1)
  }

  return (
    <div className="relative min-w-0">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'ArrowDown' && show) { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)) }
          else if (e.key === 'ArrowUp' && show) { e.preventDefault(); setHi((h) => Math.max(-1, h - 1)) }
          else if (e.key === 'Escape') setOpen(false)
          else if (e.key === 'Enter') { if (show && hi >= 0) { e.preventDefault(); pick(list[hi]) } else onEnter() }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={show}
        aria-autocomplete="list"
        className={className}
      />
      {show && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 w-[max(100%,15rem)] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {list.map((n, i) => (
            <li key={n} role="option" aria-selected={i === hi}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(n) }}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${i === hi ? 'bg-blue-50 text-blue-900' : 'text-gray-800'}`}
              >
                <span className="truncate">{n}</span>
                {levelFromName(n) && <span className="shrink-0 rounded-full bg-blue-50 px-1.5 text-[10px] font-semibold text-blue-700">{levelFromName(n)?.toUpperCase()}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-gray-100 px-3 pt-1 text-[10.5px] text-gray-400">{t('표준 이름을 고르면 수업 난이도 분석이 정확해져요', 'Pick a standard name for accurate rigor analysis')}</li>
        </ul>
      )}
    </div>
  )
}
