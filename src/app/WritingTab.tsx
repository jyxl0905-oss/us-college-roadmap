import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AppShell from './AppShell'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import { COMMON_APP_PROMPTS, COMMON_APP_PROMPTS_SOURCE, COMMON_APP_PROMPTS_YEAR, COMMON_APP_WORD_RANGE } from '../data/commonAppPrompts'
import type { ProfileRow } from '../lib/profile'
import { loadSchools } from '../lib/schoolsCache'
import type { School } from '../lib/types'
import SchoolLogo from '../browse/SchoolLogo'
import {
  updateRow, loadAppRecords, essayStatusKo, wordCount,
  type Essay, type EssayStatus,
} from './appData'

interface WritingTabProps {
  userId: string
  profile: ProfileRow
}

const PERSONAL_WORD_LIMIT = 650 // Common App 개인 에세이 단어 제한
const SPLIT_KEY = 'essay_split_pct' // 작성 창 좌/우 분할 비율 (md+)

// 작성 창 대상: id=null이면 새 항목, focusBody면 본문 칸에 포커스
interface WorkspaceTarget { id: number | null; schoolId: number | null; focusBody: boolean; seedPrompt?: string; defaultLimit?: number }

// F5 에세이 — 문항·상태·메모 + 본문을 한 작성 창에서 기록 (자동 저장)
export default function WritingTab({ userId, profile }: WritingTabProps) {
  const [essays, setEssays] = useState<Essay[] | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [showPrompts, setShowPrompts] = useState(false)
  const [ws, setWs] = useState<WorkspaceTarget | null>(null)

  useEffect(() => {
    loadAppRecords(userId).then((r) => setEssays(r.essays))
    loadSchools().then((all) =>
      setSchools(
        profile.target_mode === 'schools'
          ? all.filter((s) => profile.target_school_ids.includes(s.id))
          : profile.target_mode === 'tier'
            ? all.filter((s) => s.tier === profile.target_tier)
            : [],
      ),
    )
  }, [userId, profile.target_mode, profile.target_tier, profile.target_school_ids.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!essays) return <AppShell tab="writing" title={t('에세이', 'Essays')}><p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p></AppShell>

  const personal = essays.filter((e) => e.school_id === null)
  const forSchool = (id: number) => essays.filter((e) => e.school_id === id)

  const setStatus = async (e: Essay, status: EssayStatus) => {
    const before = essays
    setEssays(essays.map((x) => (x.id === e.id ? { ...x, status } : x))) // 낙관적 갱신
    try {
      await updateRow<Essay>('essays', e.id, { status })
    } catch {
      setEssays(before) // 실패 시 되돌림 (updateRow가 이미 alert)
    }
  }

  const statusPill = (e: Essay) => (
    <select
      value={e.status}
      onChange={(ev) => setStatus(e, ev.target.value as EssayStatus)}
      onClick={(ev) => ev.stopPropagation()}
      className={`rounded-full border-2 px-2 py-0.5 text-xs font-medium ${
        e.status === 'done' ? 'border-green-300 bg-green-50 text-green-700' : e.status === 'not_started' ? 'border-gray-200 bg-white text-gray-500' : 'border-blue-200 bg-blue-50 text-blue-700'
      }`}
    >
      {(Object.keys(essayStatusKo) as EssayStatus[]).map((s) => <option key={s} value={s}>{essayStatusKo[s]}</option>)}
    </select>
  )

  const essayCard = (e: Essay) => (
    <div key={e.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-gray-800">{e.prompt || <span className="text-gray-300">{t('문항 미입력', 'No prompt set')}</span>}</p>
        {statusPill(e)}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        {e.word_limit ? <span className="shrink-0">{t(`${e.word_limit}단어`, `${e.word_limit} words`)}</span> : null}
        {e.notes && <span className="min-w-0 truncate">{t('메모: ', 'Note: ')}{e.notes}</span>}
        <button onClick={() => setWs({ id: e.id, schoolId: e.school_id, focusBody: false })} className="ml-auto shrink-0 text-blue-600 underline">{t('편집', 'Edit')}</button>
      </div>
      <button
        onClick={() => setWs({ id: e.id, schoolId: e.school_id, focusBody: true })}
        className="mt-2 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-xs active:bg-gray-100"
      >
        <span className="font-semibold text-gray-700">
          {e.body ? t('✍️ 이어서 쓰기', '✍️ Keep writing') : t('✍️ 본문 쓰기', '✍️ Write the essay')}
        </span>
        <span className="text-gray-400">
          {e.body
            ? t(`${wordCount(e.body)}단어 저장됨`, `${wordCount(e.body)} words saved`)
            : t('앱 안에서 쓰고 자동 저장돼요', 'Write here — saves automatically')}
        </span>
      </button>
    </div>
  )

  return (
    <AppShell tab="writing" title={t('에세이', 'Essays')}>
      <p className="mt-3 rounded-xl bg-gray-100 px-3.5 py-2.5 text-xs text-gray-600">
        {t('문항·진행 상태·메모에 더해 ', 'Along with the prompt, status and notes, you can now ')}<span className="font-semibold">{t('본문도 앱 안에서 직접 쓰고 저장', 'write and save the essay itself in the app')}</span>{t('할 수 있어요 (자동 저장). 중요한 본문은 구글 독스에도 백업해 두면 안전해요.', ' (autosaved). For safety, keep a backup of important drafts in Google Docs too.')}
      </p>

      {/* 개인 에세이 */}
      <div className="mt-5 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">{t('개인 에세이 (Personal Essay)', 'Personal Essay')}</h2>
        <span className="text-xs text-gray-400">{t(`${PERSONAL_WORD_LIMIT}단어 이내`, `up to ${PERSONAL_WORD_LIMIT} words`)}</span>
      </div>
      {/* Common App 공통 문항 7개 — 공식 문구 + 한국어 요약. 학교별 보충 에세이는 각 학교 공식 페이지에서 */}
      <div className="mt-2 rounded-xl border border-gray-200 bg-white">
        <button onClick={() => setShowPrompts((v) => !v)} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-medium text-gray-800">
          <span>📝 {t(`Common App 공통 문항 7개 보기 (${COMMON_APP_PROMPTS_YEAR})`, `See the 7 Common App prompts (${COMMON_APP_PROMPTS_YEAR})`)}</span>
          <span className="text-gray-400">{showPrompts ? '▴' : '▾'}</span>
        </button>
        {showPrompts && (
          <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-2">
            <p className="text-xs text-gray-500">
              {t(`7개 중 하나를 골라 ${COMMON_APP_WORD_RANGE}단어. 문항은 대부분 해마다 같지만 여름에 공식 페이지에서 확인하세요. 학교별 보충 에세이는 각 학교 입학처 페이지에서 직접 찾아 아래 학교 칸에 붙여넣어요.`, `Pick one of the 7 and write ${COMMON_APP_WORD_RANGE} words. Prompts usually stay the same year to year, but confirm on the official page each summer. Find each school's supplements on its admissions page and paste them into the school sections below.`)}
              {' '}<a href={COMMON_APP_PROMPTS_SOURCE} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 문항 페이지 ↗', 'Official prompts ↗')}</a>
            </p>
            <ol className="mt-2 flex flex-col gap-2">
              {COMMON_APP_PROMPTS.map((pr) => (
                <li key={pr.n} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500">#{pr.n} · {pr.ko}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-700">{pr.en}</p>
                  {personal.length === 0 && (
                    <button onClick={() => { setWs({ id: null, schoolId: null, focusBody: false, seedPrompt: `Common App #${pr.n}: ${pr.en}`, defaultLimit: PERSONAL_WORD_LIMIT }); setShowPrompts(false) }} className="mt-1 text-xs font-semibold text-blue-600 underline">
                      {t('이 문항으로 쓰기 시작', 'Start writing with this prompt')}
                    </button>
                  )}
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              <p className="font-semibold">{t('소재 고르는 팁', 'Picking a topic')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>{t('"대단한 사건"보다 "나만 아는 작은 순간" — AO는 성취 목록이 아니라 생각하는 방식을 보고 싶어 해요.', 'A small moment only you know beats a big event — AOs want to see how you think, not a list of achievements.')}</li>
                <li>{t('활동란에 이미 있는 내용을 반복하지 않기 — 에세이는 원서의 빈칸을 채우는 곳.', 'Don’t repeat what is already in your activities list — the essay fills the gaps in your application.')}</li>
                <li>{t('11학년 봄에 소재 3개만 적어두고, 여름에 하나를 골라 초안.', 'Note 3 ideas in 11th-grade spring, pick one and draft in summer.')}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {personal.map(essayCard)}
        {personal.length === 0 && (
          <button onClick={() => setWs({ id: null, schoolId: null, focusBody: false, defaultLimit: PERSONAL_WORD_LIMIT })} className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-500 active:bg-gray-50">
            {t('＋ 개인 에세이 시작', '＋ Start a personal essay')}
          </button>
        )}
      </div>

      {/* 학교별 보충 에세이 */}
      <h2 className="mt-7 font-semibold text-gray-900">{t('학교별 보충 에세이 (Supplements)', 'School Supplements')}</h2>
      <p className="mt-0.5 text-xs text-gray-400">{t('문항은 매년 바뀌어요 — 학교 공식 페이지에서 확인해 직접 붙여넣어요.', 'Prompts change every year — check the school’s official page and paste them in yourself.')}</p>
      {schools.length === 0 && <p className="mt-3 text-sm text-gray-400">{t('목표 학교를 설정하면 학교별 칸이 생겨요.', 'Set your target schools to get a section for each one.')}</p>}
      {schools.map((s) => (
        <div key={s.id} className="mt-4">
          <div className="flex items-center gap-2">
            <SchoolLogo schoolId={s.id} name={s.name} size={24} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{s.name}</p>
            <span className="text-xs text-gray-400">{t(`${forSchool(s.id).length}개`, `${forSchool(s.id).length}`)}</span>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {forSchool(s.id).map(essayCard)}
            <button onClick={() => setWs({ id: null, schoolId: s.id, focusBody: false })} className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 active:bg-gray-50">
              {t('＋ 문항 추가', '＋ Add prompt')}
            </button>
          </div>
        </div>
      ))}

      {ws && (
        <EssayWorkspace
          key={ws.id ?? 'new'}
          userId={userId}
          essay={ws.id !== null ? essays.find((e) => e.id === ws.id) ?? null : null}
          schoolId={ws.schoolId}
          seedPrompt={ws.seedPrompt}
          defaultLimit={ws.defaultLimit}
          focusBody={ws.focusBody}
          onClose={({ row, deletedId }) => {
            setEssays((prev) => {
              if (!prev) return prev
              let next = prev
              if (deletedId !== null) next = next.filter((e) => e.id !== deletedId)
              if (row) next = next.some((e) => e.id === row.id) ? next.map((e) => (e.id === row.id ? row : e)) : [...next, row]
              return next
            })
            setWs(null)
          }}
        />
      )}
    </AppShell>
  )
}

// 에세이 작성 창 — 전체 화면. md+에선 왼쪽 문항·상태·메모 / 오른쪽 본문을 나란히 두고
// 가운데 경계선을 드래그해 크기 조절. 모바일은 위 접이식 폼 + 아래 본문. 모든 필드 1.2초 자동 저장.
function EssayWorkspace({
  userId, essay, schoolId, seedPrompt, defaultLimit, focusBody, onClose,
}: {
  userId: string
  essay: Essay | null
  schoolId: number | null
  seedPrompt?: string
  defaultLimit?: number
  focusBody: boolean
  onClose: (r: { row: Essay | null; deletedId: number | null }) => void
}) {
  const [prompt, setPrompt] = useState(essay?.prompt ?? seedPrompt ?? '')
  const [status, setStatusField] = useState<EssayStatus>(essay?.status ?? 'not_started')
  const [limit, setLimit] = useState<string>(essay?.word_limit?.toString() ?? defaultLimit?.toString() ?? '')
  const [notes, setNotes] = useState(essay?.notes ?? '')
  const [body, setBody] = useState(essay?.body ?? '')
  const [savedAt, setSavedAt] = useState<string | null>(essay?.body_saved_at ?? null)
  const [state, setState] = useState<'idle' | 'dirty' | 'saving' | 'error'>('idle')
  const [formOpen, setFormOpen] = useState(!focusBody) // 모바일 접이식 폼
  const [leftPct, setLeftPct] = useState(() => {
    const v = Number(localStorage.getItem(SPLIT_KEY))
    return Number.isFinite(v) && v >= 22 && v <= 65 ? v : 34
  })

  const rowRef = useRef<Essay | null>(essay)
  const fieldsRef = useRef({ prompt, status, limit, notes, body })
  fieldsRef.current = { prompt, status, limit, notes, body }
  // 마지막으로 저장에 성공한 스냅샷 — 다르면 저장할 게 남아 있는 상태
  const snap = (f: typeof fieldsRef.current) => JSON.stringify(f)
  const savedSnapRef = useRef(essay ? snap({ prompt: essay.prompt, status: essay.status, limit: essay.word_limit?.toString() ?? defaultLimit?.toString() ?? '', notes: essay.notes ?? '', body: essay.body ?? '' }) : '')
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const leftPctRef = useRef(leftPct)
  leftPctRef.current = leftPct
  const containerRef = useRef<HTMLDivElement>(null)
  const bodyElRef = useRef<HTMLTextAreaElement>(null)

  const limitNum = limit.trim() === '' ? null : Number(limit)
  const limitBad = limitNum !== null && (!Number.isInteger(limitNum) || limitNum <= 0)

  const persist = useCallback(async (): Promise<void> => {
    if (!supabase || busyRef.current) return
    const f = { ...fieldsRef.current }
    if (snap(f) === savedSnapRef.current) return
    const ln = f.limit.trim() === '' ? null : Number(f.limit)
    const now = new Date().toISOString()
    const data = {
      school_id: schoolId,
      prompt: f.prompt.trim(),
      status: f.status,
      word_limit: ln !== null && Number.isInteger(ln) && ln > 0 ? ln : null,
      notes: f.notes.trim() || null,
      body: f.body || null,
      body_saved_at: f.body ? now : rowRef.current?.body_saved_at ?? null,
      updated_at: now,
    }
    busyRef.current = true
    setState('saving')
    try {
      if (!rowRef.current) {
        // 아무것도 안 썼으면 행을 만들지 않음 (빈 항목 방지)
        if (!data.prompt && !data.body && !data.notes) { setState('idle'); return }
        const { data: created, error } = await supabase.from('essays').insert({ user_id: userId, ...data }).select('*').single()
        if (error) { setState('error'); return }
        rowRef.current = created as Essay
      } else {
        const { error } = await supabase.from('essays').update(data).eq('id', rowRef.current.id)
        if (error) { setState('error'); return }
        rowRef.current = { ...rowRef.current, ...data } as Essay
      }
      savedSnapRef.current = snap(f)
      if (f.body) setSavedAt(now)
      setState(snap(fieldsRef.current) === savedSnapRef.current ? 'idle' : 'dirty')
    } finally {
      busyRef.current = false
    }
  }, [schoolId, userId])

  // 입력 1.2초 후 자동 저장 (문항·상태·메모·본문 전부)
  useEffect(() => {
    if (snap(fieldsRef.current) === savedSnapRef.current) return
    setState('dirty')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { void persist() }, 1200)
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [prompt, status, limit, notes, body, persist])

  // 이탈 시 저장 안 된 내용 경고
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (snap(fieldsRef.current) !== savedSnapRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    if (focusBody) bodyElRef.current?.focus()
  }, [focusBody])

  // 분할 크기 조절 (md+) — 경계선 드래그
  const onDividerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const onMove = (ev: PointerEvent) => {
      const pct = Math.min(65, Math.max(22, ((ev.clientX - rect.left) / rect.width) * 100))
      setLeftPct(pct)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      localStorage.setItem(SPLIT_KEY, String(Math.round(leftPctRef.current)))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const words = wordCount(body)
  const over = limitNum !== null && !limitBad && words > limitNum

  const close = async () => {
    await persist()
    if (snap(fieldsRef.current) !== savedSnapRef.current && rowRef.current === null) {
      // 새 항목인데 저장 실패 (또는 빈 항목) — 빈 항목이면 그냥 닫힘
      const f = fieldsRef.current
      if ((f.prompt.trim() || f.body.trim() || f.notes.trim()) &&
        !confirm(t('저장에 실패한 내용이 있어요. 그래도 닫을까요?', 'Some changes could not be saved. Close anyway?'))) return
    } else if (snap(fieldsRef.current) !== savedSnapRef.current) {
      if (!confirm(t('저장에 실패한 내용이 있어요. 그래도 닫을까요? (마지막 저장본만 남아요)', 'Some changes could not be saved. Close anyway? (Only the last saved version will be kept)'))) return
    }
    onClose({ row: rowRef.current, deletedId: null })
  }

  const del = async () => {
    if (!supabase || !rowRef.current) { onClose({ row: null, deletedId: null }); return }
    if (!confirm(t('이 에세이 항목을 삭제할까요? 본문까지 지워지고 되돌릴 수 없어요.', 'Delete this essay? The saved text is deleted too and cannot be recovered.'))) return
    const id = rowRef.current.id
    const { error } = await supabase.from('essays').delete().eq('id', id)
    if (error) {
      alert(t(`삭제에 실패했어요. 네트워크를 확인해 주세요.\n(${error.message})`, `Delete failed. Check your connection.\n(${error.message})`))
      return
    }
    onClose({ row: null, deletedId: id })
  }

  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'text-xs font-medium text-gray-500'
  const formFields = (
    <div className="flex flex-col gap-3">
      <div>
        <label className={label}>{schoolId === null ? t('문항 · 주제', 'Prompt · Topic') : t('문항 (공식 페이지에서 붙여넣기)', 'Prompt (paste from the official page)')}</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className={field}
          placeholder={schoolId === null ? t('예: Common App #2 — 실패에서 배운 것', 'e.g. Common App #2 — a lesson from failure') : t('예: Why NYU? (250 words)', 'e.g. Why NYU? (250 words)')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>{t('상태', 'Status')}</label>
          <select value={status} onChange={(e) => setStatusField(e.target.value as EssayStatus)} className={field}>
            {(Object.keys(essayStatusKo) as EssayStatus[]).map((s) => <option key={s} value={s}>{essayStatusKo[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>{t('단어 제한', 'Word limit')}</label>
          <input type="number" inputMode="numeric" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} className={`${field} ${limitBad ? 'border-red-400' : ''}`} />
        </div>
      </div>
      <div>
        <label className={label}>{t('메모 (짧게)', 'Note (short)')}</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} placeholder={t('예: 3번째 문단 다시 / 선생님 피드백 반영', 'e.g. redo paragraph 3 / apply teacher feedback')} />
      </div>
      {rowRef.current && (
        <button onClick={() => void del()} className="self-start text-xs text-red-500 underline">{t('이 에세이 삭제', 'Delete this essay')}</button>
      )}
    </div>
  )

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <button onClick={() => void close()} aria-label={t('뒤로 (저장하고 닫기)', 'Back (saves and closes)')} className="shrink-0 rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{prompt.trim() || t('새 에세이', 'New essay')}</p>
          <p className="text-xs text-gray-400">
            <span className={over ? 'font-semibold text-red-600' : ''}>
              {t(`${words}단어`, `${words} words`)}{limitNum !== null && !limitBad ? ` / ${limitNum}` : ''}
            </span>
            {' · '}
            {state === 'saving' ? t('저장 중…', 'Saving…')
              : state === 'dirty' ? t('입력 중…', 'Typing…')
              : state === 'error' ? t('⚠️ 저장 실패 — 연결 확인', '⚠️ Save failed — check connection')
              : savedAt ? t(`저장됨 ${new Date(savedAt).toLocaleTimeString()}`, `Saved ${new Date(savedAt).toLocaleTimeString()}`)
              : t('자동 저장돼요', 'Autosaves as you type')}
          </p>
        </div>
        {state === 'error' && (
          <button onClick={() => void persist()} className="shrink-0 rounded-lg border-2 border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">{t('다시 저장', 'Retry')}</button>
        )}
        <button onClick={() => void close()} className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white active:bg-gray-700">{t('완료', 'Done')}</button>
      </div>

      {/* 모바일: 접이식 폼 */}
      <div className="border-b border-gray-200 md:hidden">
        <button onClick={() => setFormOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-gray-700">
          <span>{t('문항 · 상태 · 메모', 'Prompt · Status · Notes')}</span>
          <span className="text-gray-400">{formOpen ? '▴' : '▾'}</span>
        </button>
        {formOpen && <div className="px-4 pb-4">{formFields}</div>}
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1">
        {/* md+: 왼쪽 문항 패널 */}
        <div className="hidden overflow-y-auto border-r border-gray-100 p-4 md:block" style={{ width: `${leftPct}%` }}>
          {formFields}
        </div>
        {/* 드래그 경계선 */}
        <div
          onPointerDown={onDividerDown}
          title={t('드래그해서 크기 조절', 'Drag to resize')}
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-gray-100 transition-colors hover:bg-blue-300 active:bg-blue-400 md:block"
        />
        <textarea
          ref={bodyElRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('여기에 에세이를 쓰세요. 쓰는 동안 자동으로 저장돼요.', 'Write your essay here. It saves automatically as you type.')}
          className="min-h-0 min-w-0 flex-1 resize-none px-4 py-4 text-[15px] leading-relaxed text-gray-900 focus:outline-none"
        />
      </div>

      {over && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
          {t(`단어 제한(${limitNum})을 ${words - (limitNum ?? 0)}단어 넘었어요.`, `You are ${words - (limitNum ?? 0)} words over the limit (${limitNum}).`)}
        </p>
      )}
    </div>,
    document.body,
  )
}
