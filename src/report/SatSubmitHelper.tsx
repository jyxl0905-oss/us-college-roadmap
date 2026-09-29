import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoUser, demoStore } from '../demo/demoData'
import type { TestScore } from '../app/appData'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { satBandMid } from '../lib/score'
import { loadC7, LEVEL_STYLE, levelLabel, type C7Row } from '../lib/c7'
import { navigate, slugify } from '../lib/router'
import { t, getLang } from '../i18n'
import SchoolLogo from '../browse/SchoolLogo'

// SAT·ACT 제출 판단 도우미 — 선택 제출 학교마다 "내 점수가 그 학교 신입생 중간 50% 범위의 어디쯤인지"와
// "학교가 공시한 시험 점수 비중(CDS C7)"을 나란히 보여줌. 공식 수치만, 합격 가능성·제출 권유 문구 없음
type Pos = 'below' | 'in' | 'above'
const posOf = (v: number, [lo, hi]: [number, number]): Pos => (v < lo ? 'below' : v > hi ? 'above' : 'in')
const POS_STYLE: Record<Pos, string> = { below: 'bg-amber-50 text-amber-800', in: 'bg-gray-100 text-gray-700', above: 'bg-green-50 text-green-800' }
const posLabel = (p: Pos) => (p === 'below' ? t('범위보다 낮음', 'Below the range') : p === 'in' ? t('범위 안', 'Within the range') : t('범위보다 높음', 'Above the range'))

interface Mine { sat: number | null; ebrw: number | null; math: number | null; act: number | null; approx: boolean }

function best(tests: TestScore[], kind: 'sat' | 'act') {
  return tests.filter((x) => x.kind === kind && x.total != null).sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0] ?? null
}

export default function SatSubmitHelper({ userId, profile, schools }: { userId: string; profile: ProfileRow; schools: School[] }) {
  const [c7, setC7] = useState<Map<number, C7Row> | null>(null)
  const [tests, setTests] = useState<TestScore[] | null>(null)

  useEffect(() => { void loadC7().then(setC7) }, [])
  useEffect(() => {
    if (isDemoUser(userId)) { setTests(demoStore().tests); return }
    if (!supabase) { setTests([]); return }
    supabase.from('test_scores').select('*').eq('user_id', userId).in('kind', ['sat', 'act'])
      .then(({ data }) => setTests((data ?? []) as TestScore[]), () => setTests([]))
  }, [userId])

  if (!c7 || !tests) return null

  const sat = best(tests, 'sat')
  const act = best(tests, 'act')
  const bandMid = !sat && profile.sat_status === 'taken' && profile.sat_band ? satBandMid[profile.sat_band] ?? null : null
  const mine: Mine = {
    sat: sat?.total ?? bandMid,
    ebrw: sat?.section_scores?.ebrw ?? null,
    math: sat?.section_scores?.math ?? null,
    act: act?.total ?? null,
    approx: !sat && bandMid !== null,
  }
  const hasScore = mine.sat !== null || mine.act !== null

  const optional = schools.filter((s) => s.test_policy === 'test-optional')
  const required = schools.filter((s) => s.test_policy === 'test-required')
  const free = schools.filter((s) => s.test_policy === 'test-free')
  const unknown = schools.filter((s) => !s.test_policy)
  const short = (s: School) => (getLang() === 'ko' && s.name_ko ? s.name_ko.replace(/ ?(대학교|대학)$/, '') : s.name)

  // 학교마다 비교 가능한 구간 (종합 → 과목별 → ACT 순)
  const rows = (s: School): { label: string; mine: number; range: [number, number] }[] => {
    const out: { label: string; mine: number; range: [number, number] }[] = []
    if (mine.sat !== null && s.sat_mid50_low != null && s.sat_mid50_high != null) out.push({ label: t('SAT 종합', 'SAT total'), mine: mine.sat, range: [s.sat_mid50_low, s.sat_mid50_high] })
    else {
      if (mine.math !== null && s.test_ranges?.sat_math) out.push({ label: t('SAT 수학', 'SAT Math'), mine: mine.math, range: s.test_ranges.sat_math })
      if (mine.ebrw !== null && s.test_ranges?.sat_erw) out.push({ label: t('SAT 읽기·쓰기', 'SAT R&W'), mine: mine.ebrw, range: s.test_ranges.sat_erw })
    }
    if (mine.act !== null && s.test_ranges?.act) out.push({ label: 'ACT', mine: mine.act, range: s.test_ranges.act })
    return out
  }

  const Bar = ({ v, range }: { v: number; range: [number, number] }) => {
    const [lo, hi] = range
    const pad = (hi - lo) * 0.6 || 50
    const min = lo - pad, max = hi + pad
    const pct = (x: number) => `${Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100))}%`
    return (
      <div className="relative mt-1 h-2 rounded-full bg-gray-100" aria-hidden="true">
        <div className="absolute inset-y-0 rounded-full bg-blue-200" style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-gray-900" style={{ left: pct(v) }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
        <p className="font-semibold text-gray-900">{t('SAT·ACT 제출 판단 도우미', 'SAT/ACT submit-or-not helper')}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
          {t('시험 선택 제출(test-optional) 학교는 점수를 낼지 내가 정해요. 학교마다 내 점수가 신입생 중간 50% 범위의 어디쯤인지와, 학교가 공시한 시험 점수 비중을 나란히 보여줄게요.', 'At test-optional schools you decide whether to send scores. For each school we show where your score sits in the middle 50% of enrolled students, next to how much weight the school says it gives test scores.')}
        </p>
        <p className="mt-2 text-[13px] text-gray-800">
          {mine.sat !== null && <span className="mr-2 font-semibold">SAT {mine.sat}{mine.approx ? t(' (밴드 중간값)', ' (band midpoint)') : ''}{mine.math !== null && mine.ebrw !== null ? ` · ${t('수학', 'Math')} ${mine.math} / ${t('읽기·쓰기', 'R&W')} ${mine.ebrw}` : ''}</span>}
          {mine.act !== null && <span className="font-semibold">ACT {mine.act}</span>}
        </p>
        {!hasScore && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            {t('아직 입력된 SAT·ACT 점수가 없어요. 내 원서 → 시험에 점수를 넣으면 학교별 위치를 보여줄게요.', 'No SAT/ACT score yet. Add it in My App → Tests to see where you sit at each school.')}{' '}
            <button onClick={() => navigate('/app/testing')} className="font-semibold underline">{t('점수 입력하기', 'Add a score')}</button>
          </p>
        )}
        {mine.approx && (
          <p className="mt-1 text-[12px] text-gray-400">{t('실제 점수를 내 원서 → 시험에 넣으면 더 정확해져요.', 'Enter your actual score in My App → Tests for a precise comparison.')}</p>
        )}
      </div>

      {optional.length > 0 && (
        <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <p className="text-sm font-semibold text-gray-900">{t(`선택 제출 학교 ${optional.length}곳 — 낼지 정해야 해요`, `${optional.length} test-optional school${optional.length === 1 ? '' : 's'} — your decision`)}</p>
          <div className="mt-2 divide-y divide-gray-100">
            {optional.map((s) => {
              const row = c7.get(s.id)
              const lv = row?.levels.standardized_tests ?? null
              const cmp = rows(s)
              return (
                <div key={s.id} className="py-3">
                  <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="flex w-full items-center gap-2 text-left">
                    <SchoolLogo schoolId={s.id} name={s.name} size={24} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{short(s)}</span>
                    {lv && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL_STYLE[lv].chip}`}>{t('시험 비중', 'Tests')}: {levelLabel(lv)}</span>}
                  </button>
                  {cmp.length > 0 ? cmp.map((c) => {
                    const p = posOf(c.mine, c.range)
                    return (
                      <div key={c.label} className="mt-2">
                        <div className="flex items-center justify-between gap-2 text-[12px] text-gray-500">
                          <span>{c.label} {t('중간 50%', 'middle 50%')} <span className="font-semibold text-gray-700">{c.range[0]}–{c.range[1]}</span> · {t('내 점수', 'you')} <span className="font-semibold text-gray-900">{c.mine}</span></span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${POS_STYLE[p]}`}>{posLabel(p)}</span>
                        </div>
                        <Bar v={c.mine} range={c.range} />
                      </div>
                    )
                  }) : (
                    <p className="mt-1.5 text-[12px] text-gray-400">
                      {hasScore ? t('이 학교는 비교할 점수 구간이 공개되지 않았어요.', 'This school has not published a comparable score range.') : t('점수를 입력하면 위치가 보여요.', 'Add a score to see your position.')}
                    </p>
                  )}
                  {row?.note && <p className="mt-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12px] text-blue-900">{t(row.note[0], row.note[1])}</p>}
                  {row?.next && <p className="mt-1.5 text-[12px] font-semibold text-blue-800">{t(`${row.next.entry}년 가을 입학부터 SAT·ACT 필수로 바뀌어요.`, `SAT/ACT becomes required from fall ${row.next.entry} entry.`)}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(required.length > 0 || free.length > 0 || unknown.length > 0) && (
        <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 text-[13px] text-gray-700">
          {required.length > 0 && <p><span className="font-semibold text-gray-900">{t('제출 필수', 'Required')}</span> · {required.map(short).join(', ')}</p>}
          {free.length > 0 && <p className="mt-1"><span className="font-semibold text-gray-900">{t('반영 안 함(내도 안 봐요)', 'Test-free (not considered)')}</span> · {free.map(short).join(', ')}</p>}
          {unknown.length > 0 && <p className="mt-1 text-gray-400">{t('시험 정책 확인 중', 'Policy not confirmed')} · {unknown.map(short).join(', ')}</p>}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-gray-400">
        {t('중간 50%는 점수를 낸 신입생 가운데 25%~75% 지점이에요(각 대학 CDS 또는 미 교육부 College Scorecard). 시험 비중은 각 대학 CDS C7 공시 기준이에요. 합격 가능성을 계산하지 않아요 — 학교마다 선택 제출 안내 페이지의 설명도 꼭 확인하세요.', 'The middle 50% is the 25th–75th percentile of enrolled students who submitted scores (each college’s CDS or the College Scorecard). Test weight is from each college’s CDS C7. This does not estimate admission chances — also read each school’s own test-optional guidance.')}
      </p>
    </div>
  )
}
