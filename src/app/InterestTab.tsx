import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ChevronDown, Pin, AlertTriangle } from 'lucide-react'
import AppShell from './AppShell'
import { supabase } from '../lib/supabase'
import { t, bilingual } from '../i18n'
import type { ProfileRow } from '../lib/profile'
import { loadSchools } from '../lib/schoolsCache'
import { tierSchoolsFrom } from '../lib/tierSchools'
import type { School } from '../lib/types'
import { PageSkeleton } from '../ui/Skeleton'
import { insertRow, deleteRow } from './appData'
import { DEMO_USER_ID } from '../demo/demoProfile'
import { loadSchoolReqs, type SchoolReq } from '../lib/schoolReqs'
import { OFFERED, INTL } from '../browse/InterviewBlock'

// 관심 표현(Demonstrated Interest) 기록 — 학교별로 설명회·방문·메일링 등 기록. 반영 여부는 각 학교 CDS C7 "Level of applicant's interest" 기준
export type InterestKind = 'mailing_list' | 'info_session' | 'campus_visit' | 'hs_visit' | 'college_fair' | 'email' | 'interview' | 'other'
export interface InterestLog { id: number; school_id: number; kind: InterestKind; happened_on: string | null; note: string | null }

const KINDS: InterestKind[] = ['mailing_list', 'info_session', 'campus_visit', 'hs_visit', 'college_fair', 'email', 'interview', 'other']
const kindLabel: Record<InterestKind, string> = bilingual(
  { mailing_list: '메일링 등록', info_session: '설명회(온라인 포함)', campus_visit: '캠퍼스 방문·투어', hs_visit: '고교 방문 설명회', college_fair: '대학 박람회', email: '입학처 문의', interview: '인터뷰', other: '기타' },
  { mailing_list: 'Mailing list', info_session: 'Info session (incl. online)', campus_visit: 'Campus visit / tour', hs_visit: 'High-school visit', college_fair: 'College fair', email: 'Contacted admissions', interview: 'Interview', other: 'Other' },
)

const today = () => new Date().toISOString().slice(0, 10)
const DEMO_LOGS: InterestLog[] = [
  { id: -1, school_id: 20, kind: 'info_session', happened_on: '2026-09-10', note: null },
  { id: -2, school_id: 20, kind: 'mailing_list', happened_on: '2026-08-20', note: null },
]

export default function InterestTab({ userId, profile }: { userId: string; profile: ProfileRow }) {
  const [logs, setLogs] = useState<InterestLog[] | null>(null)
  const [all, setAll] = useState<School[]>([])
  const [boardIds, setBoardIds] = useState<number[]>([])
  const [error, setError] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [openSchool, setOpenSchool] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ kind: InterestKind; date: string; note: string }>({ kind: 'info_session', date: today(), note: '' })
  const [extra, setExtra] = useState<number[]>([]) // 목록에 직접 추가한 학교
  const [busy, setBusy] = useState(false)
  const [reqs, setReqs] = useState<Map<number, SchoolReq> | null>(null)
  useEffect(() => { void loadSchoolReqs().then(setReqs) }, [])
  const demo = userId === DEMO_USER_ID

  useEffect(() => {
    if (demo) setLogs(DEMO_LOGS)
    else if (!supabase) setLogs([])
    else {
      supabase.from('interest_logs').select('id,school_id,kind,happened_on,note').eq('user_id', userId).order('happened_on', { ascending: false }).then(({ data, error }) => {
        if (error) { setError(true); return }
        setLogs((data ?? []) as InterestLog[])
      })
      supabase.from('applications').select('school_id').eq('user_id', userId).then(({ data }) => setBoardIds((data ?? []).map((r: { school_id: number }) => r.school_id)))
    }
    loadSchools().then(setAll)
  }, [userId, demo])

  // 내 학교 목록: 목표 학교 + 지원 보드 + 기록이 있는 학교 + 직접 추가
  const mySchools = useMemo(() => {
    const target = profile.target_mode === 'schools' ? profile.target_school_ids : profile.target_mode === 'tier' ? tierSchoolsFrom(all, profile.target_tier).map((s) => s.id) : []
    const ids = new Set<number>([...target, ...boardIds, ...(logs ?? []).map((l) => l.school_id), ...extra, ...(demo ? [20] : [])])
    const byId = new Map(all.map((s) => [s.id, s]))
    return [...ids].map((id) => byId.get(id)).filter((s): s is School => !!s)
      // 관심도 반영 학교 먼저, 그다음 순위
      .sort((a, b) => Number(b.demonstrated_interest === true) - Number(a.demonstrated_interest === true) || (a.usnews_rank ?? 999) - (b.usnews_rank ?? 999))
  }, [all, profile.target_mode, profile.target_tier, profile.target_school_ids.join(','), boardIds, logs, extra, demo]) // eslint-disable-line react-hooks/exhaustive-deps

  const title = t('관심 표현', 'Demonstrated interest')
  if (error) return <AppShell tab="interest" title={title}><p className="mt-8 text-center text-sm text-gray-500">{t('불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 'Couldn’t load. Please try again shortly.')}</p></AppShell>
  if (!logs) return <AppShell tab="interest" title={title}><PageSkeleton compact /></AppShell>

  const add = async (schoolId: number) => {
    if (busy) return
    setBusy(true)
    const row = { school_id: schoolId, kind: draft.kind, happened_on: draft.date || null, note: draft.note.trim() || null }
    try {
      const saved = demo ? { id: -Date.now(), ...row } : await insertRow<InterestLog>('interest_logs', userId, row)
      if (saved) { setLogs([saved, ...logs]); setDraft({ ...draft, note: '' }) }
    } catch { /* insertRow가 알림 */ } finally { setBusy(false) }
  }
  const remove = async (l: InterestLog) => {
    const before = logs
    setLogs(logs.filter((x) => x.id !== l.id))
    if (demo) return
    try { await deleteRow('interest_logs', l.id) } catch { setLogs(before) }
  }

  const considered = mySchools.filter((s) => s.demonstrated_interest === true)
  const emptyConsidered = considered.filter((s) => !logs.some((l) => l.school_id === s.id))
  const addable = all.filter((s) => !mySchools.some((m) => m.id === s.id)).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <AppShell tab="interest" title={title}>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          [String(logs.length), t('기록', 'Entries')],
          [`${considered.length}/${mySchools.length}`, t('관심도 반영 학교', 'Schools that consider it')],
          [String(emptyConsidered.length), t('반영 학교 중 기록 없음', 'Considered, no entries')],
        ].map(([n, l]) => (
          <div key={l} className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-center">
            <p className="text-xl font-extrabold tabular-nums text-gray-900">{n}</p>
            <p className="text-[11px] leading-tight text-gray-500">{l}</p>
          </div>
        ))}
      </div>
      {emptyConsidered.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          {t(`관심도를 평가에 반영한다고 공시했는데 아직 기록이 없는 학교: ${emptyConsidered.map((s) => s.name).join(', ')}`, `These schools report considering interest, but you have no entries yet: ${emptyConsidered.map((s) => s.name).join(', ')}`)}
        </p>
      )}

      {/* 편집 가이드 */}
      <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <button onClick={() => setGuideOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="text-sm font-semibold text-gray-900">{t('관심 표현, 이렇게 봐요', 'How demonstrated interest works')}</span>
          <ChevronDown size={16} className={`text-gray-400 ${guideOpen ? 'rotate-180' : ''}`} />
        </button>
        {guideOpen && (
          <div className="mt-2 text-[13px] leading-relaxed text-gray-700">
            <ol className="flex list-decimal flex-col gap-1 pl-4">
              <li>{t('학교가 지원자의 관심도를 평가에 반영하는지는 각 학교 Common Data Set의 C7 항목 "Level of applicant’s interest"에 공시돼요. 이 화면의 "반영함 / 반영 안 함" 표시는 그 값이에요.', 'Whether a college weighs applicant interest is published in its Common Data Set, item C7 “Level of applicant’s interest”. The “Considered / Not considered” tags here come from that.')}</li>
              <li>{t('"반영 안 함"인 학교는 관심 표현이 평가 요소가 아니에요 — 그래도 설명회·방문은 학교를 알아보는 데 도움이 돼요.', '“Not considered” means interest isn’t an admission factor there — info sessions and visits can still help you learn about the school.')}</li>
              <li>{t('흔한 방법: 메일링 리스트 등록, 온라인 설명회, 캠퍼스 방문, 우리 학교에 오는 입학 담당자 설명회, 대학 박람회, 인터뷰.', 'Common ways: join the mailing list, attend an online info session, visit campus, meet admissions reps visiting your school or at college fairs, interview.')}</li>
              <li>{t('설명회·방문에서 인상 깊었던 점을 메모해 두면 "왜 우리 학교인가(Why us)" 에세이 소재가 돼요.', 'Note what stood out at each session or visit — it becomes material for “Why us” essays.')}</li>
            </ol>
            <p className="mt-2 text-[11px] text-gray-400"><Pin size={11} className="mr-1 inline -mt-0.5" />{t('3·4번은 편집 가이드예요. 학교가 무엇을 어떻게 기록하는지는 대부분 공개하지 않아요.', 'Items 3–4 are an editorial guide. Most colleges don’t publish exactly what they track.')}</p>
          </div>
        )}
      </div>

      {/* 학교별 */}
      <div className="mt-4 flex flex-col gap-2.5">
        {mySchools.length === 0 && (
          <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500 ring-1 ring-gray-200">{t('목표 학교를 정하거나 아래에서 학교를 추가하면 여기에 나와요.', 'Set target schools, or add a school below.')}</p>
        )}
        {mySchools.map((s) => {
          const mine = logs.filter((l) => l.school_id === s.id)
          const isOpen = openSchool === s.id
          const di = s.demonstrated_interest
          return (
            <div key={s.id} className="rounded-xl border-2 border-gray-200 bg-white">
              <button onClick={() => setOpenSchool(isOpen ? null : s.id)} aria-expanded={isOpen} className="flex w-full items-center gap-2 px-4 py-3 text-left">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${di === true ? 'bg-blue-50 text-blue-700' : di === false ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                      {di === true ? t('관심도 반영 (CDS)', 'Considers interest (CDS)') : di === false ? t('반영 안 함 (CDS)', 'Not considered (CDS)') : t('공시 없음', 'Not reported')}
                    </span>
                    {(() => {
                      const iv = reqs?.get(s.id)?.interview
                      if (!iv?.offered) return null
                      return <span className="rounded-full bg-gray-50 px-2 py-0.5 text-gray-600 ring-1 ring-gray-200" title={iv.intl ? t(...INTL[iv.intl]) : undefined}>{t('인터뷰: ', 'Interview: ')}{t(OFFERED[iv.offered].ko, OFFERED[iv.offered].en)}{iv.intl === 'not_available' ? t(' · 해외 불가', ' · not abroad') : ''}</span>
                    })()}
                    <span className="text-gray-500">{mine.length > 0 ? t(`기록 ${mine.length}개 · 최근 ${mine[0].happened_on ?? '—'}`, `${mine.length} entries · latest ${mine[0].happened_on ?? '—'}`) : t('기록 없음', 'No entries')}</span>
                  </p>
                </div>
                <ChevronDown size={16} className={`shrink-0 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {mine.length > 0 && (
                    <ul className="mb-3 flex flex-col gap-1.5">
                      {mine.map((l) => (
                        <li key={l.id} className="flex items-start gap-2 text-sm">
                          <span className="shrink-0 tabular-nums text-[11px] text-gray-400">{l.happened_on ?? '—'}</span>
                          <span className="min-w-0 flex-1 text-gray-800">{kindLabel[l.kind]}{l.note && <span className="block text-[12px] text-gray-500">{l.note}</span>}</span>
                          <button onClick={() => void remove(l)} aria-label={t('삭제', 'Delete')} className="shrink-0 p-0.5 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {KINDS.map((k) => (
                      <button key={k} onClick={() => setDraft({ ...draft, kind: k })} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${draft.kind === k ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{kindLabel[k]}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-36 shrink-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800" />
                    <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={300} placeholder={t('메모 (인상 깊었던 점)', 'Note (what stood out)')} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none" />
                  </div>
                  <button onClick={() => void add(s.id)} disabled={busy} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white disabled:bg-gray-300">
                    <Plus size={14} />{t('기록 추가', 'Add entry')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {addable.length > 0 && (
        <label className="mt-4 block text-xs text-gray-500">
          {t('다른 학교 추가', 'Add another school')}
          <select value="" onChange={(e) => { const id = Number(e.target.value); if (id) { setExtra([...extra, id]); setOpenSchool(id) } }} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <option value="">{t('학교 선택…', 'Choose a school…')}</option>
            {addable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
    </AppShell>
  )
}
