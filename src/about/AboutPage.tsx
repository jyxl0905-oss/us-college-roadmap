import { useEffect } from 'react'
import { ShieldCheck, Pin, Database, Ban, Lock, RefreshCw, Users, HeartHandshake } from 'lucide-react'
import { t, getLang } from '../i18n'
import { goBack, navigate } from '../lib/router'

// 서비스 소개 — 목적·대상·데이터 출처·설계 원칙·하지 않는 것·개인정보 (사용자 승인 문구)
const SOURCES: { name: string; name_en?: string; ko: string; en: string }[] = [
  { name: 'Common Data Set', ko: '각 대학이 매년 공시하는 표준 자료 — SAT 중간 50%, 합격률, 평가 요소(C7), 국제학생 재정지원(H6)', en: 'Each college’s annual standardized disclosure — SAT middle 50%, admit rates, admission factors (C7), international aid (H6)' },
  { name: '각 대학 공식 입학처·교무처', name_en: 'Official college admissions & registrar pages', ko: '마감 시기, 에세이 문항, 영어 시험 기준·면제, AP 학점 인정, 1년 비용, 전공 직접 입학', en: 'Deadlines, essay prompts, English test rules and waivers, AP credit, cost of attendance, direct admission' },
  { name: 'College Scorecard', ko: '미국 교육부 — 전체 합격률 등 학교 기본 지표', en: 'U.S. Department of Education — basic institutional data such as overall admit rate' },
  { name: 'College Board', ko: 'AP 과목 내용·시험 형식·점수 분포', en: 'AP course content, exam format and score distributions' },
  { name: 'NCES', ko: '미국 교육부 통계청 — 전공별 학사 학위 수 추이', en: 'National Center for Education Statistics — bachelor’s degrees by field over time' },
  { name: '뉴욕 연방준비은행', name_en: 'Federal Reserve Bank of New York', ko: '전공별 최근 졸업생 실업률·불완전 취업·초봉', en: 'Recent-graduate unemployment, underemployment and early-career wages by major' },
  { name: 'BLS Occupational Outlook Handbook', ko: '미국 노동통계국 — 직업별 연봉·전망', en: 'U.S. Bureau of Labor Statistics — pay and outlook by occupation' },
  { name: '대회·서머 프로그램 공식 사이트', name_en: 'Official competition & program sites', ko: '참가 자격(국제학생 포함), 방식, 비용, 시기', en: 'Eligibility (incl. international students), format, cost, timing' },
]

export default function AboutPage() {
  useEffect(() => {
    document.title = t('서비스 소개·데이터 원칙 | 미국 대입 로드맵', 'About & data principles | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const card = 'mt-3 rounded-2xl border-2 border-gray-200 bg-white px-5 py-4'
  const h2 = 'flex items-center gap-2 text-base font-bold text-gray-900'
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 md:max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('서비스 소개', 'About')}</h1>
        </div>

        {/* 히어로 — 컨설팅 비용 대비 무료 (수치: IECA 2022 보고서, ASCA 2024–25) */}
        <div className="mt-4 overflow-hidden rounded-3xl bg-gray-900 px-6 py-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">{t('왜 무료인가요', 'Why it’s free')}</p>
          <p className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.03em]">
            {t('미국 대입 컨설팅은 평균 ', 'U.S. college consulting averages ')}<span className="text-blue-200">$6,304</span>{t(',', ',')}
            <br />{t('비싸면 1년에 ', 'and top firms charge ')}<span className="text-blue-200">$120,000</span>{t('(약 1억 5천만 원) 이상.', '+ a year.')}
            <br />{t('이 서비스는 ', 'This service is ')}<span className="text-emerald-300">{t('0원', '$0')}</span>{t('이에요.', '.')}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            {t('좋은 입시 정보와 체계적인 관리가 가정 형편에 따라 갈리지 않아야 한다고 생각해요. 컨설팅을 받기 어려운 저소득 가정의 학생, 카운슬러를 만나기 힘든 학교의 학생도 같은 공식 자료로 똑같이 준비할 수 있도록 모든 기능을 무료로 만들었어요.',
              'Good admissions information and planning shouldn’t depend on what a family can pay. We made every feature free so students from low-income families — and students at schools where counselors are stretched thin — can prepare with the same official information as anyone else.')}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[
            ['$6,304', '약 820만 원', t('대입 컨설팅 평균 패키지', 'Average college-consulting package'), t('평균 2년·30시간+ · IECA', 'avg. 2 yrs, 30+ hrs · IECA')],
            ['$8,216', '약 1,070만 원', t('아시아 등 해외 지역 평균', 'Average overseas (incl. Asia)'), t('지역별 종합 패키지 · IECA', 'regional package avg. · IECA')],
            ['$230', '약 30만 원', t('컨설턴트 평균 시간당 비용', 'Average hourly rate'), t('IECA 회원 평균', 'IECA member average')],
            ['$120,000', '약 1억 5,600만 원', t('뉴욕 고가 컨설팅 1년 비용', 'One year at a top NYC firm'), t('시험 대비 별도 · CNBC', 'test prep extra · CNBC')],
            ['$800,000', '약 10억 4,000만 원', t('몇 년간 한 가정이 쓴 최대 금액', 'Most one family spent over several years'), t('업체 대표 발언 · CNBC', 'per the firm’s founder · CNBC')],
            ['372 : 1', null, t('미국 학교 카운슬러 1명당 학생 수', 'Students per U.S. school counselor'), t('권장 250 : 1 · ASCA', 'recommended 250 : 1 · ASCA')],
          ].map(([n, krw, l, sub]) => (
            <div key={n} className="rounded-2xl border-2 border-gray-200 bg-white px-3.5 py-3">
              <p className="text-xl font-extrabold tabular-nums tracking-tight text-gray-900">{n}</p>
              {krw && getLang() === 'ko' && <p className="text-[11px] font-semibold text-gray-500">{krw}</p>}
              <p className="mt-0.5 text-[12px] font-medium leading-snug text-gray-700">{l}</p>
              <p className="text-[11px] text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
          {t('출처: ', 'Sources: ')}
          <a href="https://www.iecaonline.com/wp-content/uploads/2017/10/IECA-State-of-the-Profession-December-2022.pdf" target="_blank" rel="noreferrer" className="underline">{t('IECA(미국 독립교육컨설턴트협회) State of the Profession, 2022년 12월 — 2022년 1월 기준 회원 컨설턴트 평균', 'IECA State of the Profession, Dec 2022 — member averages as of Jan 2022')}</a>
          {' · '}
          <a href="https://www.cnbc.com/2024/10/18/why-parents-will-pay-500000-for-ivy-league-admissions-consulting.html" target="_blank" rel="noreferrer" className="underline">{t('CNBC, 2024년 10월 — 뉴욕 Command Education(연 $120,000), Lakhani Coaching(최대 $800,000, 대표 발언)', 'CNBC, Oct 2024 — Command Education ($120,000/yr) and Lakhani Coaching (up to $800,000, per its founder), New York')}</a>
          {' · '}
          <a href="https://www.schoolcounselor.org/about-school-counseling/school-counselor-roles-ratios" target="_blank" rel="noreferrer" className="underline">{t('ASCA(미국 학교상담사협회) — 2024–25학년도 전국 평균', 'ASCA — 2024–25 national average')}</a>
          {t('. 원화는 1달러 ≈ 1,300원으로 어림한 값이에요. 컨설팅 비용은 지역·경력·서비스 범위에 따라 크게 달라요.', '. Consulting fees vary widely by region, experience and scope.')}
        </p>

        <div className={card}>
          <h2 className={h2}><HeartHandshake size={18} className="text-blue-600" />{t('컨설팅 대신 무엇을 해 주나요', 'What it does in place of paid help')}</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-gray-700">
            <li>• {t('학년·전공·목표 학교에 맞춰 이번 시즌에 할 일을 체크리스트로 정리해요.', 'A checklist of what to do this season, for your grade, major and target schools.')}</li>
            <li>• {t('과목·성적·활동·시험을 기록하면 수업 난이도, 목표 학교 과목 요건, 다음 학년 추천까지 분석해요.', 'Log courses, grades, activities and tests to get rigor analysis, target-school course checks and next-year suggestions.')}</li>
            <li>• {t('147개 대학의 합격 범위·비용·재정지원·영어 시험·AP 학점·인터뷰·마감을 공식 자료로 비교해요.', 'Compare 147 colleges’ admit ranges, cost, aid, English tests, AP credit, interviews and deadlines from official sources.')}</li>
            <li>• {t('에세이·추천서·지원 학교·관심 표현까지 원서 준비 전체를 한곳에서 관리해요.', 'Manage essays, recommenders, your college list and demonstrated interest in one place.')}</li>
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500">{t('컨설턴트와 카운슬러가 해 주는 개별 상담을 대신하진 못해요. 다만 정보 정리·일정 관리·기록처럼 누구에게나 필요한 부분은 돈 없이도 할 수 있게 했어요.', 'It can’t replace one-on-one advice from a counselor or consultant — but the parts everyone needs, like organizing information, keeping to a timeline and keeping records, no longer cost money.')}</p>
        </div>

        <div className={card}>
          <h2 className={h2}><Users size={18} className="text-blue-600" />{t('누구를 위한 서비스인가요', 'Who it’s for')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{t('미국 대학을 준비하는 9~12학년 학생과 그 부모님을 위해 만들었어요. 특히 컨설팅 비용이 부담되거나 학교 카운슬러의 도움을 충분히 받기 어려운 학생이 혼자서도 4년 입시를 관리할 수 있게 하는 게 목표예요. 부모님은 같은 기능을 자녀 기준으로 쓸 수 있어요.', 'For students in grades 9–12 preparing for U.S. colleges, and their parents — especially students for whom consulting is out of reach or school counselors are hard to see. Parents can use every feature on their child’s behalf.')}</p>
        </div>

        <div className={card}>
          <h2 className={h2}><ShieldCheck size={18} className="text-blue-600" />{t('설계 원칙', 'Design principles')}</h2>
          <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-gray-700">
            <li><span className="font-semibold text-gray-900">{t('공식 데이터와 편집 가이드를 구분해요.', 'Official data and editorial guidance are kept separate.')}</span> {t('수치·정책에는 공식 출처 링크와 확인 날짜를 붙이고, 이 서비스가 제안하는 조언에는 ', 'Figures and policies carry an official source link and check date; advice this service suggests is marked ')}<Pin size={12} className="inline -mt-0.5" /> {t('"편집 가이드" 표시를 달아요.', '“editorial guide”.')}</li>
            <li><span className="font-semibold text-gray-900">{t('확인하지 못한 값은 비워 둬요.', 'Unverified values are left blank.')}</span> {t('그럴듯한 추정치를 만들지 않고, 공식 페이지로 확인한 값만 보여줘요.', 'We never fill gaps with plausible estimates — only values confirmed on official pages are shown.')}</li>
            <li><span className="font-semibold text-gray-900">{t('합격 가능성을 예측하지 않아요.', 'We don’t predict your chances.')}</span> {t('대신 "합격자 중간 50% 범위 대비 내 위치"처럼 공개된 기준 위에서 내 자리를 보여줘요.', 'Instead we show where you stand against published ranges, such as the admitted middle 50%.')}</li>
            <li><span className="font-semibold text-gray-900">{t('규칙 기반이에요.', 'It’s rule-based.')}</span> {t('AI 챗봇 없이, 미리 정리한 콘텐츠를 내 프로필 조건으로 걸러 보여줘요 — 같은 조건이면 누구에게나 같은 결과예요.', 'No AI chatbot — curated content is filtered by your profile, so the same inputs always give the same result.')}</li>
          </ol>
        </div>

        <div className={card}>
          <h2 className={h2}><Database size={18} className="text-blue-600" />{t('데이터 출처', 'Data sources')}</h2>
          <ul className="mt-2 flex flex-col divide-y divide-gray-100">
            {SOURCES.map((s) => (
              <li key={s.name} className="py-2 text-sm">
                <p className="font-semibold text-gray-900">{t(s.name, s.name_en ?? s.name)}</p>
                <p className="text-[13px] leading-relaxed text-gray-600">{t(s.ko, s.en)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{t('학교 순위는 U.S. News & World Report 기준이에요. 각 화면의 "공식 출처 ↗" 링크로 원문을 바로 확인할 수 있어요.', 'School rankings follow U.S. News & World Report. Every screen links to the original via “Official source ↗”.')}</p>
        </div>

        <div className={card}>
          <h2 className={h2}><RefreshCw size={18} className="text-blue-600" />{t('얼마나 자주 갱신하나요', 'How often it’s updated')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{t('학교가 새 자료를 내는 시기에 맞춰 1년 주기로 갱신해요 — 여름(에세이 문항·마감·직업 통계), 겨울(Common Data Set), 가을(순위). 정책은 해마다 바뀔 수 있으니 지원 전엔 공식 페이지를 꼭 다시 확인하세요.', 'Data is refreshed once a year as colleges publish — summer (essay prompts, deadlines, labor statistics), winter (Common Data Sets), fall (rankings). Policies change yearly, so always recheck the official page before you apply.')}</p>
        </div>

        <div className={card}>
          <h2 className={h2}><Ban size={18} className="text-blue-600" />{t('하지 않는 것', 'What it doesn’t do')}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-gray-700">
            <li>{t('합격 확률 계산·"이 정도면 붙는다" 같은 판정', 'Chance calculators or “you’ll get in” verdicts')}</li>
            <li>{t('에세이 대필이나 AI 작성', 'Writing essays for you, by AI or otherwise')}</li>
            <li>{t('실제 원서 제출 — "내 원서"는 준비·기록용 연습 공간이에요', 'Submitting applications — “My App” is a practice and tracking space')}</li>
            <li>{t('광고·유료 전환 — 모든 기능이 무료예요', 'Ads or paywalls — every feature is free')}</li>
          </ul>
        </div>

        <div className={card}>
          <h2 className={h2}><Lock size={18} className="text-blue-600" />{t('내 기록과 개인정보', 'Your records & privacy')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{t('과목·활동·에세이 메모 같은 기록은 내 계정으로만 볼 수 있어요 — 데이터베이스가 행 단위로 본인 것만 읽고 쓰게 막아요. 체험 모드는 아무것도 저장하지 않아요. 서비스 개선을 위해 가입·로그인·리포트 보기 같은 이용 기록만 남기고, 온보딩 연구 문항은 동의한 학생의 답만 연구에 쓰고, 부모님과 미국 시민권·영주권자에게는 묻지 않아요.', 'Records like courses, activities and essay notes are visible only to your account — the database restricts every row to its owner. Demo mode saves nothing. To improve the service we log only usage events such as sign-up, login and report views, and onboarding research answers are used only from students who consent — parents and U.S. citizens/permanent residents aren’t asked.')}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button onClick={() => navigate('/demo')} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white active:bg-gray-800">{t('로그인 없이 체험하기', 'Try it — no login')}</button>
          <button onClick={() => navigate('/')} className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">{t('처음 화면으로', 'Home')}</button>
        </div>
      </div>
    </div>
  )
}
