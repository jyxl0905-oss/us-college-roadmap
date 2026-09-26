import { useEffect } from 'react'
import { t } from '../i18n'
import { goBack, navigate } from '../lib/router'

// 개인정보처리방침·이용약관 — 실제 운영 방식 그대로 적음 (DB: Supabase 서울 리전, 호스팅: Vercel, 로그인·알림 메일: Google)
export const CONTACT_EMAIL = 'uscollegeroadmap@gmail.com'
const EFFECTIVE = '2026-09-25'

type Sec = { h: [string, string]; body: [string, string][] }

const PRIVACY: Sec[] = [
  { h: ['1. 수집하는 정보', '1. What we collect'], body: [
    ['계정 정보: 이메일 주소. Google로 로그인하면 Google이 제공하는 이름·이메일·프로필 사진 주소가 함께 저장돼요.', 'Account: your email address. If you sign in with Google, the name, email and profile-photo URL Google provides are stored too.'],
    ['온보딩 답변: 학년(졸업 연도), 지원 신분, 카운슬러 유무, 학교 정보, 희망 전공, 목표 학교, GPA·SAT·AP 범위, 활동 자가진단, 학생/부모 구분 등.', 'Onboarding answers: grade (graduation year), applicant status, counselor access, school details, intended majors, target schools, GPA/SAT/AP ranges, activity self-assessment, student/parent choice, etc.'],
    ['직접 입력한 기록: 과목·성적, 활동·수상, 시험 점수, 에세이 문항·메모·본문, 추천인 이름·진행 상황, 관심 표현 기록, 계획, 지원 학교·라운드, 올린 파일(성적표 등).', 'Records you enter: courses and grades, activities and honors, test scores, essay prompts/notes/drafts, recommender names and status, demonstrated-interest logs, plans, your college list and rounds, and files you upload (e.g., transcripts).'],
    ['이용 기록: 가입·로그인·리포트 보기 같은 이용 이벤트, 마지막 접속 시각, 체크인·설문 응답, 보내 주신 의견.', 'Usage: events such as sign-up, login and report views; your last-seen time; check-in and survey answers; feedback you send.'],
    ['브라우저 저장소: 언어·화면 테마 설정, 작성 중인 온보딩 초안 — 내 기기에만 저장돼요.', 'Browser storage: language and theme settings and in-progress onboarding drafts — kept on your device only.'],
  ] },
  { h: ['2. 이용 목적', '2. How we use it'], body: [
    ['리포트·체크리스트·수업 분석·학교 비교 같은 서비스 기능을 제공하는 데 써요.', 'To provide the service: your report, checklists, course analysis and school comparisons.'],
    ['알림 이메일(시즌 시작·내가 입력한 마감일 이틀 전)을 보내요. 리포트 화면에서 언제든 끌 수 있어요.', 'To send reminder emails (season start; two days before deadlines you enter). You can turn them off on your report at any time.'],
    ['서비스를 개선하기 위한 통계에 써요.', 'For statistics that help us improve the service.'],
    ['연구: 동의한 학생 본인의 답변만 이름·이메일을 빼고 익명 통계로 써요. 부모 계정과 미국 시민권·영주권자에게는 연구 동의를 묻지 않아요.', 'Research: only answers from students who opt in, used as anonymous statistics without names or emails. Parents and U.S. citizens/permanent residents are not asked.'],
  ] },
  { h: ['3. 판매·광고·제3자 제공', '3. No selling, no ads'], body: [
    ['개인정보를 판매하거나 광고 목적으로 제공하지 않아요. 광고와 추적 스크립트도 없어요.', 'We do not sell personal information or share it for advertising. There are no ads or tracking scripts.'],
    ['서비스 운영을 위해 아래 업체가 정보를 처리해요: Supabase(데이터베이스·로그인, 서울 리전), Vercel(웹 호스팅), Google(Google 로그인·알림 이메일 발송).', 'These providers process data to run the service: Supabase (database and sign-in, Seoul region), Vercel (web hosting), Google (Google sign-in and sending reminder emails).'],
    ['학교 로고 이미지는 외부 사이트(위키미디어·각 대학 사이트)에서 불러와서, 이미지 요청 시 브라우저의 IP 주소가 해당 사이트에 전달될 수 있어요.', 'School logos load from external sites (Wikimedia and college websites), so your browser’s IP address may reach those sites when the images load.'],
  ] },
  { h: ['4. 보관과 삭제', '4. Retention and deletion'], body: [
    ['계정을 쓰는 동안 보관해요.', 'We keep your data while your account exists.'],
    [`계정과 기록 전체 삭제를 원하면 가입한 이메일로 ${CONTACT_EMAIL}에 요청해 주세요. 확인 후 지체 없이 삭제해요.`, `To delete your account and all records, email ${CONTACT_EMAIL} from the address you signed up with. We delete it promptly after confirming.`],
    ['기록은 앱 안에서 언제든 직접 고치거나 지울 수 있어요.', 'You can edit or delete your records in the app at any time.'],
  ] },
  { h: ['5. 보안', '5. Security'], body: [
    ['기록은 데이터베이스가 행 단위로 본인만 읽고 쓰게 막아요. 올린 파일은 비공개 저장소에 두고, 볼 때마다 몇 분짜리 임시 링크로만 열어요.', 'The database limits every record to its owner. Uploaded files sit in private storage and open only through short-lived links.'],
  ] },
  { h: ['6. 이용 대상', '6. Who the service is for'], body: [
    ['이 서비스는 미국 대학을 준비하는 고등학생(9~12학년)과 그 부모님을 위한 서비스예요. 만 13세 미만 어린이를 대상으로 하지 않으며, 13세 미만의 정보가 수집된 것을 알게 되면 바로 삭제해요.', 'The service is for high-school students (grades 9–12) preparing for U.S. colleges and their parents. It is not directed to children under 13; if we learn we have collected information from a child under 13, we delete it.'],
  ] },
  { h: ['7. 이용자의 권리', '7. Your choices'], body: [
    ['내 정보 열람·수정은 앱에서 직접 할 수 있고, 삭제·연구 동의 철회는 이메일로 요청할 수 있어요.', 'View and edit your information in the app; request deletion or withdraw research consent by email.'],
  ] },
  { h: ['8. 변경', '8. Changes'], body: [
    ['방침이 바뀌면 이 페이지에 시행일과 함께 알려 드려요.', 'If this policy changes, we update this page with a new effective date.'],
  ] },
]

const TERMS: Sec[] = [
  { h: ['1. 서비스', '1. The service'], body: [
    ['미국 대입 로드맵은 미국 대학 입시 준비를 돕는 무료 정보·기록 도구예요. 모든 기능이 무료이고 광고가 없어요.', 'US College Roadmap is a free information and record-keeping tool for U.S. college admissions. Every feature is free and there are no ads.'],
  ] },
  { h: ['2. 정보의 성격', '2. About the information'], body: [
    ['학교 정보는 각 대학 공식 자료로 정리하지만, 정책과 마감은 해마다 바뀔 수 있어요. 지원 전에는 반드시 각 대학 공식 페이지에서 최종 확인하세요.', 'School information is compiled from official sources, but policies and deadlines change. Always confirm on each college’s official page before applying.'],
    ['이 서비스는 합격 가능성을 예측하거나 보장하지 않아요. 체크리스트와 조언("편집 가이드" 표시)은 참고용이에요.', 'The service does not predict or guarantee admission. Checklists and advice (marked “editorial guide”) are for reference.'],
  ] },
  { h: ['3. 계정', '3. Accounts'], body: [
    ['9~12학년 고등학생 본인과 그 부모·보호자가 사용할 수 있어요.', 'High-school students (grades 9–12) and their parents or guardians may use the service.'],
    ['계정 보안(로그인 수단 관리)은 본인이 책임져요.', 'You are responsible for keeping your sign-in method secure.'],
  ] },
  { h: ['4. 이용 규칙', '4. Acceptable use'], body: [
    ['다른 사람의 계정에 접근하거나, 자동화된 방법으로 대량 요청을 보내거나, 서비스를 방해하는 행동은 금지돼요.', 'Do not access others’ accounts, send automated bulk requests, or disrupt the service.'],
    ['추천인 이름처럼 다른 사람의 정보는 준비에 필요한 만큼만 적어 주세요.', 'Enter other people’s information (such as recommender names) only as needed for your planning.'],
  ] },
  { h: ['5. 콘텐츠와 기록', '5. Content and your records'], body: [
    ['내가 입력한 기록의 권리는 나에게 있어요. 서비스의 정리·편집 콘텐츠는 운영자에게, 인용한 공식 자료의 권리는 각 원저작자에게 있어요.', 'Records you enter belong to you. The service’s compiled and editorial content belongs to the operator; cited official materials belong to their owners.'],
  ] },
  { h: ['6. 변경·중단과 책임', '6. Changes, availability and liability'], body: [
    ['무료 서비스로 제공되며, 기능은 예고 후 바뀌거나 중단될 수 있어요. 서비스 이용이나 정보에 따른 입시 결과에 대해 운영자는 책임지지 않아요.', 'The service is provided free of charge and may change or stop with notice. The operator is not responsible for admission outcomes arising from use of the service or its information.'],
  ] },
]

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy'
  const title = privacy ? t('개인정보처리방침', 'Privacy Policy') : t('이용약관', 'Terms of Use')
  useEffect(() => {
    document.title = `${title} | ${t('미국 대입 로드맵', 'US College Roadmap')}`
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [title])
  const secs = privacy ? PRIVACY : TERMS
  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 md:max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
        <p className="mt-2 text-xs text-gray-500">{t(`시행일 ${EFFECTIVE} · 미국 대입 로드맵 (uscollegeroadmap.com)`, `Effective ${EFFECTIVE} · US College Roadmap (uscollegeroadmap.com)`)}</p>
        <div className="mt-4 flex flex-col gap-3">
          {secs.map((s) => (
            <section key={s.h[0]} className="rounded-2xl border-2 border-gray-200 bg-white px-5 py-4">
              <h2 className="text-[15px] font-bold text-gray-900">{t(...s.h)}</h2>
              <ul className="mt-1.5 flex flex-col gap-1.5 text-sm leading-relaxed text-gray-700">
                {s.body.map(([ko, en], i) => <li key={i}>{t(ko, en)}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-5 text-sm text-gray-600">{t('문의: ', 'Contact: ')}<a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-blue-600 underline">{CONTACT_EMAIL}</a></p>
        <p className="mt-2 text-xs text-gray-400">
          <button onClick={() => navigate(privacy ? '/terms' : '/privacy')} className="underline">{privacy ? t('이용약관 보기', 'Terms of Use') : t('개인정보처리방침 보기', 'Privacy Policy')}</button>
          {' · '}<button onClick={() => navigate('/about')} className="underline">{t('서비스 소개', 'About')}</button>
        </p>
      </div>
    </div>
  )
}
