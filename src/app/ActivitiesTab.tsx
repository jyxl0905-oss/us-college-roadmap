import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AppShell from './AppShell'
import { t } from '../i18n'
import {
  ACTIVITY_MAX, HONOR_MAX, LIMITS, activityCategoryKo, timingKo, honorLevelKo,
  insertRow, updateRow, deleteRow, loadAppRecords,
  type Activity, type Honor, type ActivityCategory, type ActivityTiming, type HonorLevel,
} from './appData'

interface ActivitiesTabProps {
  userId: string
}

const GRADES = [9, 10, 11, 12]

// 글자 수 카운터 — 초과 시 빨간색
function Counter({ len, max }: { len: number; max: number }) {
  return (
    <span className={`text-[11px] ${len > max ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
      {len}/{max}
    </span>
  )
}

// F5 활동(최대 10) · 수상(최대 5) — 실제 Common App 필드·글자 수 그대로
export default function ActivitiesTab({ userId }: ActivitiesTabProps) {
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [honors, setHonors] = useState<Honor[]>([])
  const [editing, setEditing] = useState<number | 'new' | null>(null) // 활동 편집 대상
  const [editingHonor, setEditingHonor] = useState<number | 'new' | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false) // 원서 미리보기 (실제 Common App 형식)
  const [busy, setBusy] = useState(false) // 저장·삭제 중복 요청 방지 (더블탭)
  const busyRef = useRef(false) // 같은 틱의 연속 탭까지 막기 위한 동기 가드

  useEffect(() => {
    loadAppRecords(userId).then((r) => {
      setActivities(r.activities)
      setHonors(r.honors)
    })
  }, [userId])

  if (!activities) return <AppShell tab="activities" title={t('활동 · 수상', 'Activities · Honors')}><p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p></AppShell>

  // 중복 요청 방지 래퍼 — 진행 중이면 무시, 실패(alert 후 throw)해도 busy 해제
  const guarded = async (fn: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try { await fn() } catch { /* insertRow/updateRow/deleteRow가 이미 alert */ } finally { busyRef.current = false; setBusy(false) }
  }

  // ─── 활동 CRUD ───
  const saveActivity = (draft: Omit<Activity, 'id' | 'sort_order'>, id: number | 'new') => guarded(async () => {
    if (id === 'new') {
      const row = await insertRow<Activity>('activities', userId, { ...draft, sort_order: activities.length })
      if (row) setActivities([...activities, row])
    } else {
      await updateRow<Activity>('activities', id, draft)
      setActivities(activities.map((a) => (a.id === id ? { ...a, ...draft } : a)))
    }
    setEditing(null)
  })
  const removeActivity = (id: number) => guarded(async () => {
    if (!confirm(t('이 활동을 삭제할까요? 되돌릴 수 없어요.', 'Delete this activity? This cannot be undone.'))) return
    await deleteRow('activities', id)
    setActivities(activities.filter((a) => a.id !== id))
    setHonors(honors.map((h) => (h.activity_id === id ? { ...h, activity_id: null } : h))) // DB는 on delete set null
    setEditing(null)
  })
  const move = (index: number, dir: -1 | 1) => guarded(async () => {
    const j = index + dir
    if (j < 0 || j >= activities.length) return
    const next = [...activities]
    ;[next[index], next[j]] = [next[j], next[index]]
    const renumbered = next.map((a, i) => ({ ...a, sort_order: i }))
    const before = activities
    setActivities(renumbered)
    try {
      await Promise.all(renumbered.map((a) => updateRow<Activity>('activities', a.id, { sort_order: a.sort_order })))
    } catch (e) {
      setActivities(before) // 실패 시 되돌림
      throw e
    }
  })
  const copyForApp = async (a: Activity) => {
    const text = `${a.position}\n${a.organization}\n${a.description}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(a.id)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* 클립보드 미지원 환경 */ }
  }

  // ─── 수상 CRUD ───
  const saveHonor = (draft: Omit<Honor, 'id' | 'sort_order'>, id: number | 'new') => guarded(async () => {
    if (id === 'new') {
      const row = await insertRow<Honor>('honors', userId, { ...draft, sort_order: honors.length })
      if (row) setHonors([...honors, row])
    } else {
      await updateRow<Honor>('honors', id, draft)
      setHonors(honors.map((h) => (h.id === id ? { ...h, ...draft } : h)))
    }
    setEditingHonor(null)
  })
  const removeHonor = (id: number) => guarded(async () => {
    if (!confirm(t('이 수상 기록을 삭제할까요? 되돌릴 수 없어요.', 'Delete this honor? This cannot be undone.'))) return
    await deleteRow('honors', id)
    setHonors(honors.filter((h) => h.id !== id))
    setEditingHonor(null)
  })

  return (
    <AppShell tab="activities" title={t('활동 · 수상', 'Activities · Honors')}>
      {/* 활동 */}
      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">{t('활동 (Activities)', 'Activities')}</h2>
        <span className="flex items-baseline gap-3">
          {(activities.length > 0 || honors.length > 0) && (
            <button onClick={() => setPreviewOpen(true)} className="rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 active:bg-blue-100">
              📄 {t('원서 미리보기', 'Application preview')}
            </button>
          )}
          <span className="text-sm text-gray-400">{activities.length}/{ACTIVITY_MAX}</span>
        </span>
      </div>
      {previewOpen && <AppPreview activities={activities} honors={honors} onClose={() => setPreviewOpen(false)} />}
      <p className="mt-0.5 text-xs text-gray-400">{t('실제 원서도 이 순서로 읽혀요 — 중요한 활동을 위로 (▲▼)', 'The real application is read in this order — move important activities up (▲▼)')}</p>

      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        {activities.map((a, i) =>
          editing === a.id ? (
            <div key={a.id} className="md:col-span-2">
              <ActivityForm initial={a} busy={busy} onSave={(d) => saveActivity(d, a.id)} onCancel={() => setEditing(null)} onDelete={() => removeActivity(a.id)} />
            </div>
          ) : (
            <div key={a.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{i + 1}. {activityCategoryKo[a.category]} · {a.grades.length ? t(a.grades.join('·') + '학년', 'Grade ' + a.grades.join('·')) : t('학년 미입력', 'No grade set')}</p>
                  <p className="mt-0.5 break-words font-semibold text-gray-900">{a.position || <span className="text-gray-300">{t('직책 미입력', 'No position set')}</span>}</p>
                  <p className="break-words text-sm text-gray-600">{a.organization}</p>
                  <p className="mt-1 break-words text-sm leading-relaxed text-gray-500">{a.description}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={busy || i === 0} className="rounded-md px-2 py-0.5 text-gray-400 disabled:opacity-20 active:bg-gray-100">▲</button>
                  <button onClick={() => move(i, 1)} disabled={busy || i === activities.length - 1} className="rounded-md px-2 py-0.5 text-gray-400 disabled:opacity-20 active:bg-gray-100">▼</button>
                </div>
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <button onClick={() => setEditing(a.id)} className="text-blue-600 underline">{t('편집', 'Edit')}</button>
                <button onClick={() => copyForApp(a)} className="text-gray-500 underline">
                  {copied === a.id ? t('복사됨 ✓', 'Copied ✓') : t('원서용 복사', 'Copy for application')}
                </button>
              </div>
            </div>
          ),
        )}
        {editing === 'new' ? (
          <div className="md:col-span-2">
            <ActivityForm busy={busy} onSave={(d) => saveActivity(d, 'new')} onCancel={() => setEditing(null)} />
          </div>
        ) : (
          activities.length < ACTIVITY_MAX && (
            <button
              onClick={() => setEditing('new')}
              className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-500 active:bg-gray-50 md:col-span-2"
            >
              {t('＋ 활동 추가', '＋ Add activity')}
            </button>
          )
        )}
      </div>

      {/* 수상 */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">{t('수상 (Honors)', 'Honors')}</h2>
        <span className="text-sm text-gray-400">{honors.length}/{HONOR_MAX}</span>
      </div>
      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        {honors.map((h) =>
          editingHonor === h.id ? (
            <div key={h.id} className="md:col-span-2">
              <HonorForm initial={h} activities={activities} busy={busy} onSave={(d) => saveHonor(d, h.id)} onCancel={() => setEditingHonor(null)} onDelete={() => removeHonor(h.id)} />
            </div>
          ) : (
            <button key={h.id} onClick={() => setEditingHonor(h.id)} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-left active:bg-gray-50">
              <p className="break-words font-semibold text-gray-900">{h.title || <span className="text-gray-300">{t('제목 미입력', 'No title set')}</span>}</p>
              <p className="text-xs text-gray-500">
                {h.level ? honorLevelKo[h.level] : t('범위 미입력', 'No level set')} · {h.grade ? t(`${h.grade}학년`, `Grade ${h.grade}`) : t('학년 미입력', 'No grade set')}
              </p>
            </button>
          ),
        )}
        {editingHonor === 'new' ? (
          <div className="md:col-span-2">
            <HonorForm activities={activities} busy={busy} onSave={(d) => saveHonor(d, 'new')} onCancel={() => setEditingHonor(null)} />
          </div>
        ) : (
          honors.length < HONOR_MAX && (
            <button
              onClick={() => setEditingHonor('new')}
              className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-500 active:bg-gray-50 md:col-span-2"
            >
              {t('＋ 수상 추가', '＋ Add honor')}
            </button>
          )
        )}
      </div>
    </AppShell>
  )
}

// ─── 활동 폼 ───
function ActivityForm({
  initial, busy, onSave, onCancel, onDelete,
}: {
  initial?: Activity
  busy?: boolean
  onSave: (d: Omit<Activity, 'id' | 'sort_order'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [d, setD] = useState<Omit<Activity, 'id' | 'sort_order'>>({
    category: initial?.category ?? 'other',
    position: initial?.position ?? '',
    organization: initial?.organization ?? '',
    description: initial?.description ?? '',
    grades: initial?.grades ?? [],
    timing: initial?.timing ?? null,
    hours_per_week: initial?.hours_per_week ?? null,
    weeks_per_year: initial?.weeks_per_year ?? null,
    continue_in_college: initial?.continue_in_college ?? null,
  })
  const over = d.position.length > LIMITS.position || d.organization.length > LIMITS.organization || d.description.length > LIMITS.description
  // 숫자 필드 범위 (주당 시간 0~168, 연간 주 수 0~52 — 실제 Common App 입력 범위)
  const badNum =
    (d.hours_per_week !== null && (!Number.isFinite(d.hours_per_week) || d.hours_per_week < 0 || d.hours_per_week > 168)) ||
    (d.weeks_per_year !== null && (!Number.isInteger(d.weeks_per_year) || d.weeks_per_year < 0 || d.weeks_per_year > 52))
  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'flex items-center justify-between text-xs font-medium text-gray-500'

  return (
    <div className="rounded-xl border-2 border-blue-600 bg-white px-4 py-4">
      <label className={label}>{t('유형', 'Type')}</label>
      <select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as ActivityCategory })} className={field}>
        {(Object.keys(activityCategoryKo) as ActivityCategory[]).map((c) => <option key={c} value={c}>{activityCategoryKo[c]}</option>)}
      </select>

      <label className={`${label} mt-3`}>{t('직책·리더십', 'Position / Leadership')} <Counter len={d.position.length} max={LIMITS.position} /></label>
      <input value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })} placeholder={t('예: 부회장 / Founder / 1st Violin', 'e.g. Vice President / Founder / 1st Violin')} className={field} />

      <label className={`${label} mt-3`}>{t('단체·프로그램명', 'Organization / Program')} <Counter len={d.organization.length} max={LIMITS.organization} /></label>
      <input value={d.organization} onChange={(e) => setD({ ...d, organization: e.target.value })} placeholder={t('예: 학교 로봇공학 동아리', 'e.g. School Robotics Club')} className={field} />

      <label className={`${label} mt-3`}>{t('설명', 'Description')} <Counter len={d.description.length} max={LIMITS.description} /></label>
      <textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={3} placeholder={t('무엇을·어떻게·결과 — 숫자가 있으면 숫자로', 'What, how, and the result — use numbers when you have them')} className={field} />
      <DescriptionCoach text={d.description} />

      <label className={`${label} mt-3`}>{t('참여 학년', 'Grades participated')}</label>
      <div className="mt-1 flex gap-2">
        {GRADES.map((g) => {
          const on = d.grades.includes(g)
          return (
            <button key={g} type="button" onClick={() => setD({ ...d, grades: on ? d.grades.filter((x) => x !== g) : [...d.grades, g].sort((x, y) => x - y) })}
              className={`flex-1 rounded-lg border-2 py-1.5 text-sm ${on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
              {g}
            </button>
          )
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <label className={label}>{t('시기', 'Timing')}</label>
          <select value={d.timing ?? ''} onChange={(e) => setD({ ...d, timing: (e.target.value || null) as ActivityTiming | null })} className={field}>
            <option value="">—</option>
            {(Object.keys(timingKo) as ActivityTiming[]).map((tm) => <option key={tm} value={tm}>{timingKo[tm]}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>{t('주당 시간', 'Hours / week')}</label>
          <input type="number" inputMode="decimal" min={0} max={168} step="0.5" value={d.hours_per_week ?? ''} onChange={(e) => setD({ ...d, hours_per_week: e.target.value === '' ? null : Number(e.target.value) })} className={field} />
        </div>
        <div>
          <label className={label}>{t('연간 주 수', 'Weeks / year')}</label>
          <input type="number" inputMode="numeric" min={0} max={52} value={d.weeks_per_year ?? ''} onChange={(e) => setD({ ...d, weeks_per_year: e.target.value === '' ? null : Number(e.target.value) })} className={field} />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={d.continue_in_college === true} onChange={(e) => setD({ ...d, continue_in_college: e.target.checked })} className="h-4 w-4 accent-blue-600" />
        {t('대학에서도 계속할 생각이에요', 'I plan to continue this in college')}
      </label>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => onSave(d)} disabled={over || badNum || busy} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300">{busy ? t('저장 중…', 'Saving…') : t('저장', 'Save')}</button>
        <button onClick={onCancel} className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-600">{t('취소', 'Cancel')}</button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-red-500 underline">{t('삭제', 'Delete')}</button>}
      </div>
      {over && <p className="mt-2 text-xs text-red-600">{t('글자 수를 넘었어요 — 실제 원서에 그대로 못 들어가요.', 'Over the character limit — this won’t fit in the real application as is.')}</p>}
      {badNum && <p className="mt-2 text-xs text-red-600">{t('주당 시간은 0~168, 연간 주 수는 0~52 사이의 정수로 적어 주세요.', 'Hours per week must be 0–168 and weeks per year a whole number 0–52.')}</p>}
    </div>
  )
}

// ─── 수상 폼 ───
function HonorForm({
  initial, activities, busy, onSave, onCancel, onDelete,
}: {
  initial?: Honor
  activities: Activity[]
  busy?: boolean
  onSave: (d: Omit<Honor, 'id' | 'sort_order'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [d, setD] = useState<Omit<Honor, 'id' | 'sort_order'>>({
    title: initial?.title ?? '',
    grade: initial?.grade ?? null,
    level: initial?.level ?? null,
    activity_id: initial?.activity_id ?? null,
  })
  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'flex items-center justify-between text-xs font-medium text-gray-500'
  return (
    <div className="rounded-xl border-2 border-blue-600 bg-white px-4 py-4">
      <label className={label}>{t('수상·인정 제목', 'Honor / Award title')} <Counter len={d.title.length} max={LIMITS.honorTitle} /></label>
      <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder={t('예: AMC 10 Distinguished Honor Roll', 'e.g. AMC 10 Distinguished Honor Roll')} className={field} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className={label}>{t('학년', 'Grade')}</label>
          <select value={d.grade ?? ''} onChange={(e) => setD({ ...d, grade: e.target.value ? Number(e.target.value) : null })} className={field}>
            <option value="">—</option>
            {GRADES.map((g) => <option key={g} value={g}>{t(`${g}학년`, `Grade ${g}`)}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>{t('인정 범위', 'Level of recognition')}</label>
          <select value={d.level ?? ''} onChange={(e) => setD({ ...d, level: (e.target.value || null) as HonorLevel | null })} className={field}>
            <option value="">—</option>
            {(Object.keys(honorLevelKo) as HonorLevel[]).map((l) => <option key={l} value={l}>{honorLevelKo[l]}</option>)}
          </select>
        </div>
      </div>
      {activities.length > 0 && (
        <>
          <label className={`${label} mt-3`}>{t('연결된 활동 (선택)', 'Linked activity (optional)')}</label>
          <select value={d.activity_id ?? ''} onChange={(e) => setD({ ...d, activity_id: e.target.value ? Number(e.target.value) : null })} className={field}>
            <option value="">—</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.position || a.organization || t(`활동 ${a.id}`, `Activity ${a.id}`)}</option>)}
          </select>
        </>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => onSave(d)} disabled={d.title.length > LIMITS.honorTitle || busy} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300">{busy ? t('저장 중…', 'Saving…') : t('저장', 'Save')}</button>
        <button onClick={onCancel} className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-600">{t('취소', 'Cancel')}</button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-red-500 underline">{t('삭제', 'Delete')}</button>}
      </div>
    </div>
  )
}

// ─── 설명 코칭 — 규칙 기반 체크 3개 (저장을 막지 않는 팁, AI 아님) ───
function DescriptionCoach({ text }: { text: string }) {
  const v = text.trim()
  if (v.length === 0) return null
  const hasNumber = /\d/.test(v)
  const hasKorean = /[가-힣]/.test(v)
  const roomLeft = LIMITS.description - v.length
  const check = (ok: boolean, okMsg: string, noMsg: string) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {ok ? '✓' : '○'} {ok ? okMsg : noMsg}
    </span>
  )
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {check(hasNumber, t('숫자 있음', 'Has numbers'), t('숫자로 쓰면 강해져요 (인원·시간·등수)', 'Numbers make it stronger (people, hours, rank)'))}
      {check(roomLeft <= 60, t('공간 활용 좋아요', 'Good use of space'), t(`${roomLeft}자 남음 — 결과·성과를 더 담아보세요`, `${roomLeft} chars left — add outcomes`))}
      {hasKorean && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
          💡 {t('실제 원서는 영어예요 — 지금 영어로 써두면 12학년에 옮겨 적기만 하면 돼요', 'The real application is in English — write it in English now and senior-year you just copies it')}
        </span>
      )}
    </div>
  )
}

// ─── 원서 미리보기 — 실제 Common App 제출 화면 형식의 읽기 전용 뷰 + 필드별 복사 ───
function AppPreview({ activities, honors, onClose }: { activities: Activity[]; honors: Honor[]; onClose: () => void }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1200)
    } catch { /* 클립보드 미지원 */ }
  }
  const CopyBtn = ({ k, text }: { k: string; text: string }) =>
    text.trim() ? (
      <button onClick={() => void copy(k, text)} className="shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 active:bg-gray-100">
        {copiedKey === k ? t('복사됨 ✓', 'Copied ✓') : t('복사', 'Copy')}
      </button>
    ) : null
  const row = (k: string, label: string, value: string, max: number) => (
    <div className="mt-1.5 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-400">{label} <span className="normal-case">({value.length}/{max})</span></p>
        <p className="break-words text-sm text-gray-800">{value.trim() || <span className="text-gray-300">—</span>}</p>
      </div>
      <CopyBtn k={k} text={value} />
    </div>
  )
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-5 md:max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">📄 {t('원서 미리보기', 'Application preview')}</h1>
            <p className="text-xs text-gray-400">{t('실제 Common App에 보이는 순서·형식 그대로예요 — 12학년 때 이 화면을 켜고 옮겨 적으세요.', 'Shown in the real Common App order and format — open this senior year and copy it over.')}</p>
          </div>
        </div>

        <h2 className="mt-5 text-sm font-bold uppercase tracking-wide text-gray-500">Activities ({activities.length}/{ACTIVITY_MAX})</h2>
        {activities.length === 0 && <p className="mt-2 text-sm text-gray-400">{t('기록된 활동이 없어요.', 'No activities recorded.')}</p>}
        <div className="mt-2 flex flex-col gap-2.5">
          {activities.map((a, i) => (
            <div key={a.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold text-gray-400">
                {i + 1}. {activityCategoryKo[a.category]}
                {a.grades.length > 0 && ` · ${t('학년', 'Grades')} ${a.grades.join(', ')}`}
                {a.timing && ` · ${timingKo[a.timing]}`}
              </p>
              {row(`p${a.id}`, t('직책 (Position)', 'Position'), a.position, LIMITS.position)}
              {row(`o${a.id}`, t('단체 (Organization)', 'Organization'), a.organization, LIMITS.organization)}
              {row(`d${a.id}`, t('설명 (Description)', 'Description'), a.description, LIMITS.description)}
              <p className="mt-2 text-[11px] text-gray-400">
                {a.hours_per_week !== null ? `${a.hours_per_week} hr/wk` : t('시간 미입력', 'hours not set')}
                {' · '}
                {a.weeks_per_year !== null ? `${a.weeks_per_year} wk/yr` : t('주 수 미입력', 'weeks not set')}
                {' · '}
                {t('대학에서 계속', 'Continue in college')}: {a.continue_in_college === true ? 'Yes' : a.continue_in_college === false ? 'No' : '—'}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-500">Honors ({honors.length}/{HONOR_MAX})</h2>
        {honors.length === 0 && <p className="mt-2 text-sm text-gray-400">{t('기록된 수상이 없어요.', 'No honors recorded.')}</p>}
        <div className="mt-2 flex flex-col gap-2.5 pb-10">
          {honors.map((h, i) => (
            <div key={h.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold text-gray-400">
                {i + 1}.{h.level ? ` ${honorLevelKo[h.level]}` : ''}{h.grade ? ` · ${t(`${h.grade}학년`, `Grade ${h.grade}`)}` : ''}
              </p>
              {row(`h${h.id}`, t('제목 (Title)', 'Title'), h.title, LIMITS.honorTitle)}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
