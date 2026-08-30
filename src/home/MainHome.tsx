import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { t } from '../i18n'
import type { ProfileRow } from '../lib/profile'
import SchoolLogo from '../browse/SchoolLogo'
import schoolsIndex from '../data/schools.index.json'
import type { School } from '../lib/types'
import { dDay, roundLabels, type Round } from '../board/boardLogic'

const schools = schoolsIndex as School[]

// 온보딩 전 로그인 유저의 메인 화면 — 중심은 기록(내 원서). 랜딩의 약속("기록하는 곳")과 일치.
// 온보딩 완료 유저는 이 화면을 거치지 않고 기존처럼 바로 리포트('/')를 봄.
export default function MainHome({ userId, profile }: { userId: string; profile: ProfileRow }) {
  const [counts, setCounts] = useState<{ act: number; hon: number; test: number; essay: number } | null>(null)
  const [deadlines, setDeadlines] = useState<{ school_id: number; round: Round | null; d: number }[]>([])

  useEffect(() => {
    if (!supabase) return
    const head = { count: 'exact' as const, head: true }
    Promise.all([
      supabase.from('activities').select('id', head).eq('user_id', userId),
      supabase.from('honors').select('id', head).eq('user_id', userId),
      supabase.from('test_scores').select('id', head).eq('user_id', userId),
      supabase.from('essays').select('id', head).eq('user_id', userId),
    ]).then(([a, h, ts, e]) => setCounts({ act: a.count ?? 0, hon: h.count ?? 0, test: ts.count ?? 0, essay: e.count ?? 0 }))
    supabase
      .from('applications')
      .select('school_id,round,student_deadline')
      .eq('user_id', userId)
      .not('student_deadline', 'is', null)
      .then(({ data }) => {
        const rows = (data ?? [])
          .map((r) => ({ school_id: Number(r.school_id), round: (r.round ?? null) as Round | null, d: dDay(r.student_deadline as string) ?? 9999 }))
          .filter((r) => r.d >= 0)
          .sort((x, y) => x.d - y.d)
          .slice(0, 2)
        setDeadlines(rows)
      })
  }, [userId])

  const targets = profile.target_mode === 'schools' ? profile.target_school_ids : []
  const targetSchools = targets.map((id) => schools.find((s) => s.id === id)).filter((s): s is School => !!s).slice(0, 4)
  const nickname = profile.nickname?.trim()

  const total = counts ? counts.act + counts.hon + counts.test + counts.essay : null

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 lg:max-w-2xl">
        <h1 className="text-xl font-bold text-gray-900">
          {nickname ? t(`${nickname}님의 기록`, `${nickname}'s record`) : t('내 기록', 'My record')}
        </h1>

        {/* 내 원서 요약 — 기록이 중심 */}
        <div className="mt-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-gray-900">📋 {t('내 원서', 'My App')}</p>
            <span className="text-xs text-gray-400">{t('가상 원서 · 실제 제출 아님', 'Practice application · not a real submission')}</span>
          </div>
          {counts === null ? (
            <p className="mt-3 text-sm text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
          ) : total === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              {t('아직 기록이 없어요. 활동 하나부터 시작해 보세요 — 나중에 옮겨 적기만 하면 되게.', 'Nothing recorded yet. Start with one activity — future you will just copy it over.')}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {([
                [t('활동', 'Activities'), counts.act, '/app/activities'],
                [t('수상', 'Honors'), counts.hon, '/app/activities'],
                [t('시험', 'Tests'), counts.test, '/app/testing'],
                [t('에세이', 'Essays'), counts.essay, '/app/writing'],
              ] as [string, number, string][]).map(([label, n, to]) => (
                <button key={label} onClick={() => navigate(to)} className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2.5 active:bg-gray-100">
                  <span className="block text-lg font-bold text-gray-900">{n}</span>
                  <span className="block text-[11px] text-gray-500">{label}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/app')} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700">
            {total === 0 ? t('＋ 첫 기록 남기기', '＋ Make your first entry') : t('＋ 기록 추가', '＋ Add to my record')}
          </button>
        </div>

        {/* 목표 학교 요약 */}
        <div className="mt-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-gray-900">🎯 {t('목표 학교', 'Target schools')}</p>
            {targets.length > 0 && <button onClick={() => navigate('/targets')} className="text-xs text-blue-600 underline">{t('전체 보기', 'View all')}</button>}
          </div>
          {targets.length === 0 ? (
            <>
              <p className="mt-3 text-sm text-gray-500">{t('아직 목표 학교가 없어요', 'No target schools yet')}</p>
              <button onClick={() => navigate('/schools')} className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 active:bg-gray-50">
                {t('학교 추가하러 가기', 'Go add schools')}
              </button>
            </>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              {targetSchools.map((s) => (
                <button key={s.id} onClick={() => navigate('/targets')} className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2 text-left active:bg-gray-50">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white">
                    <SchoolLogo schoolId={s.id} name={s.name} size={26} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-800">{s.name}</span>
                    <span className="block truncate text-[11px] text-gray-400">{s.name_ko}</span>
                  </span>
                </button>
              ))}
              {targets.length > targetSchools.length && (
                <p className="text-center text-xs text-gray-400">{t(`외 ${targets.length - targetSchools.length}곳`, `+${targets.length - targetSchools.length} more`)}</p>
              )}
            </div>
          )}
        </div>

        {/* 다가오는 마감 */}
        <div className="mt-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">🗓️ {t('다가오는 마감', 'Upcoming deadlines')}</p>
          {deadlines.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5">
              {deadlines.map((d) => {
                const s = schools.find((x) => x.id === d.school_id)
                return (
                  <button key={`${d.school_id}-${d.round}`} onClick={() => navigate('/app/colleges')} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-left active:bg-gray-50">
                    <span className="truncate text-sm text-gray-700">{s?.name ?? `#${d.school_id}`}{d.round ? ` · ${roundLabels[d.round]}` : ''}</span>
                    <span className={`shrink-0 text-sm font-bold ${d.d <= 7 ? 'text-red-600' : 'text-gray-900'}`}>D-{d.d === 0 ? 'Day' : d.d}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">{t('학교별 ED/EA/RD 마감 시기를 한눈에 볼 수 있어요.', 'See every school’s ED/EA/RD deadline windows at a glance.')}</p>
          )}
          <button onClick={() => navigate('/deadlines')} className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50">
            {t('마감 목록 보기', 'Open the deadline list')}
          </button>
        </div>

        {/* 리포트 유도 — 작게, 하단에만 */}
        <button onClick={() => navigate('/report')} className="mt-6 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left active:bg-blue-100">
          <p className="text-sm font-semibold text-blue-900">📊 {t('입시 리포트 · 시즌 체크리스트', 'Admissions report · season checklist')}</p>
          <p className="mt-0.5 text-xs text-blue-800/70">{t('학년·전공을 알려주면 너에게 맞는 것만 골라서 보여줄게 (5분)', 'Tell us your grade and major, and we’ll show only what fits you (5 min)')}</p>
        </button>
      </div>
    </div>
  )
}
