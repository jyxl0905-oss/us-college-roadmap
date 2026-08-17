import { useEffect, useMemo, useState } from 'react'
import type { School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { logEvent } from '../lib/analytics'
import type { ProfileRow } from '../lib/profile'
import { timingSortKey } from '../deadlines/DeadlinesPage'
import SchoolLogo from '../browse/SchoolLogo'
import {
  boardVisible, boardWarnings, offeredRounds, roundTiming, roundLabels, statusLabels,
  autoItems, c7Actions, c7Checkable, isFirstChoice, SUPP_ESSAY_TIP,
  type ApplicationRow, type CustomTask, type Round, type AppStatus,
} from './boardLogic'

interface BoardPageProps {
  userId: string
  profile: ProfileRow
}

// F4 지원 보드 — 라운드 배정·상태 추적·학교 맞춤 준비. 추천 없음: 사실 고지·규칙 검증·정리·추적까지만
export default function BoardPage({ userId, profile }: BoardPageProps) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [tasks, setTasks] = useState<CustomTask[]>([])
  const [openId, setOpenId] = useState<number | null>(null) // 상세 열린 학교
  const [newTask, setNewTask] = useState('')

  const hasTarget =
    (profile.target_mode === 'schools' && profile.target_school_ids.length > 0) ||
    (profile.target_mode === 'tier' && profile.target_tier !== null)

  useEffect(() => {
    logEvent(userId, 'board_view')
  }, [userId])

  useEffect(() => {
    if (!supabase || !hasTarget) {
      setSchools([])
      return
    }
    const schoolsQuery =
      profile.target_mode === 'schools'
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : supabase.from('schools').select('*').eq('tier', profile.target_tier)
    Promise.all([
      schoolsQuery,
      supabase.from('applications').select('school_id, round, status, updated_at').eq('user_id', userId),
      supabase.from('custom_tasks').select('id, school_id, title, done').eq('user_id', userId),
    ]).then(([sc, ap, ct]) => {
      setSchools((sc.data ?? []) as School[])
      setApps((ap.data ?? []) as ApplicationRow[])
      setTasks((ct.data ?? []) as CustomTask[])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile.target_mode, profile.target_tier, profile.target_school_ids.join(',')])

  const appFor = (schoolId: number) => apps.find((a) => a.school_id === schoolId)
  const tasksFor = (schoolId: number) => tasks.filter((t) => t.school_id === schoolId)

  // 자동/체크 항목 완료 판정: custom_tasks에 같은 제목의 done 행이 있으면 완료
  const isItemDone = (schoolId: number, title: string) =>
    tasksFor(schoolId).some((t) => t.title === title && t.done)

  const upsertApp = async (schoolId: number, patch: Partial<ApplicationRow>) => {
    const prev = appFor(schoolId)
    const row: ApplicationRow = {
      school_id: schoolId,
      round: patch.round !== undefined ? patch.round : (prev?.round ?? null),
      status: patch.status ?? prev?.status ?? 'preparing',
      updated_at: new Date().toISOString(),
    }
    setApps((list) => [...list.filter((a) => a.school_id !== schoolId), row])
    if (supabase) {
      await supabase.from('applications').upsert({ user_id: userId, ...row })
      if (patch.round) logEvent(userId, 'round_assigned')
    }
  }

  const toggleDerivedItem = async (schoolId: number, title: string) => {
    const existing = tasksFor(schoolId).find((t) => t.title === title)
    if (existing) {
      setTasks((l) => l.map((t) => (t.id === existing.id ? { ...t, done: !t.done } : t)))
      if (supabase) await supabase.from('custom_tasks').update({ done: !existing.done }).eq('id', existing.id)
    } else {
      if (!supabase) return
      const { data } = await supabase
        .from('custom_tasks')
        .insert({ user_id: userId, school_id: schoolId, title, done: true })
        .select('id, school_id, title, done')
        .single()
      if (data) setTasks((l) => [...l, data as CustomTask])
    }
  }

  const addCustomTask = async (schoolId: number) => {
    const title = newTask.trim()
    if (!title || !supabase) return
    setNewTask('')
    const { data } = await supabase
      .from('custom_tasks')
      .insert({ user_id: userId, school_id: schoolId, title, done: false })
      .select('id, school_id, title, done')
      .single()
    if (data) setTasks((l) => [...l, data as CustomTask])
  }

  const deleteTask = async (id: number) => {
    setTasks((l) => l.filter((t) => t.id !== id))
    if (supabase) await supabase.from('custom_tasks').delete().eq('id', id)
  }

  // 카드 목록: ED/ED2 최상단 고정, 나머지 마감 시기순
  const ordered = useMemo(() => {
    if (!schools) return []
    return [...schools].sort((a, b) => {
      const fa = isFirstChoice(appFor(a.id)) ? 0 : 1
      const fb = isFirstChoice(appFor(b.id)) ? 0 : 1
      if (fa !== fb) return fa - fb
      return (
        timingSortKey(roundTiming(a, appFor(a.id)?.round ?? null) ?? a.rd_timing ?? null) -
        timingSortKey(roundTiming(b, appFor(b.id)?.round ?? null) ?? b.rd_timing ?? null)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, apps])

  if (!boardVisible(profile))
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-4xl">🗂️</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900">지원 보드</h1>
        <p className="mt-3 text-sm text-gray-500">
          지원 보드는 11학년 여름부터 열려요. 지금은 시즌 체크리스트에 집중하면 돼요.
        </p>
        <button onClick={() => navigate('/')} className="mt-6 text-blue-600 underline">
          리포트로 돌아가기
        </button>
      </div>
    )

  if (!hasTarget)
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-4xl">🗂️</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900">지원 보드</h1>
        <p className="mt-3 text-sm text-gray-500">목표 학교를 설정하면 보드가 생성돼요.</p>
        <button
          onClick={() => navigate('/schools')}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          대학 둘러보기에서 목표 정하기
        </button>
      </div>
    )

  if (schools === null) return <p className="mt-20 text-center text-gray-400">불러오는 중…</p>

  // 상단 요약: "ED 1 · EA 3 · RD 4 | 제출 2/8"
  const roundCounts = (['ed', 'ed2', 'ea', 'rea', 'rd'] as Round[])
    .map((r) => ({ r, n: apps.filter((a) => schools.some((s) => s.id === a.school_id) && a.round === r).length }))
    .filter((x) => x.n > 0)
  const submittedCount = apps.filter(
    (a) => schools.some((s) => s.id === a.school_id) && a.status !== 'preparing',
  ).length
  const warnings = boardWarnings(apps.filter((a) => schools.some((s) => s.id === a.school_id)), profile)

  const completion = (s: School) => {
    const app = appFor(s.id)
    const auto = autoItems(s, profile, app)
    const c7 = c7Checkable(app) ? c7Actions(s) : []
    const customs = tasksFor(s.id).filter((t) => !auto.includes(t.title) && !c7.includes(t.title))
    const total = auto.length + c7.length + customs.length
    const done =
      auto.filter((t) => isItemDone(s.id, t)).length +
      c7.filter((t) => isItemDone(s.id, t)).length +
      customs.filter((t) => t.done).length
    return { done, total }
  }

  const open = openId !== null ? schools.find((s) => s.id === openId) : null

  // ─── 카드 상세 ───
  if (open) {
    const app = appFor(open.id)
    const rounds = offeredRounds(open)
    const auto = autoItems(open, profile, app)
    const c7 = c7Actions(open)
    const checkable = c7Checkable(app)
    const customs = tasksFor(open.id).filter((t) => !auto.includes(t.title) && !c7.includes(t.title))
    const first = isFirstChoice(app)

    const fitBlock = (
      <div className={`rounded-xl border-2 px-4 py-4 ${first ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
        <p className="font-semibold text-gray-900">
          이 학교에 맞춘 준비 {first && <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">1지망 준비</span>}
        </p>
        {open.what_they_value && open.what_they_value !== 'PLACEHOLDER' && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed text-gray-600">{open.what_they_value}</p>
            {open.source_url && (
              <a href={open.source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                공식 출처 보기 ↗
              </a>
            )}
          </div>
        )}
        {c7.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {c7.map((text) => (
              <label key={text} className="flex items-start gap-2 text-sm text-gray-700">
                {checkable ? (
                  <input
                    type="checkbox"
                    checked={isItemDone(open.id, text)}
                    onChange={() => toggleDerivedItem(open.id, text)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                ) : (
                  <span className="mt-0.5 shrink-0 text-gray-300">•</span>
                )}
                <span>{text}</span>
              </label>
            ))}
            {open.c7_source_url && (
              <a href={open.c7_source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                CDS C7 공시 원문 ↗
              </a>
            )}
          </div>
        )}
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
          {SUPP_ESSAY_TIP}
        </p>
      </div>
    )

    return (
      <div className="min-h-dvh bg-gray-50">
        <div className="mx-auto max-w-md px-5 py-6 pb-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpenId(null)} aria-label="보드로" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
              ←
            </button>
            <SchoolLogo schoolId={open.id} name={open.name} size={36} />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900">{open.name}</h1>
              <p className="truncate text-xs text-gray-500">{open.name_ko}</p>
            </div>
          </div>

          {/* ED/ED2 배정 시 맞춤 준비 최상단 */}
          {first && <div className="mt-4">{fitBlock}</div>}

          {/* 라운드 배정 */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">지원 라운드</p>
            <p className="mt-0.5 text-xs text-gray-400">이 학교가 제공하는 라운드만 보여요. 선택은 언제든 바꿀 수 있어요.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {rounds.map(({ round, timing }) => (
                <button
                  key={round}
                  onClick={() => upsertApp(open.id, { round: app?.round === round ? null : round })}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                    app?.round === round
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {roundLabels[round]}
                  {timing && <span className="ml-1 text-xs font-normal">{timing}</span>}
                </button>
              ))}
            </div>
            {open.deadlines_source_url && (
              <a href={open.deadlines_source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-600 underline">
                공식 마감 페이지 확인 ↗
              </a>
            )}
          </div>

          {/* 상태 */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">진행 상태</p>
            <select
              value={app?.status ?? 'preparing'}
              onChange={(e) => upsertApp(open.id, { status: e.target.value as AppStatus })}
              className="mt-2 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              {(Object.keys(statusLabels) as AppStatus[]).map((st) => (
                <option key={st} value={st}>{statusLabels[st]}</option>
              ))}
            </select>
            {app && (
              <p className="mt-1.5 text-xs text-gray-400">
                마지막 변경: {new Date(app.updated_at).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>

          {/* 맞춤 준비 (ED/ED2 아니면 여기) */}
          {!first && <div className="mt-4">{fitBlock}</div>}

          {/* 체크리스트: 자동 + 커스텀 통합 */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">준비 체크리스트</p>
            <div className="mt-3 flex flex-col gap-2">
              {auto.map((title) => (
                <label key={title} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isItemDone(open.id, title)}
                    onChange={() => toggleDerivedItem(open.id, title)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span>{title}</span>
                </label>
              ))}
              {customs.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleDerivedItem(open.id, t.title)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span className="flex-1">{t.title}</span>
                  <button onClick={() => deleteTask(t.id)} aria-label="삭제" className="text-gray-300 active:text-red-500">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTask(open.id)}
                placeholder="항목 추가 (예: 보충 에세이 1번 초안)"
                className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <button
                onClick={() => addCustomTask(open.id)}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white active:bg-blue-700"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── 보드 메인 ───
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label="리포트로" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">지원 보드</h1>
        </div>

        {/* 상단 요약 */}
        <p className="mt-3 text-sm text-gray-600">
          {roundCounts.length > 0
            ? roundCounts.map((x) => `${roundLabels[x.r]} ${x.n}`).join(' · ')
            : '라운드 미배정'}
          {' | '}제출 {submittedCount}/{schools.length}
        </p>

        {/* 경고 3종 (표시, 차단 아님) */}
        {warnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {warnings.map((w) => (
              <p key={w.key} className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                ⚠️ {w.text}
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {ordered.map((s) => {
            const app = appFor(s.id)
            const first = isFirstChoice(app)
            const timing = roundTiming(s, app?.round ?? null)
            const { done, total } = completion(s)
            return (
              <button
                key={s.id}
                onClick={() => setOpenId(s.id)}
                className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 text-left active:bg-gray-50 ${
                  first ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <SchoolLogo schoolId={s.id} name={s.name} size={28} />
                    <p className="min-w-0 truncate font-semibold text-gray-900">{s.name}</p>
                  </span>
                  {first && (
                    <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                      1지망 준비
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      app?.round ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {app?.round ? roundLabels[app.round] : '라운드 미배정'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                    {statusLabels[app?.status ?? 'preparing']}
                  </span>
                  {timing && <span className="text-gray-500">마감 {timing}</span>}
                </div>
                {total > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.round((done / total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{done}/{total}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
