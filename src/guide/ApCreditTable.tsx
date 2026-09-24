import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { t, getLang } from '../i18n'
import { navigate, slugify } from '../lib/router'
import schoolsIndex from '../data/schools.index.json'
import { loadApCredit, AP_SUBJECTS, POLICY, type ApCredit, type ApPolicy, type ApSubjectKey } from '../browse/ApCreditBlock'

// 대학별 AP 학점 인정 비교 — 과목을 고르면 학교마다 몇 점부터 무엇을 인정하는지
interface IdxSchool { id: number; name: string; name_ko: string; usnews_rank: number | null; kind?: string }
const schools = schoolsIndex as IdxSchool[]

export default function ApCreditTable() {
  const [rows, setRows] = useState<Map<number, ApCredit> | null>(null)
  const [subject, setSubject] = useState<ApSubjectKey | 'all'>('all')
  const [policy, setPolicy] = useState<ApPolicy | 'all'>('all')
  const [q, setQ] = useState('')
  useEffect(() => { void loadApCredit().then(setRows) }, [])

  const list = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return schools
      .map((s) => ({ s, r: rows.get(s.id) }))
      .filter((x): x is { s: IdxSchool; r: ApCredit } => !!x.r && (x.r.policy != null || x.r.min_score != null))
      .filter((x) => policy === 'all' || x.r.policy === policy)
      .filter((x) => !needle || x.s.name.toLowerCase().includes(needle) || x.s.name_ko.includes(q.trim()))
  }, [rows, policy, q])

  if (!rows) return <p className="mt-6 text-center text-sm text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
  const counts = (p: ApPolicy) => [...rows.values()].filter((r) => r.policy === p).length
  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs ${on ? 'bg-gray-900 font-semibold text-white' : 'border border-gray-200 bg-white text-gray-600'}`

  return (
    <div className="mt-3">
      <p className="text-sm leading-relaxed text-gray-600">{t('AP 점수로 입학 후 학점을 받거나 윗단계 수업으로 바로 갈 수 있는지는 학교마다 달라요. 과목을 고르면 학교별로 몇 점부터 무엇을 인정하는지 비교해요.', 'Whether AP scores earn college credit or advanced placement differs by school. Pick an exam to compare what each school gives and from which score.')}</p>
      <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <button onClick={() => setSubject('all')} className={chip(subject === 'all')}>{t('전체 요약', 'Overview')}</button>
        {AP_SUBJECTS.map((s) => <button key={s.key} onClick={() => setSubject(s.key)} className={chip(subject === s.key)}>{s.label}</button>)}
      </div>
      <div className="-mx-5 mt-1.5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <button onClick={() => setPolicy('all')} className={chip(policy === 'all')}>{t('모든 학교', 'All schools')}</button>
        {(Object.keys(POLICY) as ApPolicy[]).filter((p) => counts(p) > 0).map((p) => (
          <button key={p} onClick={() => setPolicy(p)} className={chip(policy === p)}>{t(POLICY[p].ko, POLICY[p].en)} {counts(p)}</button>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 py-2">
        <Search size={15} className="text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('학교 검색', 'Search schools')} className="w-full text-sm focus:outline-none" />
      </label>

      <ul className="mt-3 flex flex-col gap-1.5">
        {list.map(({ s, r }) => {
          const P = r.policy ? POLICY[r.policy] : null
          const sub = subject === 'all' ? null : r.subjects[subject]
          return (
            <li key={s.id} className="rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-gray-200">
              <div className="flex items-start gap-2">
                <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-gray-900">{getLang() === 'en' ? s.name : s.name_ko || s.name}</span>
                  {P && <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${P.cls}`}>{t(P.ko, P.en)}</span>}
                </button>
                <div className="shrink-0 text-right">
                  {subject === 'all' ? (
                    <p className="text-lg font-extrabold tabular-nums text-gray-900">{r.min_score != null ? `${r.min_score}+` : '—'}</p>
                  ) : (
                    <p className="text-lg font-extrabold tabular-nums text-gray-900">{sub ? (sub.min != null ? `${sub.min}+` : '✕') : '?'}</p>
                  )}
                </div>
              </div>
              {subject === 'all'
                ? r.uses_ko && <p className="mt-1 line-clamp-2 text-[12px] text-gray-600">{t(r.uses_ko, r.uses_en ?? r.uses_ko)}</p>
                : <p className="mt-1 text-[12px] text-gray-600">{sub ? t(sub.result_ko, sub.result_en) : t('공식 표에서 확인하지 못했어요', 'Not confirmed on the official chart')}</p>}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{t('숫자는 학점·배치를 받는 최소 점수예요 (✕ = 점수로 학점을 주지 않음 — 설명 참고, ? = 공식 표에서 확인 못 함). 각 대학 공식 페이지 기준이고, 대부분 2026-27 입학생 기준표예요 — 입학 연도마다 바뀔 수 있고 전공·단과대에 따라 다를 수 있어요. 학교 이름을 누르면 상세와 공식 출처가 나와요.', 'Numbers are the minimum score for credit/placement (✕ = no score-based credit — see the note, ? = not confirmed on the official chart). From each college’s official page, mostly charts for 2026-27 entrants — they can change by entry year and differ by major or school. Tap a school for details and the source.')}</p>
    </div>
  )
}
