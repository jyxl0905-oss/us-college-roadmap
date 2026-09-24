import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Pin, Check, AlertTriangle, ChevronDown } from 'lucide-react'
import AppShell from './AppShell'
import { supabase } from '../lib/supabase'
import { t, bilingual } from '../i18n'
import type { ProfileRow } from '../lib/profile'
import { loadSchools } from '../lib/schoolsCache'
import { tierSchoolsFrom } from '../lib/tierSchools'
import type { School } from '../lib/types'
import { PageSkeleton } from '../ui/Skeleton'
import { insertRow, updateRow, deleteRow } from './appData'
import { DEMO_USER_ID } from '../demo/demoProfile'

// 추천서 관리 — 누구에게 부탁했는지·진행 상태·자료 전달·감사 인사·어느 학교에 보낼지 기록 (실제 제출은 Common App에서 추천인이 직접)
export type RecRole = 'counselor' | 'teacher' | 'other'
export type RecStatus = 'planned' | 'asked' | 'agreed' | 'submitted' | 'declined'
export interface Recommender {
  id: number
  name: string
  role: RecRole
  subject: string | null
  status: RecStatus
  asked_on: string | null
  due_on: string | null
  brag_sheet_sent: boolean
  thank_you_sent: boolean
  school_ids: number[]
  notes: string | null
}

const REC_MAX = 15
const roleLabel: Record<RecRole, string> = bilingual({ counselor: '카운슬러', teacher: '선생님', other: '기타' }, { counselor: 'Counselor', teacher: 'Teacher', other: 'Other' })
const STEPS: RecStatus[] = ['planned', 'asked', 'agreed', 'submitted']
const statusLabel: Record<RecStatus, string> = bilingual(
  { planned: '부탁 예정', asked: '부탁함', agreed: '수락', submitted: '제출 완료', declined: '거절됨' },
  { planned: 'Planned', asked: 'Asked', agreed: 'Agreed', submitted: 'Submitted', declined: 'Declined' },
)

// 체험(데모) 계정: DB 대신 예시 기록으로 동작 (저장 안 함)
const DEMO_RECS: Recommender[] = [
  { id: -1, name: 'Ms. Kim', role: 'teacher', get subject() { return t('AP Calculus BC (11학년)', 'AP Calculus BC (grade 11)') }, status: 'agreed', asked_on: '2027-05-10', due_on: '2027-10-25', brag_sheet_sent: true, thank_you_sent: false, school_ids: [], notes: null },
  { id: -2, name: 'Mr. Lee', role: 'counselor', subject: null, status: 'asked', asked_on: '2027-05-20', due_on: '2027-10-25', brag_sheet_sent: false, thank_you_sent: false, school_ids: [], notes: null },
]

const today = () => new Date().toISOString().slice(0, 10)
const daysUntil = (d: string) => Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime()) / 86400000)

export default function RecommendersTab({ userId, profile }: { userId: string; profile: ProfileRow }) {
  const [recs, setRecs] = useState<Recommender[] | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<{ name: string; role: RecRole; subject: string }>({ name: '', role: 'teacher', subject: '' })
  const [guideOpen, setGuideOpen] = useState(false)
  const [error, setError] = useState(false)

  const demo = userId === DEMO_USER_ID
  useEffect(() => {
    if (demo) { setRecs(DEMO_RECS) } else if (!supabase) { setRecs([]) } else
    supabase.from('recommenders').select('*').eq('user_id', userId).order('id').then(({ data, error }) => {
      if (error) { setError(true); return }
      setRecs((data ?? []) as Recommender[])
    })
    loadSchools().then((all) => setSchools(
      profile.target_mode === 'schools' ? all.filter((s) => profile.target_school_ids.includes(s.id))
        : profile.target_mode === 'tier' ? tierSchoolsFrom(all, profile.target_tier) : [],
    ))
  }, [userId, profile.target_mode, profile.target_tier, profile.target_school_ids.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <AppShell tab="recommenders" title={t('추천서', 'Recommendations')}><p className="mt-8 text-center text-sm text-gray-500">{t('불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 'Couldn’t load. Please try again shortly.')}</p></AppShell>
  if (!recs) return <AppShell tab="recommenders" title={t('추천서', 'Recommendations')}><PageSkeleton compact /></AppShell>

  // 낙관적 갱신 + 실패 시 되돌림 (updateRow가 알림을 띄움)
  const patch = async (r: Recommender, p: Partial<Recommender>) => {
    const before = recs
    setRecs(recs.map((x) => (x.id === r.id ? { ...x, ...p } : x)))
    if (demo) return
    try { await updateRow<Recommender>('recommenders', r.id, p) } catch { setRecs(before) }
  }
  const add = async () => {
    if (!draft.name.trim()) return
    const row = demo
      ? { id: -Date.now(), name: draft.name.trim(), role: draft.role, subject: draft.subject.trim() || null, status: 'planned' as RecStatus, asked_on: null, due_on: null, brag_sheet_sent: false, thank_you_sent: false, school_ids: [], notes: null }
      : await insertRow<Recommender>('recommenders', userId, { name: draft.name.trim(), role: draft.role, subject: draft.subject.trim() || null, status: 'planned', asked_on: null, due_on: null, brag_sheet_sent: false, thank_you_sent: false, school_ids: [], notes: null })
    if (row) { setRecs([...recs, row]); setDraft({ name: '', role: 'teacher', subject: '' }); setAdding(false) }
  }
  const remove = async (r: Recommender) => {
    if (!confirm(t(`${r.name} 기록을 삭제할까요?`, `Delete ${r.name}?`))) return
    const before = recs
    setRecs(recs.filter((x) => x.id !== r.id))
    if (demo) return
    try { await deleteRow('recommenders', r.id) } catch { setRecs(before) }
  }

  const active = recs.filter((r) => r.status !== 'declined')
  const submitted = active.filter((r) => r.status === 'submitted').length
  const soon = active.filter((r) => r.due_on && r.status !== 'submitted' && daysUntil(r.due_on) <= 14)

  return (
    <AppShell tab="recommenders" title={t('추천서', 'Recommendations')}>
      {/* 요약 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          [String(active.length), t('추천인', 'Recommenders')],
          [`${submitted}/${active.length}`, t('제출 완료', 'Submitted')],
          [String(active.filter((r) => r.status === 'submitted' && !r.thank_you_sent).length), t('감사 인사 남음', 'Thank-yous left')],
        ].map(([n, l]) => (
          <div key={l} className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-center">
            <p className="text-xl font-extrabold tabular-nums text-gray-900">{n}</p>
            <p className="text-[11px] text-gray-500">{l}</p>
          </div>
        ))}
      </div>
      {soon.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          {t(`마감이 2주 안으로 다가온 추천서가 있어요: ${soon.map((r) => r.name).join(', ')}`, `Due within 2 weeks: ${soon.map((r) => r.name).join(', ')}`)}
        </p>
      )}

      {/* 편집 가이드 */}
      <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <button onClick={() => setGuideOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="text-sm font-semibold text-gray-900">{t('추천서, 이렇게 준비해요', 'How to handle recommendations')}</span>
          <ChevronDown size={16} className={`text-gray-400 ${guideOpen ? 'rotate-180' : ''}`} />
        </button>
        {guideOpen && (
          <div className="mt-2 text-[13px] leading-relaxed text-gray-700">
            <ol className="flex list-decimal flex-col gap-1 pl-4">
              <li>{t('누구에게 몇 명이 필요한지는 학교마다 달라요 — Common App의 학교별 요구 사항(Requirements)에서 확인하세요.', 'How many (and from whom) varies by college — check each school’s Requirements in the Common App.')}</li>
              <li>{t('나를 잘 아는 핵심 과목 선생님께, 마감보다 넉넉히 앞서 직접 부탁하세요.', 'Ask teachers who know you well in core subjects, in person and well ahead of deadlines.')}</li>
              <li>{t('수락하면 활동·목표·인상 깊었던 수업 순간을 정리한 자료(브래그 시트)를 드리세요.', 'Once they agree, share a short brag sheet: activities, goals and memorable class moments.')}</li>
              <li>{t('Common App에서는 "Recommenders and FERPA" 단계에서 FERPA 동의를 마친 뒤 추천인을 초대해요. 선생님이 초대 메일을 받아 직접 제출해요.', 'In the Common App, complete the FERPA release in “Recommenders and FERPA”, then invite recommenders — they submit directly via the email invite.')}</li>
              <li>{t('제출이 끝나면 감사 인사를 꼭 전하세요.', 'Thank them once it’s submitted.')}</li>
            </ol>
            <p className="mt-2 text-[11px] text-gray-400"><Pin size={11} className="mr-1 inline -mt-0.5" />{t('편집 가이드예요. 이 화면은 기록용이고, 실제 추천서 제출은 Common App 등에서 추천인이 해요.', 'Editorial guide. This page is for tracking — recommenders submit through the Common App or school portals.')}</p>
          </div>
        )}
      </div>

      {/* 목록 */}
      <div className="mt-4 flex flex-col gap-3">
        {recs.length === 0 && !adding && (
          <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500 ring-1 ring-gray-200">{t('아직 추천인이 없어요. 부탁할 선생님부터 적어 보세요.', 'No recommenders yet. Start with the teachers you plan to ask.')}</p>
        )}
        {recs.map((r) => {
          const stepIdx = STEPS.indexOf(r.status)
          const late = r.due_on && r.status !== 'submitted' && daysUntil(r.due_on) < 0
          return (
            <div key={r.id} className={`rounded-xl border-2 bg-white px-4 py-3.5 ${r.status === 'declined' ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500">{roleLabel[r.role]}{r.subject ? ` · ${r.subject}` : ''}</p>
                </div>
                <button onClick={() => void remove(r)} aria-label={t('삭제', 'Delete')} className="rounded-lg p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>

              {/* 진행 단계 */}
              <div className="mt-3 grid grid-cols-4 gap-1">
                {STEPS.map((s, i) => {
                  const done = r.status !== 'declined' && i <= stepIdx
                  return (
                    <button key={s} onClick={() => void patch(r, { status: s, ...(s === 'asked' && !r.asked_on ? { asked_on: today() } : {}) })} className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold ${done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {statusLabel[s]}
                    </button>
                  )
                })}
              </div>
              {r.status !== 'submitted' && (
                <button onClick={() => void patch(r, { status: r.status === 'declined' ? 'planned' : 'declined' })} className="mt-1 text-[11px] text-gray-400 underline">
                  {r.status === 'declined' ? t('거절 표시 취소', 'Undo declined') : t('거절됨으로 표시', 'Mark as declined')}
                </button>
              )}

              {/* 날짜·체크 */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1 text-gray-500">{t('부탁한 날', 'Asked on')}
                  <input type="date" value={r.asked_on ?? ''} onChange={(e) => void patch(r, { asked_on: e.target.value || null })} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800" />
                </label>
                <label className="flex flex-col gap-1 text-gray-500">{t('마감 (가장 이른 학교)', 'Due (earliest school)')}
                  <input type="date" value={r.due_on ?? ''} onChange={(e) => void patch(r, { due_on: e.target.value || null })} className={`rounded-lg border px-2 py-1.5 text-sm ${late ? 'border-red-300 text-red-700' : 'border-gray-200 text-gray-800'}`} />
                </label>
              </div>
              {r.due_on && r.status !== 'submitted' && (
                <p className={`mt-1 text-[11px] ${late ? 'text-red-600' : 'text-gray-500'}`}>{late ? t(`마감 ${-daysUntil(r.due_on)}일 지남`, `${-daysUntil(r.due_on)} days past due`) : t(`마감까지 ${daysUntil(r.due_on)}일`, `${daysUntil(r.due_on)} days left`)}</p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-700">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.brag_sheet_sent} onChange={(e) => void patch(r, { brag_sheet_sent: e.target.checked })} className="h-4 w-4 accent-blue-600" />{t('자료(브래그 시트) 전달', 'Brag sheet shared')}</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={r.thank_you_sent} onChange={(e) => void patch(r, { thank_you_sent: e.target.checked })} className="h-4 w-4 accent-blue-600" />{t('감사 인사', 'Thank-you sent')}</label>
              </div>

              {/* 보낼 학교 */}
              {schools.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-gray-500">{t('이 추천서를 보낼 학교', 'Schools this goes to')}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {schools.map((s) => {
                      const on = r.school_ids.includes(s.id)
                      return (
                        <button key={s.id} onClick={() => void patch(r, { school_ids: on ? r.school_ids.filter((x) => x !== s.id) : [...r.school_ids, s.id] })} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${on ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                          {on && <Check size={11} />}{s.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <textarea
                defaultValue={r.notes ?? ''}
                onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (r.notes ?? null)) void patch(r, { notes: v }) }}
                maxLength={1000}
                placeholder={t('메모 (예: 수업에서 기억해 주셨으면 하는 점, 연락 방법)', 'Notes (e.g., what you hope they mention, how to reach them)')}
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                rows={2}
              />
            </div>
          )
        })}

        {adding ? (
          <div className="rounded-xl border-2 border-blue-200 bg-white px-4 py-3.5">
            <p className="text-sm font-semibold text-gray-900">{t('추천인 추가', 'Add a recommender')}</p>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={100} placeholder={t('이름 (예: Ms. Kim)', 'Name (e.g., Ms. Kim)')} className="mt-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(['teacher', 'counselor', 'other'] as RecRole[]).map((ro) => (
                <button key={ro} onClick={() => setDraft({ ...draft, role: ro })} className={`rounded-lg py-2 text-sm font-medium ${draft.role === ro ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600'}`}>{roleLabel[ro]}</button>
              ))}
            </div>
            {draft.role === 'teacher' && <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} maxLength={100} placeholder={t('과목 (예: AP Calculus BC, 11학년)', 'Subject (e.g., AP Calculus BC, grade 11)')} className="mt-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />}
            <div className="mt-3 flex gap-2">
              <button onClick={() => void add()} disabled={!draft.name.trim()} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400">{t('추가', 'Add')}</button>
              <button onClick={() => setAdding(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600">{t('취소', 'Cancel')}</button>
            </div>
          </div>
        ) : recs.length < REC_MAX && (
          <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-white py-3 text-sm font-semibold text-gray-600 active:bg-gray-50">
            <UserPlus size={16} />{t('추천인 추가', 'Add a recommender')}
          </button>
        )}
      </div>
    </AppShell>
  )
}
