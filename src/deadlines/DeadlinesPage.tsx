import { timingLabel } from '../lib/academics'
import { useEffect, useState } from 'react'
import type { School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import SchoolLogo from '../browse/SchoolLogo'
import { t, localizeRows } from '../i18n'

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

// 시기 라벨 현지화 — DB 원문은 "11월 초" 형식(한국어). 영어 모드에서는 "early Nov"로 변환, 형식이 다르면 원문 유지
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
      supabase.from('glossary').select('term, definition_ko, term_en, definition_en'),
      supabase.from('applications').select('school_id, round').eq('user_id', userId),
    ]).then(([sc, gl, ap]) => {
      setSchools(localizeRows((sc.data ?? []) as School[]))
      setGlossary(localizeRows(gl.data ?? []))
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
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('마감 캘린더', 'Deadline Calendar')}</h1>
          <p className="mt-3 text-sm text-gray-500">{t('목표 학교를 설정하면 캘린더가 생성됩니다.', 'Set your target schools to build your calendar.')}</p>
          <button
            onClick={() => navigate('/schools')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t('대학 둘러보기에서 목표 정하기', 'Pick targets in Browse Colleges')}
          </button>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-gray-400 underline">
            {t('리포트로 돌아가기', 'Back to report')}
          </button>
        </div>
      </div>
    )

  if (schools === null) return <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>

  // 보드에서 라운드를 배정한 학교는 그 라운드 마감만
  const byAssignedRound = (e: DeadlineEntry) => {
    const app = rounds.find((r) => r.school_id === e.school.id)
    if (!app?.round) return true
    return e.plan === roundToPlan[app.round]
  }
  const all = schools.flatMap(entriesForSchool).filter(byAssignedRound)
  // 월별 그룹 — 입시 사이클 순서(8월→7월). 시기 미공개 항목은 맨 뒤 그룹으로
  const sorted = sortEntries(all.filter((e) => e.timing))
  const monthOf = (timing: string) => timing.match(/(\d+)월/)?.[1] ?? null
  const monthGroups: { month: string; list: DeadlineEntry[] }[] = []
  for (const e of sorted) {
    const m = monthOf(e.timing!) ?? '?'
    const last = monthGroups[monthGroups.length - 1]
    if (last && last.month === m) last.list.push(e)
    else monthGroups.push({ month: m, list: [e] })
  }
  const noTiming = all.filter((e) => !e.timing)
  const monthNamesEn: Record<string, string> = { '1': 'January', '2': 'February', '3': 'March', '4': 'April', '5': 'May', '6': 'June', '7': 'July', '8': 'August', '9': 'September', '10': 'October', '11': 'November', '12': 'December' }
  // 마감 정보가 아직 없는 목표 학교 (미조사 or 미공개)
  const noData = schools.filter((s) => entriesForSchool(s).length === 0)

  const renderGroup = (title: string, subtitle: string, entries: DeadlineEntry[]) =>
    entries.length > 0 && (
      <div className="mt-6">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
        <div className="mt-3 flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
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
                    <p className="mt-1 text-sm font-semibold text-gray-900">{timingLabel(e.timing) ?? t('미공개', 'Not disclosed')}</p>
                  </div>
                </div>
                {(e.school.overall_accept_rate != null || e.school.intl_accept_rate !== null) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                    {e.school.overall_accept_rate != null && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        {t(`합격률 ${e.school.overall_accept_rate}%`, `Accept ${e.school.overall_accept_rate}%`)}
                      </span>
                    )}
                    {e.school.intl_accept_rate !== null && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        {t(`국제 ${e.school.intl_accept_rate}%`, `Intl. ${e.school.intl_accept_rate}%`)}
                      </span>
                    )}
                    {(e.plan === 'ED' || e.plan === 'ED II') && e.school.ed_applied != null && e.school.ed_admitted != null && e.school.ed_applied > 0 ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                        {t(`ED 합격률 ${Math.round((e.school.ed_admitted / e.school.ed_applied) * 1000) / 10}% (CDS ${e.school.ed_cds_year ?? ''})`,
                           `ED accept ${Math.round((e.school.ed_admitted / e.school.ed_applied) * 1000) / 10}% (CDS ${e.school.ed_cds_year ?? ''})`)}
                      </span>
                    ) : (e.plan === 'ED' || e.plan === 'ED II' || e.plan === 'EA' || e.plan === 'REA') ? (
                      <span className="text-gray-400">
                        {t('· 전체 지원자 기준 — 이 라운드별 합격률은 미공개예요', '· all applicants — this round’s rate isn’t published')}
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-3">
                  {def ? (
                    <details className="min-w-0 text-xs text-gray-400">
                      <summary className="cursor-pointer select-none">{t(`ⓘ ${e.plan}란?`, `ⓘ What is ${e.plan}?`)}</summary>
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
                      {t('공식 페이지 확인 ↗', 'Check official page ↗')}
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
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label={t('리포트로', 'Back to report')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('마감 캘린더', 'Deadline Calendar')}</h1>
        </div>

        {/* 고정 고지 */}
        <p className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t(
            '⚠️ 마감일은 매년 변동될 수 있어요 — 지원 전 반드시 각 학교 공식 페이지에서 최종 확인하세요.',
            '⚠️ Deadlines can change every year — always confirm on each school\'s official page before applying.',
          )}
        </p>

        {all.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-400">
            {t(
              '목표 학교의 마감 정보가 아직 준비되지 않았어요. 학교 공식 페이지를 직접 확인해 주세요.',
              'Deadline info for your target schools is not ready yet. Please check each school\'s official page.',
            )}
          </p>
        )}

        {monthGroups.map((g) => {
          const plans = [...new Set(g.list.map((e) => e.plan))].join(' · ')
          return (
            <div key={g.month}>
              {renderGroup(
                g.month === '?' ? t('기타', 'Other') : t(`${g.month}월`, monthNamesEn[g.month] ?? `Month ${g.month}`),
                t(`${g.list.length}건 · ${plans}`, `${g.list.length} deadline${g.list.length === 1 ? '' : 's'} · ${plans}`),
                g.list,
              )}
            </div>
          )
        })}
        {noTiming.length > 0 &&
          renderGroup(t('시기 미공개', 'Timing not disclosed'), t('학교가 마감 시기를 공표하지 않았어요 — 공식 페이지 확인', 'The school has not published a timing — check its official page'), noTiming)}

        {noData.length > 0 && all.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-500">{t('마감 정보 미확인 학교', 'Schools without deadline info')}</h2>
            <p className="mt-1 text-xs text-gray-400">
              {noData.map((s) => s.name).join(', ')}{t(' — 공식 페이지에서 직접 확인해 주세요.', ' — please check their official pages.')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
