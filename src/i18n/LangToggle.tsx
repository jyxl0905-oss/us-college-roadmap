import { getLang, setLang } from './index'

// 언어 토글 — 작은 칩 두 개
export default function LangToggle({ className = '' }: { className?: string }) {
  const lang = getLang()
  const chip = (l: 'ko' | 'en', label: string) => (
    <button
      onClick={() => l !== lang && setLang(l)}
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${lang === l ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
      aria-pressed={lang === l}
    >
      {label}
    </button>
  )
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-0.5 ${className}`}>
      {chip('ko', '한국어')}
      {chip('en', 'EN')}
    </span>
  )
}
