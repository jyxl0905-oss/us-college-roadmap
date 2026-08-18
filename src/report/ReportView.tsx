import { useEffect, useState } from 'react'
import type { ChecklistItem, School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { countStoryExposure, filterChecklist, profileGrade, type ProfileRow } from '../lib/profile'
import { currentSeason, currentSeasonLabel, seasonLabelKo, nextCheckinKo } from '../lib/academics'
import {
  computeScores,
  weakestAxis,
  strongestAxis,
  scoreLevel,
  gradeBandMatches,
  axisKo,
  axisDiagnosis,
  storyAxisTooltip,
} from '../lib/score'
import { downloadDocx } from '../lib/report-doc'
import { logEvent } from '../lib/analytics'
import { navigate } from '../lib/router'
import { downloadIcs, nextCheckinDate } from '../lib/ics'
import { saveProfile } from '../lib/profile'
import { entriesForSchool, sortEntries } from '../deadlines/DeadlinesPage'
import SchoolLogo from '../browse/SchoolLogo'
import { recordOverrides, type RecordOverrides } from '../lib/recordScore'
import type { Activity, Honor } from '../app/appData'
import { majorLabel } from '../data/majors'
import { tierLabels } from '../onboarding/labels'
import RadarChart from './RadarChart'
import GrowthChart, { type SeasonPoint } from './GrowthChart'
import InstallPrompt from './InstallPrompt'
import { loadPlans, plannedScores, type Plan } from '../app/plans'
import type { AxisScores } from '../lib/score'
import AoBox from './AoBox'
import SchoolCards from './SchoolCards'
import ChecklistSection from './ChecklistSection'

interface PrevReport {
  season_label: string
  snapshot: { done: number; total: number }
}

interface Prescription {
  axis: string
  level: string
  grade_band: string
  text_ko: string
}

interface Appeal {
  axis: string
  text_ko: string
}

interface ReportViewProps {
  userId: string
  profile: ProfileRow
  onLogout: () => void
  onOpenGuide: () => void
  onProfileChange?: (p: ProfileRow) => void
}

// 로그인 후 메인 화면 — 시즌 리포트 (차트·학교·체크리스트·내보내기)
export default function ReportView({ userId, profile, onLogout, onOpenGuide, onProfileChange }: ReportViewProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [allItems, setAllItems] = useState<ChecklistItem[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [carriedIds, setCarriedIds] = useState<Set<number>>(new Set())
  const [allDoneIds, setAllDoneIds] = useState<Set<number>>(new Set()) // 전 시즌 누적 완료 (스토리 준비 분자)
  const [prevReport, setPrevReport] = useState<PrevReport | null>(null)
  const [history, setHistory] = useState<SeasonPoint[]>([]) // 성장 그래프용 전 시즌 스냅샷
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // F4 연동: 보드 라운드 배정 → 다가오는 마감을 배정 라운드 기준으로
  const [assignedRounds, setAssignedRounds] = useState<{ school_id: number; round: string | null; student_deadline?: string | null }[]>([])
  // F5 연동: 내 원서 활동·수상 기록 → spike/leadership/validation 기록 기반 점수
  const [overrides, setOverrides] = useState<RecordOverrides>({ spike: null, leadership: null, validation: null })
  const [plans, setPlans] = useState<Plan[]>([]) // F6 내 계획 → 6축 점선

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('applications')
      .select('school_id, round, student_deadline')
      .eq('user_id', userId)
      .then(({ data }) => setAssignedRounds(data ?? []))
    Promise.all([
      supabase.from('activities').select('*').eq('user_id', userId),
      supabase.from('honors').select('*').eq('user_id', userId),
    ]).then(([a, h]) => setOverrides(recordOverrides((a.data ?? []) as Activity[], (h.data ?? []) as Honor[])))
    loadPlans(userId).then(setPlans)
  }, [userId])

  const seasonLabel = currentSeasonLabel()
  const grade = profileGrade(profile)
  const isIntl = profile.applicant_status !== 'domestic'

  useEffect(() => {
    logEvent(userId, 'report_view')
  }, [userId])

  // F1: 학교 상세 CTA(/#school-{id})로 들어오면 해당 카드로 스크롤
  useEffect(() => {
    if (loading) return
    const hash = window.location.hash
    if (!hash.startsWith('#school-')) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState({}, '', window.location.pathname)
  }, [loading])

  useEffect(() => {
    if (!supabase) return
    const schoolsQuery =
      profile.target_mode === 'schools'
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : profile.target_mode === 'tier' && profile.target_tier
          ? supabase.from('schools').select('*').eq('tier', profile.target_tier)
          : null

    Promise.all([
      supabase.from('checklist_items').select('*'),
      supabase
        .from('user_checks')
        .select('item_id,status')
        .eq('user_id', userId)
        .eq('season_label', seasonLabel),
      schoolsQuery ?? Promise.resolve({ data: [], error: null }),
      supabase
        .from('reports')
        .select('season_label,snapshot,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase.from('prescriptions').select('*'),
      supabase.from('appeal_strategies').select('*'),
      supabase.from('user_checks').select('item_id').eq('user_id', userId).eq('status', 'done'),
    ]).then(([itemsRes, checksRes, schoolsRes, prevRes, presRes, appealRes, allDoneRes]) => {
      if (itemsRes.error) setError(itemsRes.error.message)
      else {
        const all = itemsRes.data as ChecklistItem[]
        setAllItems(all)
        setItems(filterChecklist(all, profile))
      }
      if (checksRes.data) {
        setCheckedIds(new Set(checksRes.data.filter((c) => c.status === 'done').map((c) => c.item_id)))
        setCarriedIds(new Set(checksRes.data.filter((c) => c.status === 'carried').map((c) => c.item_id)))
      }
      if (schoolsRes.data) {
        setSchools(([...schoolsRes.data] as School[]).sort((a, b) => a.usnews_rank - b.usnews_rank))
      }
      if (prevRes.data) {
        const all = prevRes.data as (PrevReport & { snapshot: { scores?: Partial<AxisScores> } })[]
        const past = all.filter((r) => r.season_label !== seasonLabel)
        if (past.length > 0) setPrevReport(past[past.length - 1])
        setHistory(all.map((r) => ({ season_label: r.season_label, scores: r.snapshot.scores ?? {}, done: r.snapshot.done, total: r.snapshot.total })))
      }
      if (presRes.data) setPrescriptions(presRes.data as Prescription[])
      if (appealRes.data) setAppeals(appealRes.data as Appeal[])
      if (allDoneRes.data) setAllDoneIds(new Set(allDoneRes.data.map((c) => c.item_id)))
      setLoading(false)
    })
  }, [userId, seasonLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  // 이월 항목: 이번 시즌 필터에 없는 체크 기록 (지난 시즌에서 가져온 것)
  const itemIds = new Set(items.map((i) => i.id))
  const carriedItems = allItems.filter(
    (i) => !itemIds.has(i.id) && (carriedIds.has(i.id) || checkedIds.has(i.id)),
  )
  const trackedItems = [...items, ...carriedItems]
  const checkedItems = trackedItems.filter((i) => checkedIds.has(i.id))
  // 스토리 준비: 분자 = 전 시즌 누적 완료된 story 항목, 분모 = 현재 학년까지 노출된 story 항목 (§0-2)
  const storyItemIds = new Set(allItems.filter((i) => i.axis === 'story').map((i) => i.id))
  const storyDone = [...allDoneIds].filter((id) => storyItemIds.has(id)).length
  const storyStats = { done: storyDone, exposed: countStoryExposure(allItems, profile) }
  const scores = computeScores(profile, checkedItems, storyStats, overrides)
  const recordBased = overrides.spike !== null || overrides.leadership !== null || overrides.validation !== null
  // F6: 계획 반영 시 점수(점선) + 숫자 진단 한 줄
  const activePlans = plans.filter((p) => p.status !== 'done')
  const planned = activePlans.length > 0 ? plannedScores(scores, activePlans) : null
  const weakest = weakestAxis(scores)
  // 약한 축 처방(§4 prescriptions): 축+등급+학년대 매칭, 없으면 기본 문구
  const weakLevel = scoreLevel(scores[weakest])
  const prescription =
    prescriptions.find(
      (p) => p.axis === weakest && p.level === weakLevel && gradeBandMatches(p.grade_band, grade),
    )?.text_ko ?? axisDiagnosis[weakest]
  // 어필 전략: 가장 강한 축이 원서의 중심축 (모든 축이 약하면 'none' 문구)
  const strongest = strongestAxis(scores)
  const appealAxis = scores[strongest] >= 40 ? strongest : 'none'
  const appealText = appeals.find((a) => a.axis === appealAxis)?.text_ko ?? null
  const doneCount = checkedItems.length
  const totalCount = trackedItems.length

  // 시즌 스냅샷 저장 (reports) — 리포트를 볼 때마다 최신으로 갱신
  useEffect(() => {
    if (!supabase || loading || error) return
    const snapshot = { done: doneCount, total: totalCount, scores }
    supabase
      .from('reports')
      .select('id')
      .eq('user_id', userId)
      .eq('season_label', seasonLabel)
      .maybeSingle()
      .then(({ data }) => {
        if (data) supabase!.from('reports').update({ snapshot }).eq('id', data.id).then(() => {})
        else
          supabase!
            .from('reports')
            .insert({ user_id: userId, season_label: seasonLabel, snapshot })
            .then(() => {})
      })
  }, [loading, doneCount, totalCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (itemId: number) => {
    if (!supabase) return
    const wasChecked = checkedIds.has(itemId)
    if (!wasChecked) logEvent(userId, 'check')
    // 누적 완료 집합도 동기화 (스토리 준비 점수 즉시 반영)
    setAllDoneIds((prev) => {
      const next = new Set(prev)
      if (wasChecked) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    const isCarried = carriedIds.has(itemId) || (!itemIds.has(itemId) && wasChecked)
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (wasChecked) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    if (isCarried) {
      // 이월 항목은 행을 지우지 않고 carried ↔ done으로 상태만 전환
      setCarriedIds((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(itemId)
        else next.delete(itemId)
        return next
      })
      await supabase.from('user_checks').upsert({
        user_id: userId,
        item_id: itemId,
        season_label: seasonLabel,
        status: wasChecked ? 'carried' : 'done',
      })
      return
    }
    const result = wasChecked
      ? await supabase
          .from('user_checks')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', itemId)
          .eq('season_label', seasonLabel)
      : await supabase
          .from('user_checks')
          .upsert({ user_id: userId, item_id: itemId, season_label: seasonLabel, status: 'done' })
    if (result.error) {
      setCheckedIds((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(itemId)
        else next.delete(itemId)
        return next
      })
    }
  }

  const commonItems = items.filter((i) => !i.intl_only)
  const intlItems = items.filter((i) => i.intl_only)

  const targetText =
    profile.target_mode === 'schools'
      ? schools.map((s) => s.name).join(' · ')
      : profile.target_mode === 'tier' && profile.target_tier
        ? tierLabels[profile.target_tier]
        : '목표 미정'

  const prevPct =
    prevReport && prevReport.snapshot.total > 0
      ? Math.round((prevReport.snapshot.done / prevReport.snapshot.total) * 100)
      : null
  const nowPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // F3: 12학년 Fall — 다가오는 마감 3줄 (가을 조기지원 우선, 이어서 겨울). 보드 배정 라운드가 있으면 그 기준
  const roundToPlan: Record<string, string> = { ed: 'ED', ed2: 'ED II', ea: 'EA', rea: 'REA', rd: 'RD' }
  const allDeadlines = schools.flatMap(entriesForSchool).filter((e) => {
    const app = assignedRounds.find((r) => r.school_id === e.school.id)
    if (!app?.round) return true
    return e.plan === roundToPlan[app.round]
  })
  const upcomingDeadlines = [
    ...sortEntries(allDeadlines.filter((e) => e.plan === 'ED' || e.plan === 'EA' || e.plan === 'REA')),
    ...sortEntries(allDeadlines.filter((e) => e.plan === 'ED II' || e.plan === 'RD')),
  ].slice(0, 3)

  if (loading) return <p className="mt-20 text-center text-gray-400">리포트 만드는 중…</p>
  if (error) return <p className="mt-20 text-center text-sm text-red-600">불러오기 실패: {error}</p>

  return (
    <div className="pb-10">
      {/* 1. 프로필 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.nickname}님의 시즌 리포트</h1>
          <p className="mt-1 text-sm text-gray-500">
            {grade}학년 · {majorLabel(profile.major_primary)} ·{' '}
            {seasonLabelKo[currentSeason()]}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{targetText}</p>
        </div>
        <button onClick={onLogout} className="no-print shrink-0 text-sm text-gray-400 underline">
          로그아웃
        </button>
      </div>

      {/* 내보내기 */}
      <div className="no-print mt-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          PDF로 저장
        </button>
        <button
          onClick={() => downloadDocx(profile, scores, trackedItems, checkedIds, schools)}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          Word(docx)로 저장
        </button>
      </div>

      {/* PWA 설치 안내 */}
      <InstallPrompt />

      {/* F5: 가상 Common App 추천 배너 (항상 표시) */}
      {(
        <div className="no-print mt-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white px-4 py-4">
          <p className="text-xs font-semibold text-blue-600">추천</p>
          <p className="mt-1 font-semibold text-gray-900">🎓 가상 Common App으로 더 전략적으로 준비하기</p>
          <p className="mt-1 text-sm text-gray-600">
            실제 원서 형식 그대로 4년 동안 미리 채워요 — 활동·점수·지원 학교가 한 곳에.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700"
          >
            내 원서 열기
          </button>
        </div>
      )}

      {/* F3: 12학년 Fall — 다가오는 마감 3줄 */}
      {grade === 12 && currentSeason() === 'fall' && upcomingDeadlines.length > 0 && (
        <div className="mt-5 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-red-900">🗓️ 다가오는 마감</p>
            <button onClick={() => navigate('/deadlines')} className="no-print text-sm text-red-700 underline">
              전체 보기
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {upcomingDeadlines.map((e, i) => (
              <p key={i} className="flex items-center gap-2 text-sm text-red-900">
                <SchoolLogo schoolId={e.school.id} name={e.school.name} size={20} />
                <span>
                  <span className="font-medium">{e.school.name}</span> — {e.plan} ·{' '}
                  {e.timing ?? '시기 미공개'}
                </span>
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-red-700">
            마감일은 매년 변동될 수 있어요 — 지원 전 공식 페이지에서 최종 확인하세요.
          </p>
        </div>
      )}

      {/* 2. AO 박스 */}
      <div className="mt-5">
        <AoBox grade={grade} />
      </div>

      {/* 3. 시즌 진행률 (+지난 시즌 대비) */}
      {totalCount > 0 && (
        <div className="print-flat mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-gray-900">이번 시즌 진행률</p>
            <p className="text-sm font-medium text-blue-700">
              {doneCount} / {totalCount}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${nowPct}%` }}
            />
          </div>
          {prevPct !== null && (
            <p className="mt-2 text-xs text-gray-500">
              지난 시즌 {prevPct}% → 이번 시즌 {nowPct}%{' '}
              {nowPct >= prevPct ? '📈' : '— 다시 속도를 내볼까요?'}
            </p>
          )}
        </div>
      )}

      {/* 4. 6축 밸런스 + 약한 축 진단 */}
      <div className="print-flat mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">6축 밸런스</p>
          {recordBased && (
            <span
              className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700"
              title="자가진단 대신 내 원서(활동·수상) 기록으로 계산됨"
            >
              📋 기록 기반
            </span>
          )}
        </div>
        <div className="mt-2">
          <RadarChart scores={scores} planned={planned ?? undefined} />
        </div>
        {planned ? (
          <p className="mt-1 text-xs text-gray-500">
            <span className="text-blue-600">- - -</span> 계획 {activePlans.length}개 반영 시 ·{' '}
            {(() => {
              const w = weakestAxis(planned)
              return `${axisKo[w]} ${scores[w]}→${planned[w]}${w === weakest ? ' (여전히 가장 약함)' : ''}`
            })()}{' '}
            <button onClick={() => navigate('/app/plans')} className="text-blue-600 underline">계획 수정</button>
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            <button onClick={() => navigate('/app/plans')} className="text-blue-600 underline">계획</button>을 적으면 실행 시 모양이 점선으로 보여요
          </p>
        )}
        {recordBased && (
          <p className="mt-1 text-[11px] text-gray-400">
            대표 활동·리더십·교외 인정 축은 자가진단 대신 내 원서 기록으로 계산됐어요.
          </p>
        )}
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
          <strong>{axisKo[weakest]}</strong>{' '}
          {weakest === 'story' ? '축은 아직 채워지는 중이에요.' : '축이 가장 약해요.'} {prescription}
        </p>
        <details className="mt-2 text-xs text-gray-400">
          <summary className="cursor-pointer select-none">ⓘ '스토리 준비' 축이란?</summary>
          <p className="mt-1 leading-relaxed text-gray-500">{storyAxisTooltip}</p>
        </details>
        {appealText && (
          <p className="mt-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-900">
            <strong>어필 전략</strong> — {appealText}
          </p>
        )}
      </div>

      {/* 시즌별 성장 그래프 — 현재 시즌은 실시간 점수로 대체 */}
      <div className="print-flat mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <p className="font-semibold text-gray-900">📈 시즌별 성장</p>
        <p className="mt-0.5 text-xs text-gray-400">시즌마다 돌아와 체크하면 여기 선이 자라요.</p>
        <div className="mt-3">
          <GrowthChart
            points={[
              ...history.filter((h) => h.season_label !== seasonLabel),
              { season_label: seasonLabel, scores, done: doneCount, total: totalCount },
            ]}
          />
        </div>
      </div>

      {/* 5. 목표 학교 */}
      {schools.length > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-gray-900">목표 학교</h2>
            <div className="no-print flex gap-3 text-sm">
              {schools.length >= 2 && (
                <button
                  onClick={() => navigate(`/compare?ids=${schools.slice(0, 3).map((s) => s.id).join(',')}`)}
                  className="text-blue-600"
                >
                  비교하기
                </button>
              )}
              <button onClick={() => navigate('/schools')} className="text-blue-600">
                둘러보기 →
              </button>
            </div>
          </div>
          <div className="mt-3">
            <SchoolCards
              schools={schools}
              satBand={profile.sat_status === 'taken' ? profile.sat_band : null}
              majorPrimary={profile.major_primary}
            />
          </div>
        </div>
      )}

      {/* 확인 필요 안내 */}
      {(profile.school_accredited === 'unknown' || profile.applicant_status === 'unknown' || (isIntl && profile.toefl_status === 'exempt')) && (
        <div className="mt-5 flex flex-col gap-2">
          {isIntl && profile.toefl_status === 'exempt' && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-medium text-amber-900">TOEFL 면제 — 목표 학교별 기준 확인하기</p>
              <p className="mt-0.5 text-sm text-amber-700">
                면제 기준(영어 수업 학교 재학 연수·SAT 영어 점수 등)은 학교마다 달라요. 목표 학교 공식 입학처 페이지에서 내가 해당되는지 확인하고, 아니면 응시 계획을 세우세요.
              </p>
            </div>
          )}
          {profile.school_accredited === 'unknown' && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-medium text-amber-900">학교 국제 인증(WASC·Cognia) 확인하기</p>
              <p className="mt-0.5 text-sm text-amber-700">
                성적표 인정에 중요해요. 학교 행정실이나 홈페이지에서 확인해 보세요.
              </p>
            </div>
          )}
          {profile.applicant_status === 'unknown' && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <p className="font-medium text-amber-900">지원 신분(국제학생 여부) 확인하기</p>
              <p className="mt-0.5 text-sm text-amber-700">
                시민권·영주권 여부에 따라 준비 항목이 달라져요. 지금은 국제학생 기준이에요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 이월된 항목 */}
      {carriedItems.length > 0 && (
        <div className="mt-5">
          <h2 className="font-semibold text-gray-900">지난 시즌에서 이월된 항목</h2>
          <div className="mt-3">
            <ChecklistSection items={carriedItems} checkedIds={checkedIds} onToggle={toggle} />
          </div>
        </div>
      )}

      {/* 6. 이번 시즌 체크리스트 */}
      <div className="mt-5">
        <h2 className="font-semibold text-gray-900">이번 시즌 체크리스트</h2>
        {commonItems.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">이번 시즌 공통 항목이 아직 없어요.</p>
        )}
        <div className="mt-3">
          <ChecklistSection items={commonItems} checkedIds={checkedIds} onToggle={toggle} />
        </div>
      </div>

      {/* 7. 국제학생 섹션 */}
      {isIntl && intlItems.length > 0 && (
        <div className="mt-5">
          <h2 className="font-semibold text-gray-900">국제학생 체크 (International)</h2>
          <div className="mt-3">
            <ChecklistSection items={intlItems} checkedIds={checkedIds} onToggle={toggle} />
          </div>
        </div>
      )}

      {/* 내 원서·지원 보드·마감 캘린더·입시 기본기 링크 */}
      <div className="no-print mt-8 flex flex-col gap-2">
        <button
          onClick={() => navigate('/app')}
          className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3.5 font-semibold text-blue-700 active:bg-blue-100"
        >
          📋 내 원서 — 가상 Common App
        </button>
        <button
          onClick={() => navigate('/deadlines')}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
        >
          🗓️ 마감 캘린더 보기
        </button>
        <button
          onClick={onOpenGuide}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
        >
          📚 입시 기본기 · 용어집 보기
        </button>
      </div>

      {/* 리마인더: 캘린더 파일 + 시즌 시작 이메일 알림 스위치 */}
      <div className="no-print mt-6 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">🔔 시즌 시작 알림 이메일</p>
            <p className="text-xs text-gray-400">8월·1월·6월 시즌이 열리면 체크인하라고 한 통 보내드려요</p>
          </div>
          <button
            role="switch"
            aria-checked={!profile.reminder_opt_out}
            onClick={async () => {
              const next = { ...profile, reminder_opt_out: !profile.reminder_opt_out }
              await saveProfile(userId, next)
              onProfileChange?.(next)
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${profile.reminder_opt_out ? 'bg-gray-300' : 'bg-blue-600'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${profile.reminder_opt_out ? 'left-0.5' : 'left-[22px]'}`} />
          </button>
        </div>
        <button
          onClick={() => {
            const events = [
              { title: '미국 대입 로드맵 — 시즌 체크인', date: nextCheckinDate(), description: '새 시즌 체크리스트 확인: https://us-college-roadmap.vercel.app' },
              ...assignedRounds
                .filter((a) => a.student_deadline)
                .map((a) => {
                  const s = schools.find((x) => x.id === a.school_id)
                  return {
                    title: `${s?.name ?? '학교'} ${a.round ? a.round.toUpperCase() : ''} 마감 (내가 입력한 날짜)`,
                    date: a.student_deadline as string,
                    description: '공식 페이지에서 최종 확인하세요' + (s?.deadlines_source_url ? `: ${s.deadlines_source_url}` : ''),
                  }
                }),
            ]
            downloadIcs('us-college-roadmap.ics', events)
          }}
          className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          📅 폰 캘린더에 추가 (.ics) — 다음 체크인{assignedRounds.some((a) => a.student_deadline) ? ' + 내가 입력한 마감일' : ''}
        </button>
      </div>

      {/* 8. 푸터 */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>미국 대입 로드맵 · us-college-roadmap.vercel.app</p>
        <p className="mt-1">
          다음 체크인: <strong className="text-gray-500">{nextCheckinKo()}</strong>
        </p>
      </div>
    </div>
  )
}
