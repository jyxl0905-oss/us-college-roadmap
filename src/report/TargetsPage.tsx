import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import { t, localizeRows } from '../i18n'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { tierLabels } from '../onboarding/labels'
import SchoolCards from './SchoolCards'
import AidRanking from './AidRanking'
import SchoolLogo from '../browse/SchoolLogo'
import FitPicker, { saveFit, fitChipColors } from '../browse/FitPicker'
import { fitLabels, normalizeFit, type Fit } from '../board/boardLogic'
import { dataFitOf } from '../lib/dataFit'

// 목표 학교 전용 페이지 — 상단 바에서 바로 진입 (리포트 스크롤 없이). 카드 내용은 리포트의 목표 학교 섹션과 동일
export default function TargetsPage({ userId, profile }: { userId: string; profile: ProfileRow }) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const [fits, setFits] = useState<Record<number, Fit | null>>({})
  const onboarded = profile.grad_year !== null

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('applications')
      .select('school_id,fit')
      .eq('user_id', userId)
      .then(({ data }) => {
        const m: Record<number, Fit | null> = {}
        for (const r of data ?? []) m[Number(r.school_id)] = normalizeFit(r.fit as string | null)
        setFits(m)
      })
  }, [userId])

  // 격차 제안 응답 기록 (강제 변경 없음 — 유지 선택도 기록)
  const recordDecision = async (schoolId: number, decision: 'kept' | 'reclassified') => {
    if (!supabase) return
    await supabase
      .from('predictions')
      .update({ decision, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .then(() => {}, () => {})
  }
  const [decided, setDecided] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!supabase) return
    const q =
      profile.target_mode === 'schools' && profile.target_school_ids.length > 0
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : profile.target_mode === 'tier' && profile.target_tier
          ? supabase.from('schools').select('*').eq('tier', profile.target_tier)
          : null
    if (!q) { setSchools([]); return }
    q.then(({ data }) => setSchools(localizeRows((data ?? []) as School[]).sort((a, b) => a.usnews_rank - b.usnews_rank)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (schools === null) return <p className="mt-20 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 md:max-w-5xl">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">🎯 {t('내 목표 학교', 'My target schools')}</h1>
          <span className="text-xs text-gray-400">
            {profile.target_mode === 'tier' && profile.target_tier
              ? tierLabels[profile.target_tier]
              : t(`${schools.length}개`, `${schools.length} school${schools.length === 1 ? '' : 's'}`)}
          </span>
        </div>

        {schools.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-gray-300 bg-white px-5 py-8 text-center">
            <p className="text-sm text-gray-500">{t('아직 목표 학교가 없어요.', 'No target schools yet.')}</p>
            <button onClick={() => navigate('/schools')} className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white active:bg-blue-700">
              {t('대학 둘러보고 담기', 'Browse and add colleges')}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              <button onClick={() => navigate('/schools')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50">
                🔍 {t('둘러보기 · 추가/제거', 'Browse · add/remove')}
              </button>
              {schools.length >= 2 && (
                <button
                  onClick={() => navigate(`/compare?ids=${schools.slice(0, 3).map((s) => s.id).join(',')}`)}
                  className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50"
                >
                  ⚖️ {t('비교하기', 'Compare')}
                </button>
              )}
              <button onClick={() => navigate('/map')} className="rounded-full border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50">
                🗺️ {t('지도로 보기', 'Map view')}
              </button>
              <button onClick={() => navigate('/app/colleges')} className="rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 active:bg-blue-100">
                📋 {t('지원 라운드 정하기', 'Set rounds')}
              </button>
            </div>
            {/* 티어(예측) — 학교 추가 시 직접 고르는 분류. 지원 보드(applications.fit)와 같은 값을 공유 */}
            <div className="mt-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
              <p className="font-semibold text-gray-900">{t('네 생각엔 이 학교, 너한테 뭐야?', 'Your call — what is each school to you?')}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {onboarded
                  ? t('직접 고른 분류예요. 데이터 기준(SAT 중간50%·국제학생 합격률 기반 참고치)과 다르면 알려줄게요 — 바꿀지는 네가 정해.', 'Your own call. If the data-based reference (SAT mid-50% · intl accept rate) differs, we’ll say so — changing it is up to you.')
                  : t('직접 고르는 분류예요 — 툴은 합격 가능성을 계산하지 않아요.', 'You pick these yourself — the tool does not estimate admission chances.')}
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {schools.map((s) => {
                  const myFit = fits[s.id] ?? null
                  const dFit = onboarded ? dataFitOf(profile, s) : null
                  const gap = myFit !== null && dFit !== null && myFit !== dFit && !decided[s.id]
                  return (
                    <div key={s.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white">
                          <SchoolLogo schoolId={s.id} name={s.name} size={26} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{s.name}</span>
                        {myFit && <span className={`shrink-0 rounded-full border-2 px-2 py-0.5 text-[11px] font-semibold ${fitChipColors[myFit]}`}>{fitLabels[myFit]}</span>}
                      </div>
                      <div className="mt-2">
                        <FitPicker userId={userId} schoolId={s.id} value={myFit} dataFit={dFit}
                          onSaved={(f) => { setFits((m) => ({ ...m, [s.id]: f })); setDecided((d) => ({ ...d, [s.id]: false })) }} />
                      </div>
                      {/* 데이터 기준 — 온보딩 전엔 미공개 (궁금증이 게이트를 열게) */}
                      {!onboarded && myFit && (
                        <p className="mt-2 text-xs text-gray-400">
                          {t(`네 예측: ${fitLabels[myFit]} · 데이터 기준은?`, `Your call: ${fitLabels[myFit]} · and the data?`)}{' '}
                          <button onClick={() => navigate('/report')} className="text-blue-600 underline">{t('프로필 완성하면 공개', 'Complete your profile to see')}</button>
                        </p>
                      )}
                      {onboarded && dFit !== null && myFit !== null && myFit === dFit && (
                        <p className="mt-2 text-xs text-gray-400">{t(`데이터 기준도 ${fitLabels[dFit]} — 일치해요`, `The data-based reference agrees: ${fitLabels[dFit]}`)}</p>
                      )}
                      {onboarded && gap && dFit !== null && (
                        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          {t(`데이터 기준으론 ${fitLabels[dFit]}야. 재분류할래?`, `The data-based reference says ${fitLabels[dFit]}. Reclassify?`)}
                          <span className="mt-1.5 flex gap-1.5">
                            <button
                              onClick={async () => { const ok = await saveFit(userId, s.id, dFit, dFit); if (ok) { await recordDecision(s.id, 'reclassified'); setFits((m) => ({ ...m, [s.id]: dFit })); setDecided((d) => ({ ...d, [s.id]: true })) } }}
                              className="rounded-full border-2 border-gray-300 bg-white px-2.5 py-1 font-semibold text-gray-700 active:bg-gray-50"
                            >{t(`${fitLabels[dFit]}로 바꾸기`, `Change to ${fitLabels[dFit]}`)}</button>
                            <button
                              onClick={async () => { await recordDecision(s.id, 'kept'); setDecided((d) => ({ ...d, [s.id]: true })) }}
                              className="rounded-full px-2.5 py-1 text-gray-500 underline"
                            >{t('내 예측 유지', 'Keep my call')}</button>
                          </span>
                        </div>
                      )}
                      {onboarded && myFit !== null && dFit === null && (
                        <p className="mt-2 text-xs text-gray-400">{t('데이터 기준: SAT 점수(응시 후 밴드 입력)와 학교 공개 데이터가 있어야 계산돼요', 'Data reference needs your SAT band and the school’s published data')}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 데스크톱(md+): 왼쪽 = 재정지원 순위(고정), 오른쪽 = 목표 학교 카드 — 모바일은 세로 */}
            <div className="mt-4 md:grid md:grid-cols-5 md:items-start md:gap-6">
              <div className="md:col-span-2 md:sticky md:top-16">
                <AidRanking schools={schools} status={profile.applicant_status === 'domestic' ? 'domestic' : 'intl'} />
              </div>
              <div className="mt-4 md:col-span-3 md:mt-0">
              <SchoolCards
                schools={schools}
                satBand={profile.sat_status === 'taken' ? profile.sat_band : null}
                majorPrimary={profile.major_primary}
              />
            </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              {t('학교 추가·제거는 둘러보기의 각 학교 카드에서, 지원 라운드는 내 원서 → 지원에서 정해요. 티어(Reach/Hard Target/Target/Safety)는 위에서 바로 고를 수 있어요.', 'Add or remove schools from each card in Browse; set rounds in My App → Colleges. Pick tiers (Reach/Hard Target/Target/Safety) right above.')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
