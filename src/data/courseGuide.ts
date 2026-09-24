// 수업 난이도(rigor) 가이드 — 2026-09-23 사용자 승인 초안 그대로
// 학년별 표·과목 단계는 편집 가이드(학교마다 다름), 전공별 핵심 과목·rigor 원칙은 대학 공식 입학처 문구 근거

import { t } from '../i18n'

// 콘텐츠 확인·승인일 (입학처 공식 권장 근거)
export const COURSE_GUIDE_VERIFIED = '2026-09-23'

export type Subject = 'math' | 'science' | 'english' | 'social' | 'language'
export const SUBJECTS: Subject[] = ['math', 'science', 'english', 'social', 'language']

export const subjectLabel: Record<Subject, { ko: string; en: string }> = {
  math: { ko: '수학', en: 'Math' },
  science: { ko: '과학', en: 'Science' },
  english: { ko: '영어', en: 'English' },
  social: { ko: '사회', en: 'Social studies' },
  language: { ko: '외국어', en: 'World language' },
}

// ① 학년별 가이드 표 — [일반, 심화, 최상위]
export type Tier3 = [string, string, string]
// 'AP Calc BC 이후 / Beyond BC'처럼 한/영 병기 칸은 언어에 맞는 쪽만 표시
export const cellText = (cell: string): string => {
  const paren = cell.match(/^\((.*)\)$/)
  if (paren) return `(${cellText(paren[1])})`
  const m = cell.match(/^(.*[가-힣].*?)\s*\/\s*([^가-힣]+)$/)
  return m ? t(m[1].trim(), m[2].trim()) : cell
}
export const gradeGuide: Record<Subject, Record<9 | 10 | 11 | 12, Tier3>> = {
  math: {
    9: ['Algebra 1', 'Geometry', 'Algebra 2'],
    10: ['Geometry', 'Algebra 2', 'Precalculus'],
    11: ['Algebra 2', 'Precalculus', 'AP Calc AB/BC'],
    12: ['Precalculus', 'AP Calc AB', 'AP Calc BC 이후 / Beyond BC'],
  },
  science: {
    9: ['Biology', 'Honors Biology', 'Honors Biology'],
    10: ['Chemistry', 'Honors Chemistry', 'Honors Chem / AP Bio'],
    11: ['Physics', 'AP 1', 'AP 1–2 (Chem·Physics 1)'],
    12: ['Science elective', 'AP 1', 'AP Physics C …'],
  },
  english: {
    9: ['English 9', 'Honors', 'Honors'],
    10: ['English 10', 'Honors', 'Honors'],
    11: ['English 11', 'Honors', 'AP English Language'],
    12: ['English 12', 'AP Lang / Lit', 'AP English Literature'],
  },
  social: {
    9: ['World History', 'Honors', 'Honors'],
    10: ['World History', 'Honors', 'AP World / European'],
    11: ['US History', 'AP US History', 'AP US History'],
    12: ['Gov · Econ', 'AP 1', 'AP 2 (Gov · Macro …)'],
  },
  language: {
    9: ['Level 1', 'Level 2', 'Level 3'],
    10: ['Level 2', 'Level 3', 'Level 4'],
    11: ['Level 3', 'Level 4', 'AP'],
    12: ['(선택 / optional)', 'AP', 'AP'],
  },
}

// ② 과목 단계(사다리) — 추천 기능이 "다음 칸"을 찾는 기준. match는 과목명 판별용
export interface Rung { name: string; match: RegExp }
export const ladders: Record<Subject, Rung[]> = {
  math: [
    { name: 'Algebra 1', match: /algebra\s*(1|i)\b(?!i)|대수\s*1/i },
    { name: 'Geometry', match: /geometry|기하/i },
    { name: 'Algebra 2', match: /algebra\s*(2|ii)\b|대수\s*2/i },
    { name: 'Precalculus', match: /pre-?\s*cal(c(ulus)?)?\b|trigonometry|프리\s*캘/i },
    { name: 'AP Calculus AB', match: /\bcal(c(ulus)?)?\.?\s*ab\b|(?<!pre[-\s]?)\bcal(c(ulus)?)?\b(?!\.?\s*(ab|bc)\b)|미적분/i },
    { name: 'AP Calculus BC', match: /\bcal(c(ulus)?)?\.?\s*bc\b/i },
    { name: 'Multivariable · Linear Algebra', match: /multivariable|linear algebra|differential eq/i },
  ],
  science: [
    { name: 'Biology', match: /biology|\bbio\b|생물/i },
    { name: 'Chemistry', match: /chemistry|\bchem\b|화학/i },
    { name: 'Physics', match: /physics|물리/i },
    { name: 'AP Bio / Chem / Physics 1', match: /ap\s*(bio|chem|physics\s*(1|i)\b)/i },
    { name: 'AP Physics C', match: /physics\s*c\b/i },
  ],
  english: [
    { name: 'English 9', match: /english\s*9|freshman english/i },
    { name: 'English 10', match: /english\s*10|sophomore english/i },
    { name: 'Honors English', match: /honors?\s*english|english.*honors?/i },
    { name: 'AP English Language', match: /(english\s*)?lang(uage)?\s*(and|&)\s*comp|ap\s*(english\s*)?lang/i },
    { name: 'AP English Literature', match: /(english\s*)?lit(erature)?\s*(and|&)\s*comp|ap\s*(english\s*)?lit/i },
  ],
  social: [
    { name: 'World History', match: /world history|세계사/i },
    { name: 'AP World / European History', match: /ap\s*(world|euro)/i },
    { name: 'AP US History', match: /ap\s*us(\s*history)?\b|apush|u\.?s\.?\s*history|united states history|미국사/i },
    { name: 'AP Gov · Macro · Micro · Psych', match: /ap\s*(gov|macro|micro|psych|comparative|human geo)/i },
  ],
  language: [
    { name: 'Level 1', match: /(\b|[a-z])(1|i)\b/i },
    { name: 'Level 2', match: /(\b|[a-z])(2|ii)\b/i },
    { name: 'Level 3', match: /(\b|[a-z])(3|iii)\b/i },
    { name: 'Level 4', match: /(\b|[a-z])(4|iv)\b/i },
    { name: 'AP', match: /\bap\b/i },
  ],
}

// 과목명 → 과목 분류 (사다리 판별 전 1차 분류)
export const subjectMatch: Record<Subject, RegExp> = {
  math: /algebra|geometry|\bcal(c|culus)?\b|precal|statistic|math|trig|대수|기하|미적|수학|통계/i,
  science: /biology|chemistry|physics|science|\bbio\b|\bchem\b|environmental|anatomy|physiology|생물|화학|물리|과학/i,
  english: /english|literature|\blit\b|composition|영어|문학/i,
  social: /history|gov|econ|psych|geograph|social|civics|sociology|global stud|world stud|humanities|politic|african american stud|세계사|미국사|역사|경제|사회|정치/i,
  language: /span|spain|espa|french|fren|chinese|mandarin|japanese|korean|german|latin|italian|arabic|스페인어|프랑스어|중국어|일본어|한국어|독일어|라틴어/i,
}

// IB 수학 — 별도 사다리 (AI SL → AA SL → AA HL)
export const ibMathLadder: Rung[] = [
  { name: 'Math AI SL', match: /(ai|applications).*\bsl\b|\bsl\b.*(ai|applications)/i },
  { name: 'Math AA SL', match: /(aa|analysis).*\bsl\b|\bsl\b.*(aa|analysis)/i },
  { name: 'Math AA HL', match: /(aa|analysis).*\bhl\b|\bhl\b.*(aa|analysis)/i },
]

// ③ 전공별 핵심 과목 (공식 근거) — 전공 상위 계열(majorParent) 기준
export interface CoreNeed { label: string; match: RegExp }
export interface MajorCore { groups: string[]; ko: string; en: string; needs: CoreNeed[]; source: string; url: string }
export const majorCores: MajorCore[] = [
  {
    groups: ['engineering', 'aerospace_eng', 'physics'],
    ko: '공학', en: 'Engineering',
    needs: [
      { label: 'Calculus', match: /(?<!pre[-\s]?)\bcal(c(ulus)?)?\b|미적/i },
      { label: 'Physics', match: /physics|물리/i },
      { label: 'Chemistry', match: /chemistry|\bchem\b|화학/i },
    ],
    source: 'Princeton · Caltech · MIT', url: 'https://admission.princeton.edu/apply/before-you-apply',
  },
  {
    groups: ['cs', 'math_data'],
    ko: '컴퓨터과학·수학', en: 'CS · Math',
    needs: [
      { label: 'Calculus', match: /(?<!pre[-\s]?)\bcal(c(ulus)?)?\b|미적/i },
      { label: 'AP Computer Science A', match: /computer science a|\bcs\s*a\b|ap\s*cs(a)?\b/i },
    ],
    source: 'Harvard', url: 'https://college.harvard.edu/resources/faq/are-there-secondary-school-course-requirements-admission',
  },
  {
    groups: ['premed', 'nursing', 'natural_sci', 'biology'],
    ko: '의대·생명과학', en: 'Pre-med · Life sciences',
    needs: [
      { label: 'Biology', match: /biology|\bbio\b|생물/i },
      { label: 'Chemistry', match: /chemistry|\bchem\b|화학/i },
    ],
    source: 'Harvard', url: 'https://college.harvard.edu/resources/faq/are-there-secondary-school-course-requirements-admission',
  },
  {
    groups: ['business'],
    ko: '경영·경제', en: 'Business · Economics',
    needs: [
      { label: 'Calculus', match: /(?<!pre[-\s]?)\bcal(c(ulus)?)?\b|미적/i },
      { label: 'Economics', match: /econ|경제/i },
    ],
    source: 'Penn (Wharton)', url: 'https://admissions.upenn.edu/how-to-apply/preparing-your-application/academics',
  },
  {
    groups: ['humanities', 'social_sci'],
    ko: '인문·사회', en: 'Humanities · Social sciences',
    needs: [
      { label: 'World language Level 4 / AP (IB: Language B HL)', match: /(spanish|french|chinese|mandarin|japanese|german|latin|korean|language\s*b).*(\b4\b|\biv\b|\bap\b|\bhl\b)|\bap\b.*(spanish|french|chinese|japanese|german|latin)/i },
      { label: 'AP History (IB: History HL)', match: /ap\s*(us|world|euro|u\.s)|apush|history.*\bhl\b/i },
    ],
    source: 'Princeton · Harvard', url: 'https://admission.princeton.edu/apply/before-you-apply',
  },
]

// ④ 공식 근거 문구 (가이드 페이지 표시용)
export const rigorSources: { who: string; ko: string; en: string; url: string }[] = [
  {
    who: 'Common App (School Report)',
    ko: '카운슬러는 "우리 학교의 다른 대입 준비 학생과 비교해" 과목 선택을 5단계(덜 도전적 / 평균 / 도전적 / 매우 도전적 / 가장 도전적)로 평가한다.',
    en: 'Counselors rate course selection "in comparison with other college preparatory students at your school" on five levels (less than demanding / average / demanding / very demanding / most demanding).',
    url: 'https://college.harvard.edu/sites/default/files/2022-08/School_Report.pdf',
  },
  {
    who: 'Yale',
    ko: '학교 교육과정은 학생이 정한 게 아니며, 학교에 개설된 과목 안에서만 기대한다고 밝힌다. 매년 영어·과학·수학·사회·외국어를 들으라고 권한다.',
    en: 'Yale says it knows students did not design their school’s curriculum and only expects them to take advantage of courses their school provides; it advises taking English, science, math, social science and a language each year.',
    url: 'https://admissions.yale.edu/advice-selecting-high-school-courses',
  },
  {
    who: 'Harvard',
    ko: '영어·수학·과학·외국어 4년, 과학은 생물·화학·물리 + 심화 1과목을 권장한다. 미적분은 입학 필수가 아니라고 명시한다.',
    en: 'Recommends four years each of English, math, science and one foreign language, with biology, chemistry, physics and an advanced course in one of them; states calculus is not required for admission.',
    url: 'https://college.harvard.edu/resources/faq/are-there-secondary-school-course-requirements-admission',
  },
  {
    who: 'Princeton',
    ko: '영어·수학·외국어 4년, 실험 과학 2년 이상. 공대 지망이면 미적분·물리·화학.',
    en: 'Four years of English, math and one language, at least two years of lab science; calculus, physics and chemistry for engineering.',
    url: 'https://admission.princeton.edu/apply/before-you-apply',
  },
  {
    who: 'Caltech',
    ko: '필수 요건: 미적분 1년, 물리·화학 각 1년, 영어 4년.',
    en: 'Requirements: one year of calculus, one year each of physics and chemistry, four years of English.',
    url: 'https://www.admissions.caltech.edu/apply/first-year-applicants/academic-requirements-for-first-year-applicants',
  },
  {
    who: 'College Board',
    ko: '외국어 AP(스페인어 등)는 보통 해당 언어를 4년째 배우는 학생이 듣는다.',
    en: 'World-language APs are typically taken in the fourth year of high-school-level study.',
    url: 'https://apstudents.collegeboard.org/courses/ap-spanish-language-and-culture',
  },
]
