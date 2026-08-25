import { useEffect, useState } from 'react'
import type { School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { navigate, slugify } from '../lib/router'
import { logEvent } from '../lib/analytics'
import type { ProfileRow } from '../lib/profile'
import { timingSortKey } from '../deadlines/DeadlinesPage'
import SchoolLogo from '../browse/SchoolLogo'
import AppShell from '../app/AppShell'
import { t, localizeRows } from '../i18n'
import { loadAppRecords, bestSat, type AppRecords } from '../app/appData'
import { profileGrade } from '../lib/profile'
import { currentSeason } from '../lib/academics'
import {
  boardWarnings, offeredRounds, roundTiming, roundLabels, statusLabels, roundSlots, dDay, timingLabel, fitOrder, fitLabels, fitHint, normalizeFit,
  autoItems, c7Actions, c7Checkable, isFirstChoice, suppEssayTip,
  type ApplicationRow, type CustomTask, type Round, type AppStatus,
} from './boardLogic'

interface BoardPageProps {
  userId: string
  profile: ProfileRow
}

// F4→F5 지원 학교(My Colleges) — 라운드 칸 배치·상태 추적·학교 맞춤 준비 + 내 원서 연동.
// 추천 없음: 사실 고지·규칙 검증·정리·추적까지만
// 사용자 지정 4단계 색: Reach #E74C3C(긴장·도전) / Hard Target #F39C12(신중) / Target #F1C40F(균형) / Safety #27AE60(안심)
const fitActive: Record<string, string> = {
  reach: 'border-[#E74C3C] bg-[#E74C3C]/10 text-[#C0392B]',
  hard_target: 'border-[#F39C12] bg-[#F39C12]/10 text-[#B9770E]',
  target: 'border-[#F1C40F] bg-[#F1C40F]/15 text-[#9A7D0A]',
  safety: 'border-[#27AE60] bg-[#27AE60]/10 text-[#1E8449]',
}
const fitBadge: Record<string, string> = {
  reach: 'bg-[#E74C3C]/15 text-[#C0392B]',
  hard_target: 'bg-[#F39C12]/15 text-[#B9770E]',
  target: 'bg-[#F1C40F]/20 text-[#9A7D0A]',
  safety: 'bg-[#27AE60]/15 text-[#1E8449]',
}

export default function BoardPage({ userId, profile }: BoardPageProps) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [tasks, setTasks] = useState<CustomTask[]>([])
  const [records, setRecords] = useState<AppRecords | null>(null)
  const [openId, setOpenId] = useState<number | null>(null) // 상세 열린 학교
  const [newTask, setNewTask] = useState('')
  const [slotPicker, setSlotPicker] = useState<number | null>(null) // 라운드 선택 시트 열린 학교
  const [taskBusy, setTaskBusy] = useState(false) // 커스텀 항목 추가 중복 방지 (Enter 연타·더블탭)

  const saveFailed = (message: string) =>
    alert(t(`저장에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.\n(${message})`, `Save failed. Check your connection and try again.\n(${message})`))

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
      supabase.from('applications').select('school_id, round, status, updated_at, student_deadline, fit').eq('user_id', userId),
      supabase.from('custom_tasks').select('id, school_id, title, done').eq('user_id', userId),
      loadAppRecords(userId),
    ]).then(([sc, ap, ct, rec]) => {
      setSchools(localizeRows((sc.data ?? []) as School[]))
      setApps(((ap.data ?? []) as ApplicationRow[]).map((a) => ({ ...a, fit: normalizeFit(a.fit as string | null) })))
      setTasks((ct.data ?? []) as CustomTask[])
      setRecords(rec)
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
      student_deadline: patch.student_deadline !== undefined ? patch.student_deadline : (prev?.student_deadline ?? null),
      fit: patch.fit !== undefined ? patch.fit : (prev?.fit ?? null),
      updated_at: new Date().toISOString(),
    }
    const before = apps
    setApps((list) => [...list.filter((a) => a.school_id !== schoolId), row])
    if (supabase) {
      const { error } = await supabase.from('applications').upsert({ user_id: userId, ...row })
      if (error) {
        setApps(before) // 실패 시 되돌림
        saveFailed(error.message)
        return
      }
      if (patch.round) logEvent(userId, 'round_assigned')
    }
  }

  // 커스텀 항목 1건 토글 (id 기준 — 같은 제목이 여러 개여도 정확히 그 행만)
  const toggleTask = async (task: CustomTask) => {
    const done = !task.done
    setTasks((l) => l.map((t) => (t.id === task.id ? { ...t, done } : t)))
    if (!supabase) return
    const { error } = await supabase.from('custom_tasks').update({ done }).eq('id', task.id)
    if (error) {
      setTasks((l) => l.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))) // 실패 시 되돌림
      saveFailed(error.message)
    }
  }

  // 자동/C7 항목 토글: custom_tasks에 같은 제목(한국어 원문 key) 행이 있으면 토글, 없으면 done=true로 생성
  const toggleDerivedItem = async (schoolId: number, title: string) => {
    const existing = tasksFor(schoolId).find((t) => t.title === title)
    if (existing) {
      await toggleTask(existing)
    } else {
      if (!supabase || taskBusy) return
      setTaskBusy(true)
      const { data, error } = await supabase
        .from('custom_tasks')
        .insert({ user_id: userId, school_id: schoolId, title, done: true })
        .select('id, school_id, title, done')
        .single()
      setTaskBusy(false)
      if (error) { saveFailed(error.message); return }
      if (data) setTasks((l) => [...l, data as CustomTask])
    }
  }

  const addCustomTask = async (schoolId: number) => {
    const title = newTask.trim()
    if (!title || !supabase || taskBusy) return
    setTaskBusy(true)
    const { data, error } = await supabase
      .from('custom_tasks')
      .insert({ user_id: userId, school_id: schoolId, title, done: false })
      .select('id, school_id, title, done')
      .single()
    setTaskBusy(false)
    if (error) { saveFailed(error.message); return } // 입력값 유지
    setNewTask('')
    if (data) setTasks((l) => [...l, data as CustomTask])
  }

  const deleteTask = async (id: number) => {
    const before = tasks
    setTasks((l) => l.filter((t) => t.id !== id))
    if (!supabase) return
    const { error } = await supabase.from('custom_tasks').delete().eq('id', id)
    if (error) {
      setTasks(before) // 실패 시 되돌림
      alert(t(`삭제에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.\n(${error.message})`, `Delete failed. Check your connection and try again.\n(${error.message})`))
    }
  }

  // 칸 안 정렬: 마감 시기순
  const byTiming = (list: School[]) =>
    [...list].sort(
      (a, b) =>
        timingSortKey(roundTiming(a, appFor(a.id)?.round ?? null) ?? a.rd_timing ?? null) -
        timingSortKey(roundTiming(b, appFor(b.id)?.round ?? null) ?? b.rd_timing ?? null),
    )

  // 11학년 여름 전: "미리 그려보는 단계" 안내
  const grade = profileGrade(profile)
  const isEarly = grade < 11 || (grade === 11 && currentSeason() !== 'summer')

  if (!hasTarget)
    return (
      <AppShell tab="colleges" title={t('지원 학교', 'My colleges')}>
        <div className="py-12 text-center">
          <p className="text-4xl">🎯</p>
          <p className="mt-3 text-sm text-gray-500">{t('목표 학교를 설정하면 라운드 칸이 생성돼요.', 'Set your target schools to create round slots.')}</p>
          <button
            onClick={() => navigate('/schools')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('대학 둘러보기에서 목표 정하기', 'Pick targets in Browse colleges')}
          </button>
        </div>
      </AppShell>
    )

  if (schools === null)
    return <AppShell tab="colleges" title={t('지원 학교', 'My colleges')}><p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p></AppShell>

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
    const customs = tasksFor(s.id).filter((t) => !auto.some((a) => a.key === t.title) && !c7.some((c) => c.key === t.title))
    const total = auto.length + c7.length + customs.length
    const done =
      auto.filter((a) => isItemDone(s.id, a.key)).length +
      c7.filter((c) => isItemDone(s.id, c.key)).length +
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
    const customs = tasksFor(open.id).filter((t) => !auto.some((a) => a.key === t.title) && !c7.some((c) => c.key === t.title))
    const first = isFirstChoice(app)

    const fitBlock = (
      <div className={`rounded-xl border-2 px-4 py-4 ${first ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
        <p className="font-semibold text-gray-900">
          {t('이 학교에 맞춘 준비', 'Prep tailored to this school')} {first && <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{t('1지망 준비', 'First-choice prep')}</span>}
        </p>
        {open.what_they_value && open.what_they_value !== 'PLACEHOLDER' && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed text-gray-600">{open.what_they_value}</p>
            {open.source_url && (
              <a href={open.source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                {t('공식 출처 보기 ↗', 'View official source ↗')}
              </a>
            )}
          </div>
        )}
        {c7.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {c7.map(({ key, text }) => (
              <label key={key} className="flex items-start gap-2 text-sm text-gray-700">
                {checkable ? (
                  <input
                    type="checkbox"
                    checked={isItemDone(open.id, key)}
                    onChange={() => toggleDerivedItem(open.id, key)}
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
                {t('CDS C7 공시 원문 ↗', 'CDS C7 source ↗')}
              </a>
            )}
          </div>
        )}
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
          {suppEssayTip()}
        </p>
      </div>
    )

    // 내 원서 연동 블록 — 사실 배치만 (판단 문구 없음)
    const best = records ? bestSat(records.tests) : null
    const satPos =
      best && best.total !== null && open.sat_mid50_low !== null && open.sat_mid50_high !== null
        ? Math.max(0, Math.min(1, (Number(best.total) - open.sat_mid50_low) / (open.sat_mid50_high - open.sat_mid50_low)))
        : null
    const c7Slugs = open.c7_very_important ?? []
    const activityCount = records?.activities.length ?? 0
    const honorTop = records?.honors.reduce<string | null>((acc, h) => {
      const order = ['school', 'regional', 'national', 'international']
      return h.level && (!acc || order.indexOf(h.level) > order.indexOf(acc)) ? h.level : acc
    }, null)
    const dd = dDay(app?.student_deadline)

    const recordBlock = records && (
      <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <p className="font-semibold text-gray-900">{t('내 원서와 이 학교', 'My application vs. this school')}</p>
        <div className="mt-2 flex flex-col gap-2 text-sm text-gray-700">
          <div>
            <span className="text-gray-500">{t('내 SAT 최고점: ', 'My best SAT: ')}</span>
            {best && best.total !== null ? (
              <>
                <span className="font-semibold">{best.total}</span>
                {open.test_policy === 'test-free' ? (
                  <span className="text-gray-500">{t(' · 이 학교는 시험 미반영', ' · this school does not consider tests')}</span>
                ) : open.sat_mid50_low !== null && open.sat_mid50_high !== null ? (
                  <span className="text-gray-500">{t(' · 합격자 중간 50% ', ' · admitted mid-50% ')}{open.sat_mid50_low}–{open.sat_mid50_high}</span>
                ) : (
                  <span className="text-gray-500">{t(' · 학교 범위 미공개', ' · range not published')}</span>
                )}
                {satPos !== null && (
                  <div className="relative mt-1.5 h-2 rounded-full bg-gray-100">
                    <div className="absolute inset-y-0 left-[25%] right-[25%] rounded-full bg-blue-200" />
                    <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow" style={{ left: `${Math.round(25 + satPos * 50)}%` }} />
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => navigate('/app/testing')} className="text-blue-600 underline">{t('시험 탭에서 점수 기록', 'Record a score in the Testing tab')}</button>
            )}
          </div>
          <div>
            <span className="text-gray-500">{t(`내 활동 ${activityCount}/10 · 수상 최고 범위 `, `My activities ${activityCount}/10 · highest honor level `)}</span>
            <span className="font-semibold">{honorTop ? { school: t('교내', 'School'), regional: t('지역·주', 'Regional / State'), national: t('전국', 'National'), international: t('국제', 'International') }[honorTop] : t('없음', 'None')}</span>
            {c7Slugs.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {t('이 학교 CDS Very Important: ', 'This school’s CDS Very Important: ')}{c7Slugs.map((s) => ({ rigor: t('교과난이도', 'Rigor'), class_rank: t('석차', 'Class rank'), gpa: 'GPA', standardized_tests: t('시험', 'Tests'), essay: t('에세이', 'Essay'), recommendations: t('추천서', 'Recommendations'), interview: t('인터뷰', 'Interview'), extracurricular: t('활동', 'Activities'), talent: t('재능', 'Talent'), character: t('인성', 'Character'), first_generation: t('1세대', 'First-gen'), alumni_relation: t('동문', 'Legacy'), geographical_residence: t('거주지', 'Geography'), state_residency: t('주 거주', 'State residency'), religious_affiliation: t('종교', 'Religion'), volunteer_work: t('봉사', 'Volunteering'), work_experience: t('직업경험', 'Work experience'), demonstrated_interest: t('관심 표현', 'Demonstrated interest') }[s] ?? s)).join(' · ')}
                {(c7Slugs.includes('extracurricular') || c7Slugs.includes('talent')) && activityCount === 0 && (
                  <> — <button onClick={() => navigate('/app/activities')} className="text-blue-600 underline">{t('활동 탭에서 기록', 'Record in the Activities tab')}</button></>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    )

    return (
      <AppShell
        tab="colleges"
        title={open.name}
        onBack={() => setOpenId(null)}
        headerExtra={<SchoolLogo schoolId={open.id} name={open.name} size={36} />}
      >
        <div>
          {/* ED/ED2 배정 시 맞춤 준비 최상단 */}
          {first && <div className="mt-4">{fitBlock}</div>}

          {/* 학생이 직접 정하는 reach/match/safety */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">{t('내 리스트에서 이 학교는?', 'Where does this school sit on my list?')}</p>
            <p className="mt-0.5 text-xs text-gray-400">{fitHint()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {fitOrder.map((f) => (
                <button
                  key={f}
                  onClick={() => upsertApp(open.id, { fit: app?.fit === f ? null : f })}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${app?.fit === f ? fitActive[f] : 'border-gray-200 bg-white text-gray-600'}`}
                >
                  {fitLabels[f]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t('참고: SAT 중간 50% ', 'For reference: SAT middle 50% ')}
              {open.sat_mid50_low && open.sat_mid50_high ? `${open.sat_mid50_low}–${open.sat_mid50_high}` : t('미공개', 'not disclosed')}
              {' · '}{t('국제학생 합격률 ', 'intl. accept rate ')}{open.intl_accept_rate != null ? `${open.intl_accept_rate}%` : t('미공개', 'not disclosed')}
              {' · '}<button onClick={() => navigate(`/schools/${slugify(open.name)}`)} className="text-blue-600 underline">{t('학교 카드 보기', 'See school card')}</button>
            </p>
          </div>

          {/* 라운드 배정 */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">{t('지원 라운드', 'Application round')}</p>
            <p className="mt-0.5 text-xs text-gray-400">{t('이 학교가 제공하는 라운드만 보여요. 선택은 언제든 바꿀 수 있어요.', 'Only rounds this school offers are shown. You can change your choice anytime.')}</p>
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
                  {timing && <span className="ml-1 text-xs font-normal">{timingLabel(timing)}</span>}
                </button>
              ))}
            </div>
            {open.deadlines_source_url && (
              <a href={open.deadlines_source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-600 underline">
                {t('공식 마감 페이지 확인 ↗', 'Check official deadline page ↗')}
              </a>
            )}
            {/* 학생 입력 마감일 — 툴은 날짜를 제공하지 않음 */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <label className="text-xs font-medium text-gray-500">{t('공식 페이지에서 확인한 마감일 (직접 입력) — 이틀 전 이메일 알림', 'Deadline confirmed on the official page (enter yourself) — email reminder 2 days before')}</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="date"
                  value={app?.student_deadline ?? ''}
                  onChange={(e) => upsertApp(open.id, { student_deadline: e.target.value || null })}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                {dd !== null && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${dd < 0 ? 'bg-gray-100 text-gray-500' : dd <= 14 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    {dd < 0 ? `D+${-dd}` : dd === 0 ? 'D-Day' : `D-${dd}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 내 원서 연동 */}
          {recordBlock}

          {/* 상태 */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">{t('진행 상태', 'Status')}</p>
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
                {t('마지막 변경: ', 'Last updated: ')}{new Date(app.updated_at).toLocaleDateString(t('ko-KR', 'en-US'))}
              </p>
            )}
          </div>

          {/* 맞춤 준비 (ED/ED2 아니면 여기) */}
          {!first && <div className="mt-4">{fitBlock}</div>}

          {/* 체크리스트: 자동 + 커스텀 통합 */}
          <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
            <p className="font-semibold text-gray-900">{t('준비 체크리스트', 'Prep checklist')}</p>
            <div className="mt-3 flex flex-col gap-2">
              {auto.map(({ key, text: title }) => (
                <label key={key} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isItemDone(open.id, key)}
                    onChange={() => toggleDerivedItem(open.id, key)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span className="min-w-0 break-words">{title}</span>
                </label>
              ))}
              {customs.map((task) => (
                <div key={task.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span className="min-w-0 flex-1 break-words">{task.title}</span>
                  <button onClick={() => deleteTask(task.id)} aria-label={t('삭제', 'Delete')} className="text-gray-300 active:text-red-500">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addCustomTask(open.id) }}
                placeholder={t('항목 추가 (예: 보충 에세이 1번 초안)', 'Add an item (e.g. Draft supplement #1)')}
                className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <button
                onClick={() => addCustomTask(open.id)}
                disabled={taskBusy || !newTask.trim()}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white active:bg-blue-700 disabled:bg-gray-300"
              >
                {t('추가', 'Add')}
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // ─── 지원 학교 메인: 라운드 칸 ───
  const unassigned = byTiming(schools.filter((s) => !appFor(s.id)?.round))
  const rowsFor = (r: Round) => byTiming(schools.filter((s) => appFor(s.id)?.round === r))

  const card = (s: School) => {
    const app = appFor(s.id)
    const first = isFirstChoice(app)
    const timing = roundTiming(s, app?.round ?? null) ?? s.rd_timing ?? null
    const { done, total } = completion(s)
    const dd = dDay(app?.student_deadline)
    return (
      <div
        key={s.id}
        className={`rounded-xl border-2 bg-white px-3.5 py-3 ${first ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'}`}
      >
        <button onClick={() => setOpenId(s.id)} className="w-full text-left">
          <div className="flex items-center gap-2.5">
            <SchoolLogo schoolId={s.id} name={s.name} size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{s.name}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                {app?.fit && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${fitBadge[app.fit]}`}>{fitLabels[app.fit]}</span>}
                <span>{statusLabels[app?.status ?? 'preparing']}</span>
                {timing && <span>{t('마감 ', 'Due ')}{timingLabel(timing)}</span>}
                {dd !== null && dd >= 0 && <span className={dd <= 14 ? 'font-semibold text-red-600' : 'text-blue-700'}>D-{dd}</span>}
              </p>
            </div>
            {first && <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">{t('1지망', 'First choice')}</span>}
          </div>
          {total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((done / total) * 100)}%` }} />
              </div>
              <span className="text-[11px] text-gray-400">{done}/{total}</span>
            </div>
          )}
        </button>
        <button
          onClick={() => setSlotPicker(slotPicker === s.id ? null : s.id)}
          className="mt-2 w-full rounded-lg border-2 border-dashed border-gray-200 py-1.5 text-xs font-medium text-gray-500 active:bg-gray-50"
        >
          {app?.round ? t('라운드 바꾸기', 'Change round') : t('라운드 칸에 넣기', 'Put in a round slot')}
        </button>
        {slotPicker === s.id && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {offeredRounds(s).map(({ round, timing }) => (
              <button
                key={round}
                onClick={() => {
                  upsertApp(s.id, { round: app?.round === round ? null : round })
                  setSlotPicker(null)
                }}
                className={`rounded-full border-2 px-2.5 py-1 text-xs font-medium ${
                  app?.round === round ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {roundLabels[round]}{timing && <span className="ml-1 font-normal opacity-80">{timingLabel(timing)}</span>}
              </button>
            ))}
            {app?.round && (
              <button onClick={() => { upsertApp(s.id, { round: null }); setSlotPicker(null) }} className="rounded-full border-2 border-gray-200 px-2.5 py-1 text-xs text-gray-500">
                {t('미배정으로', 'Unassign')}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <AppShell tab="colleges" title={t('지원 학교', 'My colleges')}>
      <p className="mt-3 text-sm text-gray-600">
        {roundCounts.length > 0 ? roundCounts.map((x) => `${roundLabels[x.r]} ${x.n}`).join(' · ') : t('라운드 미배정', 'No rounds assigned')}
        {' | '}{t('제출', 'Submitted')} {submittedCount}/{schools.length}
      </p>
      {isEarly && (
        <p className="mt-2 rounded-xl bg-gray-100 px-3.5 py-2 text-xs text-gray-600">
          {t('지원 라운드·목표는 매년 바뀔 수 있어요 — 지금은 미리 그려보는 단계예요. 11학년 여름부터 본격 확정.', 'Rounds and targets can change every year — this is a sketching stage for now. Things firm up from the summer of 11th grade.')}
        </p>
      )}

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

      {/* reach/match/safety 요약 — 학생 라벨 기준 */}
      {schools.length > 0 && (() => {
        const counts = fitOrder.map((f) => [f, schools.filter((s) => appFor(s.id)?.fit === f).length] as const)
        const labeled = counts.reduce((a, [, n]) => a + n, 0)
        const missing = fitOrder.filter((f) => counts.find(([k]) => k === f)![1] === 0)
        return (
          <div className="mt-4 rounded-xl bg-gray-100 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-gray-800">{t('내 리스트 균형', 'List balance')}</span>
              {counts.map(([f, n]) => <span key={f} className="text-gray-600">{fitLabels[f]} <strong>{n}</strong></span>)}
              <span className="text-xs text-gray-400">{t(`(${schools.length}개 중 ${labeled}개 분류)`, `(${labeled} of ${schools.length} labeled)`)}</span>
            </div>
            {labeled > 0 && missing.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">{t(`아직 없는 그룹: ${missing.map((f) => fitLabels[f]).join(', ')} — 학교 카드에서 정해 붙여보세요.`, `Not yet on your list: ${missing.map((f) => fitLabels[f]).join(', ')} — label them from each school card.`)}</p>
            )}
            {labeled === 0 && <p className="mt-1 text-xs text-gray-500">{t('학교를 열어 Reach/Match/Safety를 직접 정해보세요 — 툴은 판단하지 않고 학생 라벨만 저장해요.', 'Open a school and set Reach/Match/Safety yourself — the tool only stores your label.')}</p>}
          </div>
        )
      })()}

      {/* 라운드 칸 */}
      {roundSlots.map(({ round, label, rule }) => {
        const list = rowsFor(round)
        const timing = list[0] ? roundTiming(list[0], round) : null
        return (
          <div key={round} className="mt-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-gray-900">
                {label} <span className="ml-1 text-xs font-normal text-gray-400">{t(`${list.length}곳`, `${list.length}`)}</span>
              </h2>
              {timing && <span className="text-xs text-gray-500">{t('대개 ', 'Usually ')}{timingLabel(timing)}</span>}
            </div>
            <p className="text-[11px] text-gray-400">{rule}</p>
            <div className="mt-2 flex flex-col gap-2">
              {list.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-400">
                  {t('비어 있음', 'Empty')}
                </div>
              ) : (
                list.map(card)
              )}
            </div>
          </div>
        )
      })}

      {/* 미배정 */}
      <div className="mt-6">
        <h2 className="font-semibold text-gray-900">
          {t('미배정', 'Unassigned')} <span className="ml-1 text-xs font-normal text-gray-400">{t(`${unassigned.length}곳`, `${unassigned.length}`)}</span>
        </h2>
        <p className="text-[11px] text-gray-400">{t('카드의 [라운드 칸에 넣기]로 위 칸에 배치해요. 그 학교가 제공하는 라운드만 보여요.', 'Use [Put in a round slot] on a card to place it above. Only rounds that school offers are shown.')}</p>
        <div className="mt-2 flex flex-col gap-2">
          {unassigned.length === 0 ? (
            <p className="text-xs text-gray-400">{t('전부 배정됐어요 🎉', 'All assigned 🎉')}</p>
          ) : (
            unassigned.map(card)
          )}
        </div>
      </div>
    </AppShell>
  )
}
