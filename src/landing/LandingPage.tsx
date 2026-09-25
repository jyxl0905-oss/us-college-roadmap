import { useState } from 'react'
import { t } from '../i18n'
import { supabase } from '../lib/supabase'
import { navigate } from '../lib/router'
import SchoolLogo from '../browse/SchoolLogo'
import schoolsIndex from '../data/schools.index.json'
import type { School } from '../lib/types'
import { majorCategories } from '../data/majors'
import apData from '../data/ap.json'
import RadarChart from '../report/RadarChart'
import type { AxisScores } from '../lib/score'
import { Check, Eye, ShieldCheck, ClipboardCheck, FileText, Landmark, Compass, Share2 } from 'lucide-react'
import { GradePeek, Facts, PainAndFaq, StickyCta, WhyFree } from './LandingSections'

// 훅 랜딩 — 비로그인 첫 화면. 원칙: 유학원 광고처럼 보이면 실패 (과장·그라디언트·카운트다운 금지).
// 수치는 전부 실데이터(공식 출처 시드)에서만. CTA는 구글 로그인 + 로그인 없는 체험.
// 2026-09 리디자인: 좌(메시지·버튼) / 우(리포트 미리보기) + 숫자 띠 + 기능 3개
const schools = schoolsIndex as School[]
const majorCount = majorCategories.length
const apCount = (apData as { courses: { status: string }[] }).courses.filter((c) => c.status !== 'pilot').length
// 미리보기 차트: 체험 모드(/demo) 예시 학생과 같은 점수 — '예시' 라벨로만 표시
const SAMPLE_SCORES: AxisScores = { rigor: 77, testing: 55, spike: 45, leadership: 45, validation: 20, story: 0 }

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
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          onClick={() => void googleLogin()}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gray-900 px-5 py-4 text-[15px] font-bold text-white active:bg-gray-800"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white"><GoogleIcon /></span>
          {t('Google로 시작하기', 'Start with Google')}
        </button>
        <button
          onClick={() => navigate('/demo')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[15px] font-bold text-gray-900 active:bg-gray-50"
        >
          <Eye size={18} strokeWidth={1.9} />
          {t('로그인 없이 전체 체험하기', 'Try it all — no login')}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">{t('예시 학생(11학년·CS 지망)의 리포트와 내 원서 전체를 로그인 없이 둘러볼 수 있어요.', 'Browse a sample student’s full report and application workspace (grade 11, CS) without signing in.')}</p>
      <p className="mt-1 text-center text-xs text-gray-500">{t('학부모님도 쓸 수 있어요 — 시작할 때 "부모님이에요"를 고르면 자녀의 성적·과목을 기록하고 자녀의 위치를 볼 수 있어요.', 'Parents welcome — choose “I’m a parent” to track your child’s grades and courses and see where they stand.')}</p>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </>
  )

  // 실데이터 미리보기: 둘러보기와 동일한 시드에서 상위 3곳
  const preview = schools.filter((s) => (s.kind ?? 'university') === 'university').sort((a, b) => (a.usnews_rank ?? 9999) - (b.usnews_rank ?? 9999)).slice(0, 3)

  const stats: [string, string, string][] = [
    [`${schools.length}+`, t('대학 공식 데이터', 'colleges, official data'), '/schools'],
    [`${majorCount}+`, t('전공 가이드', 'major guides'), '/majors'],
    [`${apCount}+`, t('AP 과목 가이드', 'AP course guides'), '/guide/ap'],
    [t('0원', '$0'), t('전 기능 무료', 'everything free'), ''],
  ]

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 pb-12 pt-8 md:max-w-6xl md:px-10 md:pt-14">
        {/* 1. 히어로 — 좌: 메시지·버튼 / 우: 리포트 미리보기 */}
        <div className="md:grid md:grid-cols-[1.05fr_1fr] md:items-center md:gap-14">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-700">
              <Check size={14} strokeWidth={2.4} />
              {t('전 기능 무료 · 광고 없음 · 유료 전환 없음', 'Everything free · no ads · no paid tier')}
            </span>
            <h1 className="mt-5 text-[32px] font-extrabold leading-[1.2] tracking-[-0.035em] text-gray-900 md:text-[52px] md:leading-[1.15]">
              {t('카운슬러 없이도,', 'No counselor? No problem —')}
              <br />
              <span className="text-blue-600">{t('4년 입시', 'four years of admissions')}</span>{t('를', ',')}
              <br />
              {t('혼자 관리할 수 있게.', 'managed on your own.')}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600 md:mt-5 md:max-w-lg md:text-[17px]">
              {t('학년·전공·목표 학교에 맞춘 시즌별 체크리스트와 리포트. 활동·수상은 지금부터 기록해 두고, 12학년엔 옮겨 적기만 하면 돼요.', 'Season-by-season checklists and reports tailored to your grade, major and target schools. Log activities and honors from today — in senior year, just copy them over.')}
            </p>
            <div id="hero-cta" className="mt-6 md:mt-8">{cta}</div>
            <p className="mt-4 flex items-start gap-1.5 text-[13px] leading-relaxed text-gray-500">
              <ShieldCheck size={16} strokeWidth={1.9} className="mt-px shrink-0" />
              {t('대학 데이터는 Common Data Set·College Board·각 대학 입학처 공식 자료만 사용해요. 컨설팅은 비싸고 합격을 보장하지 않아요 — 필요한 건 정보와 기록이에요.', 'College data comes only from Common Data Sets, the College Board and official admissions pages. Consulting is expensive and guarantees nothing — what you need is information and a record.')}
            </p>
          </div>

          {/* 리포트 미리보기 (예시 학생) */}
          <div className="relative mt-8 md:mt-0">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-bold text-gray-900">{t('6축 밸런스 리포트', '6-axis balance report')}</p>
                <p className="text-xs text-gray-400">{t('예시 학생 · 11학년 · 컴퓨터과학', 'Sample student · grade 11 · CS')}</p>
              </div>
              <RadarChart scores={SAMPLE_SCORES} />
            </div>
            <div className="absolute -right-3 -top-5 hidden w-48 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 md:block">
              <p className="text-[11px] font-semibold text-gray-400">{t('이번 시즌 체크리스트', "This season's checklist")}</p>
              <p className="mt-0.5 text-[22px] font-extrabold text-gray-900">3 / 9</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-1/3 rounded-full bg-blue-500" /></div>
            </div>
            <div className="absolute -left-8 bottom-6 hidden w-52 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 md:block">
              <p className="text-[11px] font-semibold text-gray-400">{t('목표 학교', 'Target schools')}</p>
              <p className="mt-0.5 text-[22px] font-extrabold text-gray-900">{t('5곳', '5')}</p>
              <p className="truncate text-[11px] text-gray-400">CMU · UCLA · Georgia Tech …</p>
            </div>
          </div>
        </div>

        {/* 2. 숫자 띠 — 전부 실제 데이터 개수 */}
        <div className="mt-10 grid grid-cols-2 gap-y-5 rounded-3xl bg-gray-900 px-2 py-6 text-center text-white md:mt-16 md:grid-cols-4 md:py-7">
          {stats.map(([n, label, to], i) => (
            <button key={i} onClick={to ? () => navigate(to) : undefined} disabled={!to} className={`${i % 2 === 1 ? 'border-l border-white/10' : ''} ${i >= 1 ? 'md:border-l md:border-white/10' : ''} px-2`}>
              <span className="block text-[28px] font-extrabold tracking-tight md:text-[34px]">{n}</span>
              <span className="text-xs text-blue-100/70 md:text-[13px]">{label}</span>
            </button>
          ))}
        </div>

        {/* 새 섹션 01·02 — 내 학년 맛보기 + 알고 계셨나요 (2026-09) */}
        <div className="mt-16 md:mt-24"><GradePeek onStart={() => void googleLogin()} /></div>
        <div className="mt-16 md:mt-24"><Facts /></div>
        <div className="mt-16 md:mt-24"><WhyFree /></div>

        {/* 3. 핵심 기능 3개 */}
        <div className="mt-16 grid grid-cols-1 gap-4 md:mt-24 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClipboardCheck size={20} strokeWidth={1.9} /></span>
            <p className="mt-3.5 font-bold text-gray-900">{t('시즌별 체크리스트·리포트', 'Seasonal checklist & report')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{t('가을·봄·여름마다 학년과 전공에 맞춰 지금 해야 할 일만 보여주고, 6축 밸런스로 약한 부분을 짚어줘요.', 'Each fall, spring and summer you see only what to do now for your grade and major, with a 6-axis balance check.')}</p>
          </div>

          <div id="feature-app" className="rounded-2xl border-2 border-gray-200 bg-white p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText size={20} strokeWidth={1.9} /></span>
            <p className="mt-3.5 font-bold text-gray-900">{t('내 원서 (가상 Common App)', 'My App (a practice Common App)')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{t("실제 원서 형식 그대로 미리 기록해 두세요 — '9학년 때 뭐 했더라?'를 막아드려요.", "Log everything in the real application's format — no more \"what did I even do in 9th grade?\"")}</p>
            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-left">
              <p className="text-[11px] text-gray-400">{t('활동 (Activities) · 예시', 'Activities · example')}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{t('부회장 — 학교 로봇공학 동아리', 'Vice president — school robotics club')}</p>
              <p className="text-xs text-gray-500">{t('10·11학년 · 주 4시간 · 지역 대회 준비', 'Grades 10–11 · 4 hrs/wk · regional competition prep')}</p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Landmark size={20} strokeWidth={1.9} /></span>
            <p className="mt-3.5 font-bold text-gray-900">{t(`대학 ${schools.length}곳 공식 데이터`, `Official data on ${schools.length} colleges`)}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{t('합격률·SAT·ED·마감·장학금을 공식 출처로만 정리하고, 비교·지도로 볼 수 있어요.', 'Acceptance rates, SAT, ED, deadlines and aid — official sources only, with compare and map views.')}</p>
            <div className="mt-3 divide-y divide-gray-100 rounded-xl bg-gray-50">
              {preview.map((s) => (
                <button key={s.id} onClick={() => navigate('/schools')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                    <SchoolLogo schoolId={s.id} name={s.name} size={22} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-800">{s.name}</span>
                  {s.overall_accept_rate != null && <span className="text-[12px] text-gray-500">{s.overall_accept_rate}%</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 새 섹션 03·04 — 이런 고민이라면 + 자주 묻는 질문 */}
        <div className="mt-16 md:mt-24"><PainAndFaq /></div>

        {/* 4. 전공·가이드 바로가기 + 공유 */}
        <div className="mt-16 grid grid-cols-1 md:mt-24 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
            <p className="flex items-center gap-2 font-bold text-gray-900"><Compass size={18} strokeWidth={1.9} className="text-blue-600" />{t('전공·과목 가이드', 'Major & course guides')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{t('전공별 추천 AP·4년 로드맵·직업 전망(미 노동통계국), 학년별 수업 난이도와 AP 과목 가이드까지.', 'Per-major APs, 4-year roadmaps and career outlooks (BLS), plus course-rigor and AP guides.')}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => navigate('/majors')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('전공 알아보기', 'Majors')}</button>
              <button onClick={() => navigate('/guide/ap')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('AP 가이드', 'AP guide')}</button>
              <button onClick={() => navigate('/guide/courses')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('수업 난이도', 'Course rigor')}</button>
              <button onClick={() => navigate('/majors/trends')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('전공 트렌드', 'Major trends')}</button>
              <button onClick={() => navigate('/guide/english')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('영어 시험', 'English tests')}</button>
              <button onClick={() => navigate('/guide/programs')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('대회·서머', 'Programs')}</button>
              <button onClick={() => navigate('/guide/cost')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('비용·재정지원', 'Cost & aid')}</button>
              <button onClick={() => navigate('/map')} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-50">{t('대학 지도', 'College map')}</button>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
            <p className="font-bold text-gray-900">{t('혼자 미국 대입을 준비하는 학생들을 위한 툴이에요', 'Built for students preparing on their own')}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{t('주변에 필요한 학생이 있다면 이 페이지를 공유해 주세요.', 'If you know a student who needs this, please share this page.')}</p>
            <button onClick={() => void share()} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 active:bg-gray-50">
              {shared ? <Check size={14} strokeWidth={2.4} /> : <Share2 size={14} strokeWidth={2} />}
              {shared ? t('링크 복사됨', 'Link copied') : t('공유하기', 'Share')}
            </button>
          </div>
        </div>

        {/* 5. 마지막 CTA — 남색 블록 */}
        <div id="final-cta" className="mt-16 rounded-3xl bg-gray-900 px-6 py-12 text-center text-white md:mt-24 md:py-16">
          <p className="text-[26px] font-bold leading-tight tracking-[-0.035em] md:text-[38px]">
            {t('4년의 입시,', 'Four years of admissions,')} <span className="font-light text-blue-200/80">{t('이번 시즌부터.', 'starting this season.')}</span>
          </p>
          <p className="mt-3 text-sm text-blue-100/70 md:text-base">{t('지금 학년에 맞는 체크리스트를 무료로 받아보세요.', 'Get the checklist for your grade — free.')}</p>
          <div className="mx-auto mt-7 flex max-w-md flex-col gap-2.5 sm:flex-row">
            <button onClick={() => void googleLogin()} className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-white px-5 py-3.5 text-[15px] font-bold text-gray-900 active:bg-gray-100">
              <GoogleIcon />
              {t('Google로 시작하기', 'Start with Google')}
            </button>
            <button onClick={() => navigate('/demo')} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-3.5 text-[15px] font-semibold text-white active:bg-white/10">
              <Eye size={18} strokeWidth={1.9} />
              {t('로그인 없이 체험하기', 'Try it — no login')}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button onClick={onEmailLogin} className="mt-6 text-xs text-blue-100/60 underline">
            {t('기존 이메일 계정으로 로그인', 'Log in with an existing email account')}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          <button onClick={() => navigate('/about')} className="underline">{t('서비스 소개 · 데이터 출처와 원칙', 'About · data sources & principles')}</button>
        </p>
      </div>
      <StickyCta anchorId="hero-cta" endId="final-cta" onStart={() => void googleLogin()} googleIcon={<GoogleIcon />} />
    </div>
  )
}
