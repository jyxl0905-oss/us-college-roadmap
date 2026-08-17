import { useEffect, useState } from 'react'
import type { ProfileRow } from '../lib/profile'
import { profileGrade } from '../lib/profile'
import { navigate } from '../lib/router'
import { supabase } from '../lib/supabase'
import AppShell from './AppShell'
import { loadAppRecords, ACTIVITY_MAX, HONOR_MAX, essayStatusKo, type AppRecords } from './appData'

const GUIDE_KEY = 'commonapp_guide_collapsed'

// ✍️ 승인된 작성 가이드 6줄 (VIRTUAL_COMMONAPP_SPEC §3)
const GUIDE = [
  '활동은 최대 10개, 중요한 순서대로 — 위에서부터 읽혀요',
  '설명 150자: 무엇을·어떻게·결과가 뭐였는지, 숫자가 있으면 숫자로',
  '수상은 최대 5개, 인정 범위(교내→국제)를 정확히',
  '시험 점수는 학교마다 제출 정책이 달라요 — 리포트의 시험 정책 칩 확인',
  '지원 라운드는 ED 1곳·REA 규칙을 지키고, 마감은 반드시 공식 페이지에서 최종 확인',
  '에세이는 원서 시즌 전에 초안 — 12학년 가을은 시간이 없어요',
]

interface AppHomeProps {
  userId: string
  profile: ProfileRow
}

// F5 내 원서 홈 — 5개 섹션 채움 정도 + 짧은 작성 가이드
export default function AppHome({ userId, profile }: AppHomeProps) {
  const [rec, setRec] = useState<AppRecords | null>(null)
  const [appCount, setAppCount] = useState<{ total: number; assigned: number }>({ total: 0, assigned: 0 })
  const [guideOpen, setGuideOpen] = useState(() => localStorage.getItem(GUIDE_KEY) !== '1')

  useEffect(() => {
    loadAppRecords(userId).then(setRec)
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
        { path: '/app/activities', emoji: '🏃', title: '활동 · 수상', sub: `활동 ${rec.activities.length}/${ACTIVITY_MAX} · 수상 ${rec.honors.length}/${HONOR_MAX}`, pct: Math.min(1, (rec.activities.length / ACTIVITY_MAX + rec.honors.length / HONOR_MAX) / 2) },
        { path: '/app/testing', emoji: '✏️', title: '시험', sub: rec.tests.length > 0 ? `기록 ${rec.tests.length}건` : '아직 기록 없음', pct: rec.tests.length > 0 ? 1 : 0 },
        { path: '/app/education', emoji: '📚', title: '학업', sub: `${grade}학년 · GPA ${profile.gpa_band ?? '미입력'} · 과목 ${rec.courses.length}개`, pct: profile.gpa_band ? (rec.courses.length > 0 ? 1 : 0.5) : 0 },
        { path: '/app/colleges', emoji: '🎯', title: '지원 학교', sub: targetCount > 0 ? `목표 ${targetCount}곳 · 라운드 배정 ${appCount.assigned}곳` : '목표 학교를 먼저 정해요', pct: targetCount > 0 ? appCount.assigned / targetCount : 0 },
        { path: '/app/writing', emoji: '📝', title: '에세이', sub: rec.essays.length > 0 ? rec.essays.map((e) => essayStatusKo[e.status]).slice(0, 3).join(' · ') : '아직 없음', pct: rec.essays.length > 0 ? rec.essays.filter((e) => e.status === 'done').length / rec.essays.length : 0 },
      ]
    : []

  return (
    <AppShell tab="home" title="내 원서">
      <p className="mt-3 text-sm text-gray-500">
        실제 Common App 형식 그대로, {grade}학년부터 미리 채워두는 나만의 원서예요. 12학년 원서 시즌에 여기서 그대로 옮기면 돼요.
      </p>

      {!rec ? (
        <p className="mt-10 text-center text-gray-400">불러오는 중…</p>
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
          <span className="font-semibold text-gray-900">💡 Common App은 이렇게 채워요</span>
          <span className="text-sm text-gray-400">{guideOpen ? '접기' : '펼치기'}</span>
        </button>
        {guideOpen && (
          <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-gray-600">
            {GUIDE.map((g, i) => (
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
