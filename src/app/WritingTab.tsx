import { useEffect, useRef, useState } from 'react'
import AppShell from './AppShell'
import { t } from '../i18n'
import type { ProfileRow } from '../lib/profile'
import { loadSchools } from '../lib/schoolsCache'
import type { School } from '../lib/types'
import SchoolLogo from '../browse/SchoolLogo'
import {
  insertRow, updateRow, deleteRow, loadAppRecords, essayStatusKo,
  type Essay, type EssayStatus,
} from './appData'

interface WritingTabProps {
  userId: string
  profile: ProfileRow
}

const PERSONAL_WORD_LIMIT = 650 // Common App 개인 에세이 단어 제한

// F5 에세이 — 개인 에세이·학교별 보충 에세이의 문항/상태/메모만 저장 (본문은 저장하지 않음)
export default function WritingTab({ userId, profile }: WritingTabProps) {
  const [essays, setEssays] = useState<Essay[] | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [adding, setAdding] = useState<'personal' | number | null>(null) // number = school_id
  const [editing, setEditing] = useState<number | null>(null)
  const busyRef = useRef(false) // 저장·삭제 중복 요청 방지 (더블탭)

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

  const guarded = async (fn: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    try { await fn() } catch { /* insertRow/updateRow/deleteRow가 이미 alert */ } finally { busyRef.current = false }
  }
  const save = (draft: Omit<Essay, 'id'>, id: number | null) => guarded(async () => {
    if (id === null) {
      const row = await insertRow<Essay>('essays', userId, draft)
      if (row) setEssays([...essays, row])
    } else {
      await updateRow<Essay>('essays', id, draft)
      setEssays(essays.map((e) => (e.id === id ? { ...e, ...draft } : e)))
    }
    setAdding(null)
    setEditing(null)
  })
  const remove = (id: number) => guarded(async () => {
    if (!confirm(t('이 에세이 항목을 삭제할까요? 되돌릴 수 없어요.', 'Delete this essay entry? This cannot be undone.'))) return
    await deleteRow('essays', id)
    setEssays(essays.filter((e) => e.id !== id))
    setEditing(null)
  })
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

  const essayCard = (e: Essay) =>
    editing === e.id ? (
      <EssayForm key={e.id} initial={e} schoolId={e.school_id} onSave={(d) => save(d, e.id)} onCancel={() => setEditing(null)} onDelete={() => remove(e.id)} />
    ) : (
      <div key={e.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-gray-800">{e.prompt || <span className="text-gray-300">{t('문항 미입력', 'No prompt set')}</span>}</p>
          {statusPill(e)}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          {e.word_limit ? <span className="shrink-0">{t(`${e.word_limit}단어`, `${e.word_limit} words`)}</span> : null}
          {e.notes && <span className="min-w-0 truncate">{t('메모: ', 'Note: ')}{e.notes}</span>}
          <button onClick={() => setEditing(e.id)} className="ml-auto shrink-0 text-blue-600 underline">{t('편집', 'Edit')}</button>
        </div>
      </div>
    )

  return (
    <AppShell tab="writing" title={t('에세이', 'Essays')}>
      <p className="mt-3 rounded-xl bg-gray-100 px-3.5 py-2.5 text-xs text-gray-600">
        {t('여기엔 ', 'Only the ')}<span className="font-semibold">{t('문항·진행 상태·짧은 메모', 'prompt, status, and a short note')}</span>{t('만 저장돼요. 에세이 본문은 구글 독스 등 본인 문서에 두세요.', ' are saved here. Keep the essay text itself in your own document (e.g. Google Docs).')}
      </p>

      {/* 개인 에세이 */}
      <div className="mt-5 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">{t('개인 에세이 (Personal Essay)', 'Personal Essay')}</h2>
        <span className="text-xs text-gray-400">{t(`${PERSONAL_WORD_LIMIT}단어 이내`, `up to ${PERSONAL_WORD_LIMIT} words`)}</span>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {personal.map(essayCard)}
        {adding === 'personal' ? (
          <EssayForm schoolId={null} defaultLimit={PERSONAL_WORD_LIMIT} onSave={(d) => save(d, null)} onCancel={() => setAdding(null)} />
        ) : (
          personal.length === 0 && (
            <button onClick={() => setAdding('personal')} className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-500 active:bg-gray-50">
              {t('＋ 개인 에세이 주제 메모 시작', '＋ Start a personal essay topic note')}
            </button>
          )
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
            {adding === s.id ? (
              <EssayForm schoolId={s.id} onSave={(d) => save(d, null)} onCancel={() => setAdding(null)} />
            ) : (
              <button onClick={() => setAdding(s.id)} className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 active:bg-gray-50">
                {t('＋ 문항 추가', '＋ Add prompt')}
              </button>
            )}
          </div>
        </div>
      ))}
    </AppShell>
  )
}

function EssayForm({
  initial, schoolId, defaultLimit, onSave, onCancel, onDelete,
}: {
  initial?: Essay
  schoolId: number | null
  defaultLimit?: number
  onSave: (d: Omit<Essay, 'id'>) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [status, setStatus] = useState<EssayStatus>(initial?.status ?? 'not_started')
  const [limit, setLimit] = useState<string>(initial?.word_limit?.toString() ?? defaultLimit?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const limitNum = limit.trim() === '' ? null : Number(limit)
  const limitBad = limitNum !== null && (!Number.isInteger(limitNum) || limitNum <= 0)
  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'text-xs font-medium text-gray-500'
  return (
    <div className="rounded-xl border-2 border-blue-600 bg-white px-4 py-3">
      <label className={label}>{schoolId === null ? t('주제 메모 (본문 아님)', 'Topic note (not the essay itself)') : t('문항 (공식 페이지에서 붙여넣기)', 'Prompt (paste from the official page)')}</label>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className={field}
        placeholder={schoolId === null ? t('예: 로봇 동아리 실패 경험에서 배운 것', 'e.g. What I learned from a failure in robotics club') : t('예: Why NYU? (250 words)', 'e.g. Why NYU? (250 words)')} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className={label}>{t('상태', 'Status')}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as EssayStatus)} className={field}>
            {(Object.keys(essayStatusKo) as EssayStatus[]).map((s) => <option key={s} value={s}>{essayStatusKo[s]}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>{t('단어 제한', 'Word limit')}</label>
          <input type="number" inputMode="numeric" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} className={`${field} ${limitBad ? 'border-red-400' : ''}`} />
        </div>
      </div>
      <label className={`${label} mt-2 block`}>{t('메모 (짧게)', 'Note (short)')}</label>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} placeholder={t('예: 초안 구글독스 링크 / 3번째 문단 다시', 'e.g. Google Docs link / redo paragraph 3')} />
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={saving || limitBad}
          onClick={async () => {
            if (saving) return
            setSaving(true)
            try {
              await onSave({ school_id: schoolId, prompt: prompt.trim(), status, word_limit: limitNum, notes: notes.trim() || null })
            } finally { setSaving(false) }
          }}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300">{saving ? t('저장 중…', 'Saving…') : t('저장', 'Save')}</button>
        <button onClick={onCancel} className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-600">{t('취소', 'Cancel')}</button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-red-500 underline">{t('삭제', 'Delete')}</button>}
      </div>
    </div>
  )
}
