import { useState } from 'react'
import { ChevronDown, ExternalLink, CheckCircle2, Info, AlertTriangle, ListChecks, Award, Sparkles, BadgeCheck } from 'lucide-react'
import { t } from '../i18n'

export interface Statement { college: string; topic: string; group?: string; statement_ko: string; statement_en: string; quote_en: string | null; url: string }

// 입학처 공식 입장 — 인용문 나열 대신 '핵심 한 줄 + 말한 대학 + 펼치면 원문 근거'로 정리
const GROUPS: { key: string; icon: typeof Info; tone: string; ko: string; en: string }[] = [
  { key: 'no_required', icon: CheckCircle2, tone: 'text-emerald-600', ko: '꼭 해야 하는 서머 프로그램은 없어요', en: 'No summer program is required' },
  { key: 'precollege', icon: BadgeCheck, tone: 'text-blue-600', ko: '대학 이름이 붙은 프리칼리지에 가도 그 대학 합격이 보장·우대되지 않아요', en: 'A college’s own pre-college program doesn’t guarantee or boost admission there' },
  { key: 'skeptical', icon: AlertTriangle, tone: 'text-amber-600', ko: '"비싼 프로그램이 유리하다"는 말은 의심하세요', en: 'Be skeptical of claims that expensive programs give you an edge' },
  { key: 'life', icon: Sparkles, tone: 'text-violet-600', ko: '아르바이트·가족 돌봄, 한두 활동에 깊이 파고든 경험도 똑같이 인정돼요', en: 'Jobs, family responsibilities and depth in one or two activities count just as much' },
  { key: 'exceptions', icon: Info, tone: 'text-gray-500', ko: '알아둘 예외와 주의점', en: 'Exceptions and caveats' },
  { key: 'lists', icon: ListChecks, tone: 'text-gray-500', ko: '입학처가 소개한 프로그램·대회 목록 (참고용, 선호 아님)', en: 'Programs and competitions admissions offices list (for reference, not a preference)' },
  { key: 'honors', icon: Award, tone: 'text-gray-500', ko: '수상은 원서에 이렇게 적어요', en: 'How honors go on your application' },
]

// 'Harvard (Harvard Summer School Pre-College)' → 'Harvard', 'University of California (UC system)' → 'UC'
const shortName = (c: string) => (c.startsWith('University of California') ? 'UC' : c.replace(/\s*\(.*\)$/, ''))

export default function AdmissionsTakeaways({ statements }: { statements: Statement[] }) {
  const nColleges = new Set(statements.map((s) => shortName(s.college)).filter((c) => c !== 'Common App')).size
  const [open, setOpen] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const groups = GROUPS.map((g) => ({ ...g, items: statements.filter((s) => s.group === g.key) })).filter((g) => g.items.length > 0)
  const shown = more ? groups : groups.slice(0, 4)

  return (
    <section className="mt-4 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 md:px-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">{t('먼저 알아둘 것', 'Read this first')}</p>
      <h2 className="mt-1 text-lg font-bold leading-snug text-gray-900">{t('대학 입학처는 이렇게 말해요', 'What admissions offices actually say')}</h2>
      <p className="mt-1 text-xs text-gray-500">{t(`대학 ${nColleges}곳과 Common App의 공식 페이지에서 확인한 내용이에요. 누르면 원문 근거가 보여요.`, `From the official pages of ${nColleges} colleges and the Common App. Tap a line to see the sources.`)}</p>

      <ul className="mt-3 divide-y divide-gray-100">
        {shown.map((g) => {
          const Icon = g.icon
          const isOpen = open === g.key
          const colleges = [...new Set(g.items.map((s) => shortName(s.college)))]
          return (
            <li key={g.key}>
              <button onClick={() => setOpen(isOpen ? null : g.key)} aria-expanded={isOpen} className="flex w-full items-start gap-3 py-3 text-left">
                <Icon size={20} strokeWidth={2} className={`mt-0.5 shrink-0 ${g.tone}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug text-gray-900">{t(g.ko, g.en)}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {colleges.map((c) => <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{c}</span>)}
                  </span>
                </span>
                <ChevronDown size={16} className={`mt-1 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="mb-3 ml-8 flex flex-col gap-2">
                  {g.items.map((s, i) => (
                    <div key={i} className="rounded-xl bg-gray-50 px-3.5 py-3">
                      <p className="text-xs font-semibold text-gray-900">{shortName(s.college)}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-gray-700">{t(s.statement_ko, s.statement_en)}</p>
                      {s.quote_en && <p className="mt-1.5 border-l-2 border-blue-200 pl-2 text-[12px] italic text-gray-500">“{s.quote_en}”</p>}
                      <a href={s.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 underline">{t('공식 출처', 'Official source')}<ExternalLink size={10} /></a>
                    </div>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {groups.length > 4 && (
        <button onClick={() => setMore((v) => !v)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-600">
          {more ? t('접기', 'Show less') : t(`${groups.length - 4}개 더 보기 (예외·목록·수상 기재법)`, `${groups.length - 4} more (exceptions, lists, honors)`)} <ChevronDown size={14} className={more ? 'rotate-180' : ''} />
        </button>
      )}
    </section>
  )
}
