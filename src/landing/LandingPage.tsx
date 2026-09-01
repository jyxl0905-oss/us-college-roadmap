import { useState } from 'react'
import { t } from '../i18n'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import SchoolLogo from '../browse/SchoolLogo'
import schoolsIndex from '../data/schools.index.json'
import type { School } from '../lib/types'

// 훅 랜딩 — 비로그인 첫 화면. 원칙: 유학원 광고처럼 보이면 실패 (과장·그라디언트·카운트다운 금지).
// 수치는 전부 실데이터(공식 출처 시드)에서만. CTA는 구글 로그인 하나.
const schools = schoolsIndex as School[]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
  )
}

export default function LandingPage({ onEmailLogin }: { onEmailLogin: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false) // 링크 복사 피드백

  const googleLogin = async () => {
    if (!supabase) return
    setError(null)
    try { localStorage.removeItem('post_login_path') } catch { /* ignore */ }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://uscollegeroadmap.com' },
    })
    if (error) setError(t('구글 로그인이 지금은 안 돼요 — 아래의 이메일 로그인을 이용해 주세요.', 'Google sign-in is unavailable right now — please use email login below.'))
  }

  // 공유하기 — 폰이면 시스템 공유 시트, 아니면 링크 복사
  const share = async () => {
    const url = 'https://uscollegeroadmap.com'
    const data = { title: t('미국 대입 로드맵', 'US College Roadmap'), text: t('혼자 미국 대입을 준비하는 학생들을 위한 무료 툴', 'A free tool for students preparing for US college admissions on their own'), url }
    if (navigator.share) {
      try { await navigator.share(data) } catch { /* 사용자가 취소 */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    } catch { /* 클립보드 미지원 */ }
  }

  const cta = (
    <>
      <button
        onClick={() => void googleLogin()}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gray-900 px-4 py-4 font-semibold text-white active:bg-gray-700"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white"><GoogleIcon /></span>
        {t('Google로 시작하기', 'Start with Google')}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </>
  )

  // 실데이터 미리보기: 둘러보기와 동일한 시드에서 상위 3곳
  const preview = schools.filter((s) => (s.kind ?? 'university') === 'university').sort((a, b) => a.usnews_rank - b.usnews_rank).slice(0, 3)
  const univCount = schools.filter((s) => (s.kind ?? 'university') === 'university').length
  const lacCount = schools.filter((s) => s.kind === 'lac').length

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-10 md:max-w-lg">
        {/* 0. 무료 라인 — 최상단, 제일 잘 보이게 */}
        <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-center text-sm font-bold text-blue-700">
          {t('전 기능 무료 · 광고 없음 · 유료 전환 없음', 'Everything free · no ads · no paid tier')}
        </p>

        {/* 1. 헤드라인 */}
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="mt-6 h-14 w-14 rounded-2xl shadow-sm" />
        <h1 className="mt-5 text-[26px] font-bold leading-snug text-gray-900">
          {t('활동·수상, 지금부터 기록해두세요.', 'Log your activities and honors from today.')}
          <br />
          {t('12학년엔 옮겨 적기만 하면 됩니다.', 'Senior year, you just copy them over.')}
        </h1>

        {/* 2. 대비 문구 */}
        <p className="mt-4 font-medium text-gray-700">{t('고액 컨설팅 없이도, 혼자서도 관리할 수 있게 만들었어요.', 'Built so you can manage it yourself — no expensive consulting required.')}</p>
        <p className="mt-1 text-sm text-gray-500">
          {t('컨설팅은 비싸고, 합격을 보장하지도 않습니다. 필요한 건 정보와 기록입니다.', "Consulting is expensive and guarantees nothing. What you need is information and a record.")}
        </p>

        {/* 공유 요청 — 첫 화면에서 바로 보이게 */}
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-relaxed text-blue-900">
          {t('혼자 미국 대입을 준비하는 학생들을 위한 툴입니다.', 'A tool for students preparing for US college admissions on their own.')}
          <br />
          {t('주변에 필요한 학생이 있다면 이 페이지를 공유해주세요.', 'If you know a student who needs this, please share this page.')}{' '}
          <button onClick={() => void share()} className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700 active:bg-blue-50">
            {shared ? t('링크 복사됨 ✓', 'Link copied ✓') : t('🔗 공유하기', '🔗 Share')}
          </button>
        </div>

        <div className="mt-5">{cta}</div>

        {/* 3. 핵심 기능 3개 */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">📋 {t('내 원서 (가상 Common App)', 'My App (a practice Common App)')}</p>
            <p className="mt-0.5 text-sm text-gray-500">{t("실제 원서 형식 그대로 미리 기록해 두세요 — '9학년 때 뭐 했더라?'를 막아드려요.", "Log everything in the real application's format — no more \"what did I even do in 9th grade?\"")}</p>
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left">
              <p className="text-[11px] text-gray-400">{t('활동 (Activities) · 예시', 'Activities · example')}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{t('부회장 — 학교 로봇공학 동아리', 'Vice president — school robotics club')}</p>
              <p className="text-xs text-gray-500">{t('10·11학년 · 주 4시간 · 지역 대회 준비', 'Grades 10–11 · 4 hrs/wk · regional competition prep')}</p>
              <div className="mt-2 h-1.5 w-2/3 rounded bg-gray-200" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-gray-200" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">🎓 {t(`대학 ${univCount + lacCount}+ 공식 데이터`, `Official data on ${univCount + lacCount}+ colleges`)}</p>
            <p className="mt-0.5 text-sm text-gray-500">{t('합격률·SAT·ED·마감일을 전부 공식 출처(CDS)로만 정리했어요.', 'Acceptance rates, SAT, ED, deadlines — official sources (CDS) only.')}</p>
            <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {preview.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white">
                    <SchoolLogo schoolId={s.id} name={s.name} size={26} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-800">{s.name}</span>
                    <span className="block text-[11px] text-gray-400">US News #{s.usnews_rank}{s.overall_accept_rate != null ? t(` · 합격률 ${s.overall_accept_rate}%`, ` · ${s.overall_accept_rate}% accepted`) : ''}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">🧭 {t('전공 70+ 가이드 + 대학 지도', '70+ major guides + the college map')}</p>
            <p className="mt-0.5 text-sm text-gray-500">{t('전공별 추천 AP·4년 로드맵·직업 전망(미 노동통계국)에 미국 지도 위 대학 위치까지 볼 수 있어요.', 'Per-major APs, 4-year roadmaps, career outlooks (BLS) — and every college on a US map.')}</p>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => navigate('/majors')} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 active:bg-gray-50">{t('전공 구경하기', 'Browse majors')}</button>
              <button onClick={() => navigate('/schools')} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 active:bg-gray-50">{t('대학 구경하기', 'Browse colleges')}</button>
            </div>
          </div>
        </div>

        {/* 4. 신뢰 라인 + 공유 요청 + 5. CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm font-semibold text-gray-700">{t('전 기능 무료 · 광고 없음 · 유료 전환 없음', 'Everything free · no ads · no paid tier')}</p>
          <div className="mt-5">{cta}</div>
          <button onClick={onEmailLogin} className="mt-5 text-xs text-gray-400 underline">
            {t('기존 이메일 계정으로 로그인', 'Log in with an existing email account')}
          </button>
        </div>
      </div>
    </div>
  )
}
