import { useEffect, useState } from 'react'
import type { School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import SchoolLogo from '../browse/SchoolLogo'

// 시기 라벨("11월 초") → 정렬 키. 입시 사이클 기준 8월이 가장 이름
export function timingSortKey(label: string | null): number {
  if (!label) return 999
  const m = label.match(/(\d+)월\s*(초|중순|말)?/)
  if (!m) return 999
  const month = Number(m[1])
  const cycleMonth = month >= 8 ? month - 8 : month + 5 // 8월=0 … 7월=11
  const part = m[2] === '초' ? 0 : m[2] === '중순' ? 1 : m[2] === '말' ? 2 : 1
  return cycleMonth * 10 + part
}

type PlanType = 'ED' | 'EA' | 'REA' | 'ED II' | 'RD'

export interface DeadlineEntry {
  school: School
  plan: PlanType
  timing: string | null
}

// 학교 1곳 → 제공 전형별 마감 항목들
export function entriesForSchool(s: School): DeadlineEntry[] {
  const out: DeadlineEntry[] = []
  if (s.ed_offered) out.push({ school: s, plan: 'ED', timing: s.ed_timing ?? null })
  if (s.rea_offered) out.push({ school: s, plan: 'REA', timing: s.ea_timing ?? null })
  if (s.ea_offered) out.push({ school: s, plan: 'EA', timing: s.ea_timing ?? null })
  if (s.ed2_offered) out.push({ school: s, plan: 'ED II', timing: s.ed2_timing ?? null })
  if (s.rd_timing) out.push({ school: s, plan: 'RD', timing: s.rd_timing })
  return out
}

export function sortEntries(entries: DeadlineEntry[]): DeadlineEntry[] {
  return [...entries].sort((a, b) => timingSortKey(a.timing) - timingSortKey(b.timing))
}

const planBadge: Record<PlanType, string> = {
  ED: 'bg-red-50 text-red-700',
  'ED II': 'bg-red-50 text-red-700',
  REA: 'bg-amber-50 text-amber-800',
  EA: 'bg-blue-50 text-blue-700',
  RD: 'bg-gray-100 text-gray-600',
}

// 용어집 term → 전형 타입 매칭용 접두사
const glossaryPrefix: Record<PlanType, string> = {
  ED: 'ED (',
  EA: 'EA (',
  REA: 'REA',
  'ED II': 'ED II',
  RD: 'RD',
}

interface DeadlinesPageProps {
  userId: string
  profile: ProfileRow
}

// F4 연동: 보드에서 배정한 라운드 → 캘린더에 그 라운드 마감만 표시
const roundToPlan: Record<string, PlanType> = { ed: 'ED', ed2: 'ED II', ea: 'EA', rea: 'REA', rd: 'RD' }

// F3: 마감 캘린더 — 내 목표 학교의 지원 마감을 시간순 타임라인으로 (로그인 전용)
export default function DeadlinesPage({ userId, profile }: DeadlinesPageProps) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const [glossary, setGlossary] = useState<{ term: string; definition_ko: string }[]>([])
  const [rounds, setRounds] = useState<{ school_id: number; round: string | null }[]>([])

  const hasTarget =
    (profile.target_mode === 'schools' && profile.target_school_ids.length > 0) ||
    (profile.target_mode === 'tier' && profile.target_tier !== null)

  useEffect(() => {
    if (!supabase || !hasTarget) {
      setSchools([])
      return
    }
    const query =
      profile.target_mode === 'schools'
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : supabase.from('schools').select('*').eq('tier', profile.target_tier)
    Promise.all([
      query,
      supabase.from('glossary').select('term, definition_ko'),
      supabase.from('applications').select('school_id, round').eq('user_id', userId),
    ]).then(([sc, gl, ap]) => {
      setSchools((sc.data ?? []) as School[])
      setGlossary(gl.data ?? [])
      setRounds(ap.data ?? [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile.target_mode, profile.target_tier, profile.target_school_ids.join(',')])

  const definitionFor = (plan: PlanType) =>
    glossary.find((g) => g.term.startsWith(glossaryPrefix[plan]))?.definition_ko ?? null

  if (!hasTarget)
    return (
      <div className="min-h-dvh bg-gray-50">
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <p className="text-4xl">🗓️</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">마감 캘린더</h1>
          <p className="mt-3 text-sm text-gray-500">목표 학교를 설정하면 캘린더가 생성됩니다.</p>
          <button
            onClick={() => navigate('/schools')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            대학 둘러보기에서 목표 정하기
          </button>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-gray-400 underline">
            리포트로 돌아가기
          </button>
        </div>
      </div>
    )

  if (schools === null) return <p className="mt-20 text-center text-gray-400">불러오는 중…</p>

  // 보드에서 라운드를 배정한 학교는 그 라운드 마감만
  const byAssignedRound = (e: DeadlineEntry) => {
    const app = rounds.find((r) => r.school_id === e.school.id)
    if (!app?.round) return true
    return e.plan === roundToPlan[app.round]
  }
  const all = schools.flatMap(entriesForSchool).filter(byAssignedRound)
  const fall = sortEntries(all.filter((e) => e.plan === 'ED' || e.plan === 'EA' || e.plan === 'REA'))
  const winter = sortEntries(all.filter((e) => e.plan === 'ED II' || e.plan === 'RD'))
  // 마감 정보가 아직 없는 목표 학교 (미조사 or 미공개)
  const noData = schools.filter((s) => entriesForSchool(s).length === 0)

  const renderGroup = (title: string, subtitle: string, entries: DeadlineEntry[]) =>
    entries.length > 0 && (
      <div className="mt-6">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
        <div className="mt-3 flex flex-col gap-2">
          {entries.map((e, i) => {
            const def = definitionFor(e.plan)
            return (
              <div key={`${e.school.id}-${e.plan}-${i}`} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <SchoolLogo schoolId={e.school.id} name={e.school.name} size={30} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{e.school.name}</p>
                      <p className="truncate text-xs text-gray-500">{e.school.name_ko}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${planBadge[e.plan]}`}>
                      {e.plan}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{e.timing ?? '미공개'}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  {def ? (
                    <details className="min-w-0 text-xs text-gray-400">
                      <summary className="cursor-pointer select-none">ⓘ {e.plan}란?</summary>
                      <p className="mt-1 leading-relaxed text-gray-500">{def}</p>
                    </details>
                  ) : (
                    <span />
                  )}
                  {e.school.deadlines_source_url && (
                    <a
                      href={e.school.deadlines_source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs text-blue-600 underline"
                    >
                      공식 페이지 확인 ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label="리포트로" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">마감 캘린더</h1>
        </div>

        {/* 고정 고지 */}
        <p className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠️ 마감일은 매년 변동될 수 있어요 — 지원 전 반드시 각 학교 공식 페이지에서 최종 확인하세요.
        </p>

        {all.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-400">
            목표 학교의 마감 정보가 아직 준비되지 않았어요. 학교 공식 페이지를 직접 확인해 주세요.
          </p>
        )}

        {renderGroup('가을 — 조기 지원', 'ED · EA · REA (대개 10~11월 마감)', fall)}
        {renderGroup('겨울 — 정시·2차', 'ED II · RD (대개 1월 마감)', winter)}

        {noData.length > 0 && all.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-500">마감 정보 미확인 학교</h2>
            <p className="mt-1 text-xs text-gray-400">
              {noData.map((s) => s.name).join(', ')} — 공식 페이지에서 직접 확인해 주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
