// 과목명 자동완성용 표준 과목명 — 미국·국제학교 성적표에 흔한 이름 + AP 전 과목(College Board 공식 명칭 기준) + IB 주요 과목
// 이름은 수업 난이도 분석(courseGuide 사다리·과목 분류)이 인식하는 형태로 적음
const langs = ['Spanish', 'French', 'Chinese', 'Japanese', 'German', 'Latin', 'Korean']

export const COURSE_CATALOG: string[] = [
  // 수학
  'Algebra 1', 'Geometry', 'Algebra 2', 'Precalculus', 'Calculus', 'Statistics', 'Trigonometry',
  'AP Precalculus', 'AP Calculus AB', 'AP Calculus BC', 'AP Statistics', 'Multivariable Calculus', 'Linear Algebra',
  'IB Math AA SL', 'IB Math AA HL', 'IB Math AI SL', 'IB Math AI HL',
  // 과학
  'Biology', 'Chemistry', 'Physics', 'Environmental Science', 'Earth Science', 'Anatomy and Physiology',
  'AP Biology', 'AP Chemistry', 'AP Physics 1', 'AP Physics 2', 'AP Physics C: Mechanics', 'AP Physics C: Electricity and Magnetism', 'AP Environmental Science',
  'IB Biology SL', 'IB Biology HL', 'IB Chemistry SL', 'IB Chemistry HL', 'IB Physics SL', 'IB Physics HL',
  // 영어
  'English 9', 'English 10', 'English 11', 'English 12',
  'AP English Language and Composition', 'AP English Literature and Composition',
  'IB English A: Language and Literature SL', 'IB English A: Language and Literature HL', 'IB English A: Literature SL', 'IB English A: Literature HL',
  // 사회
  'World History', 'US History', 'Government', 'Economics', 'Psychology', 'Geography',
  'AP World History: Modern', 'AP European History', 'AP US History', 'AP US Government and Politics', 'AP Comparative Government and Politics',
  'AP Human Geography', 'AP Macroeconomics', 'AP Microeconomics', 'AP Psychology', 'AP African American Studies',
  'IB History SL', 'IB History HL', 'IB Economics SL', 'IB Economics HL', 'IB Psychology SL', 'IB Psychology HL', 'IB Global Politics',
  // 외국어
  ...langs.flatMap((l) => [1, 2, 3, 4].map((n) => `${l} ${n}`)),
  'AP Spanish Language and Culture', 'AP Spanish Literature and Culture', 'AP French Language and Culture', 'AP Chinese Language and Culture',
  'AP Japanese Language and Culture', 'AP German Language and Culture', 'AP Italian Language and Culture', 'AP Latin',
  'IB Spanish B SL', 'IB Spanish B HL', 'IB French B SL', 'IB French B HL', 'IB Chinese B SL', 'IB Chinese B HL',
  // 컴퓨터·예술·기타
  'Computer Science', 'AP Computer Science A', 'AP Computer Science Principles', 'AP Cybersecurity', 'AP Networking', 'AP Business with Personal Finance',
  'AP Seminar', 'AP Research', 'AP Art History', 'AP Music Theory', 'AP 2-D Art and Design', 'AP 3-D Art and Design', 'AP Drawing',
  'IB Computer Science SL', 'IB Computer Science HL', 'IB Visual Arts', 'IB Theory of Knowledge',
  'Art', 'Music', 'Physical Education', 'Health',
]
