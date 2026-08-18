import { useEffect, useState } from 'react'
import type { ProfileRow } from '../lib/profile'
import { profileGrade } from '../lib/profile'
import { navigate } from '../lib/router'
import { supabase } from '../lib/supabase'
import AppShell from './AppShell'
import { t } from '../i18n'
import { loadAppRecords, ACTIVITY_MAX, HONOR_MAX, essayStatusKo, type AppRecords } from './appData'
import { loadPlans, cycleSeasons, type Plan } from './plans'

const GUIDE_KEY = 'commonapp_guide_collapsed'

// ✍️ 승인된 작성 가이드 6줄 (VIRTUAL_COMMONAPP_SPEC §3)
const GUIDE = () => [
  t('활동은 최대 10개, 중요한 순서대로 — 위에서부터 읽혀요', 'Up to 10 activities, most important first — readers start from the top'),
  t('설명 150자: 무엇을·어떻게·결과가 뭐였는지, 숫자가 있으면 숫자로', '150-character description: what, how, and the result — use numbers when you have them'),
  t('수상은 최대 5개, 인정 범위(교내→국제)를 정확히', 'Up to 5 honors, with the exact level of recognition (school → international)'),
  t('시험 점수는 학교마다 제출 정책이 달라요 — 리포트의 시험 정책 칩 확인', 'Test-score policies differ by school — check the test policy chip in your report'),
  t('지원 라운드는 ED 1곳·REA 규칙을 지키고, 마감은 반드시 공식 페이지에서 최종 확인', 'Follow the ED (one school) and REA rules, and always confirm deadlines on the official page'),
  t('에세이는 원서 시즌 전에 초안 — 12학년 가을은 시간이 없어요', 'Draft essays before application season — there is no time in fall of 12th grade'),
]

interface AppHomeProps {
  userId: string
  profile: ProfileRow
}

// F5 내 원서 홈 — 5개 섹션 채움 정도 + 짧은 작성 가이드
export default function AppHome({ userId, profile }: AppHomeProps) {
  const [rec, setRec] = useState<AppRecords | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [appCount, setAppCount] = useState<{ total: number; assigned: number }>({ total: 0, assigned: 0 })
  const [guideOpen, setGuideOpen] = useState(() => localStorage.getItem(GUIDE_KEY) !== '1')

  useEffect(() => {
    loadAppRecords(userId).then(setRec)
    loadPlans(userId).then(setPlans)
    if (supabase) {
      supabase
        .from('applications')
        .select('school_id, round')
        .eq('user_id', userId)
        .then(({ data }) => {
          const rows = data ?? []
          setAppCount({ total: rows.length, assigned: rows.filter((r) => r.round).length })
        })
    }
  }, [userId])

  const grade = profileGrade(profile)
  const targetCount = profile.target_mode === 'schools' ? profile.target_school_ids.length : 0

  const sections = rec
    ? [
        (() => {
          const cyc = cycleSeasons().map((s) => s.label)
          const mine = plans.filter((p) => cyc.includes(p.season_label))
          const done = mine.filter((p) => p.status === 'done').length
          return { path: '/app/plans', emoji: '🗓️', title: t('내 계획', 'My plans'), sub: mine.length > 0 ? t(`이번 학년도 ${mine.length}개 · 완료 ${done}`, `${mine.length} this school year · ${done} done`) : t('계획을 적으면 6축에 점선으로', 'Add plans to see them as a dashed line on the 6 axes'), pct: mine.length > 0 ? done / mine.length : 0 }
        })(),
        { path: '/app/activities', emoji: '🏃', title: t('활동 · 수상', 'Activities · Honors'), sub: t(`활동 ${rec.activities.length}/${ACTIVITY_MAX} · 수상 ${rec.honors.length}/${HONOR_MAX}`, `Activities ${rec.activities.length}/${ACTIVITY_MAX} · Honors ${rec.honors.length}/${HONOR_MAX}`), pct: Math.min(1, (rec.activities.length / ACTIVITY_MAX + rec.honors.length / HONOR_MAX) / 2) },
        { path: '/app/testing', emoji: '✏️', title: t('시험', 'Testing'), sub: rec.tests.length > 0 ? t(`기록 ${rec.tests.length}건`, `${rec.tests.length} score${rec.tests.length === 1 ? '' : 's'} recorded`) : t('아직 기록 없음', 'No scores yet'), pct: rec.tests.length > 0 ? 1 : 0 },
        { path: '/app/education', emoji: '📚', title: t('학업', 'Education'), sub: t(`${grade}학년 · GPA ${profile.gpa_band ?? '미입력'} · 과목 ${rec.courses.length}개`, `Grade ${grade} · GPA ${profile.gpa_band ?? 'not set'} · ${rec.courses.length} course${rec.courses.length === 1 ? '' : 's'}`), pct: profile.gpa_band ? (rec.courses.length > 0 ? 1 : 0.5) : 0 },
        { path: '/app/colleges', emoji: '🎯', title: t('지원 학교', 'My colleges'), sub: targetCount > 0 ? t(`목표 ${targetCount}곳 · 라운드 배정 ${appCount.assigned}곳`, `${targetCount} target${targetCount === 1 ? '' : 's'} · ${appCount.assigned} assigned a round`) : t('목표 학교를 먼저 정해요', 'Pick your target schools first'), pct: targetCount > 0 ? appCount.assigned / targetCount : 0 },
        { path: '/app/writing', emoji: '📝', title: t('에세이', 'Essays'), sub: rec.essays.length > 0 ? rec.essays.map((e) => essayStatusKo[e.status]).slice(0, 3).join(' · ') : t('아직 없음', 'None yet'), pct: rec.essays.length > 0 ? rec.essays.filter((e) => e.status === 'done').length / rec.essays.length : 0 },
      ]
    : []

  return (
    <AppShell tab="home" title={t('내 원서', 'My application')}>
      <p className="mt-3 text-sm text-gray-500">
        {t(`실제 Common App 형식 그대로, ${grade}학년부터 미리 채워두는 나만의 원서예요. 12학년 원서 시즌에 여기서 그대로 옮기면 돼요.`, `Your own application in the real Common App format, filled in ahead of time from grade ${grade}. In 12th-grade application season, just copy it over.`)}
      </p>

      {!rec ? (
        <p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          {sections.map((s) => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left active:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">
                  {s.emoji} {s.title}
                </p>
                <span className="text-gray-300">›</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{s.sub}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round(s.pct * 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 작성 가이드 */}
      <div className="mt-6 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
        <button
          onClick={() => {
            const next = !guideOpen
            setGuideOpen(next)
            localStorage.setItem(GUIDE_KEY, next ? '0' : '1')
          }}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-semibold text-gray-900">{t('💡 Common App은 이렇게 채워요', '💡 How to fill in the Common App')}</span>
          <span className="text-sm text-gray-400">{guideOpen ? t('접기', 'Collapse') : t('펼치기', 'Expand')}</span>
        </button>
        {guideOpen && (
          <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-gray-600">
            {GUIDE().map((g, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-semibold text-blue-600">{i + 1}.</span>
                <span>{g}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  )
}
