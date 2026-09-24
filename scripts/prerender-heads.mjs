// 라우트별 <head> 프리렌더 — SPA라서 모든 주소에 홈 제목이 내려가는 문제 해결.
// vite build 후 실행: dist/index.html을 복사해 제목·설명·캐노니컬·OG만 바꾼 정적 HTML을
// /schools/:slug, /major/:key, 주요 목록 경로에 생성한다 (Vercel은 정적 파일을 rewrites보다 우선 서빙).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const BASE = 'https://www.uscollegeroadmap.com'
const dist = 'dist'
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// head 치환 — 기존 태그를 정규식으로 교체 (title, canonical, description, og:title/url, twitter:title)
function render(title, description, path) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  let h = template
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${BASE}${path}$2`)
  h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
  h = h.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${BASE}${path}$2`)
  h = h.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
  return h
}

function emit(path, title, description) {
  const file = join(dist, path.replace(/^\//, ''), 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, render(title, description, path))
}

// ── 학교 147곳 ──
const schools = JSON.parse(readFileSync('src/data/schools.index.json', 'utf8'))
for (const s of schools) {
  const rank = s.kind === 'lac' ? `리버럴 아츠 칼리지 ${s.lac_rank ?? ''}위` : s.kind === 'art' ? '미술·디자인 전문학교, 포트폴리오 요구사항' : `미국 대학 순위 ${s.usnews_rank}위`
  const rate = s.overall_accept_rate != null ? ` 합격률 ${s.overall_accept_rate}%,` : ''
  emit(
    `/schools/${slugify(s.name)}`,
    `${s.name} 합격률·SAT·합격 전략 (${s.name_ko}) — 미국 대입 로드맵`,
    `${s.name}(${s.name_ko})${rate} SAT 중간 50%, 국제학생 합격률, ED/EA 마감, 보충 에세이, 장학금 — 공식 출처(CDS) 기준. ${rank}.`,
  )
}

// ── 전공 73곳 (majors.ts에서 value·label 파싱) ──
const majorsTs = readFileSync('src/data/majors.ts', 'utf8')
const majors = [...majorsTs.matchAll(/\{ value: '([^']+)', label: '([^']+)'/g)].map((m) => ({ value: m[1], label: m[2] }))
for (const m of majors) {
  emit(
    `/major/${m.value}`,
    `${m.label} 전공 — 미국 대학 진로·추천 AP 가이드 | 미국 대입 로드맵`,
    `${m.label} 전공의 배우는 내용, 졸업 후 직업·연봉·전망(미 노동통계국 공식), 추천 AP와 9~12학년 로드맵, 전공이 강한 미국 대학까지 정리했어요.`,
  )
}

// ── 주요 목록 페이지 ──
emit('/schools', '미국 명문대 합격률·합격 전략 — 대학 147+ 공식 데이터 | 미국 대입 로드맵',
  '미국 대학 147곳의 합격률·국제학생 합격률·SAT 중간 50%·보충 에세이·장학금을 공식 출처(CDS)로만 정리 — 종합대 톱 100 + 리버럴 아츠 칼리지 35곳 + 미술·디자인 전문학교 11곳.')
emit('/majors', '미국 대학 전공 가이드 — 유명 전공부터 희귀 전공까지 73+ | 미국 대입 로드맵',
  '컴퓨터과학부터 해양생물학·고고학까지 미국 대학 전공 73개의 진로·연봉 전망(미 노동통계국), 추천 AP, 4년 로드맵을 정리했어요.')
emit('/guide/ap', 'AP 과목 가이드 — 새 AP·정책 변화·과목별 점수 분포 | 미국 대입 로드맵',
  'AP 전 과목의 배우는 내용·권장 선수 과목·시험 형식(디지털/종이)과 2026년 점수 분포, 새로 생긴 AP와 디지털 시험·응시료·마감 등 최근 정책 변화 — College Board 공식 자료.')
emit('/guide/courses', '미국 대학 입시 수업 난이도(rigor) 가이드 — 학년별 추천 과목 | 미국 대입 로드맵',
  '9~12학년 수학·과학·영어·사회·외국어를 일반·심화·최상위 3단계로 정리한 수업 난이도 가이드와 전공별 핵심 과목 — Harvard·Princeton·Caltech·Yale 입학처 공식 권장 근거.')
emit('/guide/cost', '미국 대학 1년 비용 비교·국제학생 재정지원 자격 | 미국 대입 로드맵',
  '미국 대학 147곳의 국제학생 1년 총비용(학비·기숙사·식비·교재)을 공식 Cost of Attendance로 비교하고, 연방·주 정부·학교 재정지원을 국제학생과 시민권·영주권자가 각각 받을 수 있는지 미국 교육부 공식 자료로 정리했어요.')
emit('/guide/programs', '미국 대입 대회·서머 프로그램 가이드 — 전공별 추천·국제학생 참가 자격 | 미국 대입 로드맵',
  'USACO·AMC·ISEF·RSI·PROMYS·YYGS·RISD Pre-College 등 전공별 대회와 서머 프로그램 75개의 내용, 국제학생 참가 자격, 비용, 운영하거나 공식 언급한 대학(MIT·Caltech 입학처 등)을 공식 출처로 정리했어요.')
emit('/guide/english', '미국 대학 영어 시험(TOEFL·IELTS·Duolingo) 기준과 면제 조건 | 미국 대입 로드맵',
  '미국 대학 147곳의 TOEFL·IELTS·Duolingo 최소 점수, SAT 영어 점수로 대체 가능 여부, 면제 조건(2·3·4년)과 면제를 받으려면 직접 요청해야 하는지를 각 대학 공식 입학처 페이지로 확인해 정리했어요.')
emit('/map', '미국 대학 지도 — 명문대 147곳 위치를 한눈에 | 미국 대입 로드맵',
  '미국 지도 위에서 명문대 147곳의 위치를 로고로 확인하세요 — 동북부·캘리포니아 확대, 순위 필터, 학교 검색 지원.')

console.log(`prerender-heads: ${schools.length} schools + ${majors.length} majors + 3 lists`)
