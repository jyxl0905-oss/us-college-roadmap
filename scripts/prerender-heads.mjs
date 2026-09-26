// 라우트별 <head> 프리렌더 — SPA라서 모든 주소에 홈 제목이 내려가는 문제 해결.
// vite build 후 실행: dist/index.html을 복사해 제목·설명·캐노니컬·OG만 바꾼 정적 HTML을
// /schools/:slug, /major/:key, 주요 목록 경로에 생성한다 (Vercel은 정적 파일을 rewrites보다 우선 서빙).
// 한국어판(/x)과 영어판(/en/x)을 함께 만들고, 서로를 hreflang으로 연결한다 (x-default = 영어판).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const BASE = 'https://www.uscollegeroadmap.com'
const dist = 'dist'
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const enPath = (p) => (p === '/' ? '/en' : `/en${p}`)

// head 치환 — 기존 태그를 정규식으로 교체 (title, canonical, description, og·twitter, html lang) + hreflang 추가
function render(title, description, path, lang, koPath) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const url = `${BASE}${path === '/' ? '' : path}`
  let h = template
  h = h.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
  h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
  h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  h = h.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
  h = h.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${lang === 'en' ? 'en_US' : 'ko_KR'}$2`)
  h = h.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
  h = h.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  const ko = `${BASE}${koPath === '/' ? '' : koPath}`
  const en = `${BASE}${enPath(koPath)}`
  const alt = `<link rel="alternate" hreflang="ko" href="${ko}" />\n    <link rel="alternate" hreflang="en" href="${en}" />\n    <link rel="alternate" hreflang="x-default" href="${en}" />`
  h = h.replace(/(<link rel="canonical"[^>]*>)/, `$1\n    ${alt}`)
  return h
}

function write(path, html) {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path.replace(/^\//, ''), 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

let pages = 0
// 한 화면의 한국어판·영어판을 함께 생성
function pair(path, [koTitle, koDesc], [enTitle, enDesc]) {
  write(path, render(koTitle, koDesc, path, 'ko', path))
  write(enPath(path), render(enTitle, enDesc, enPath(path), 'en', path))
  pages++
}

// ── 홈 ──
pair('/',
  ['미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', '한국 국제학교 학생을 위한 무료 미국 대학 입시 관리 툴 — 학년·전공·목표 학교에 맞춘 시즌별 체크리스트, 미국 대학 147곳 공식 데이터(합격률·SAT·ED·장학금), 전공 70개 가이드, 대학 지도.'],
  ['US College Roadmap — free U.S. college admissions planner', 'A free planner for U.S. college admissions — season-by-season checklists for your grade, major and target schools, official data on 147 colleges (admit rates, SAT, deadlines, aid), 73 major guides and a college map. For students and parents.'])

// ── 학교 147곳 ──
const schools = JSON.parse(readFileSync('src/data/schools.index.json', 'utf8'))
for (const s of schools) {
  const rank = s.kind === 'lac' ? `리버럴 아츠 칼리지 ${s.lac_rank ?? ''}위` : s.kind === 'art' ? '미술·디자인 전문학교, 포트폴리오 요구사항' : `미국 대학 순위 ${s.usnews_rank}위`
  const rankEn = s.kind === 'lac' ? `#${s.lac_rank ?? ''} liberal arts college` : s.kind === 'art' ? 'Art & design school — portfolio requirements' : `#${s.usnews_rank} national university (U.S. News)`
  const rate = s.overall_accept_rate != null ? ` 합격률 ${s.overall_accept_rate}%,` : ''
  const rateEn = s.overall_accept_rate != null ? ` ${s.overall_accept_rate}% acceptance rate,` : ''
  pair(`/schools/${slugify(s.name)}`,
    [`${s.name} 합격률·SAT·합격 전략 (${s.name_ko}) — 미국 대입 로드맵`,
      `${s.name}(${s.name_ko})${rate} SAT 중간 50%, 국제학생 합격률, ED/EA 마감, 보충 에세이, 장학금 — 공식 출처(CDS) 기준. ${rank}.`],
    [`${s.name} admission rate, SAT & requirements — US College Roadmap`,
      `${s.name}:${rateEn} SAT middle 50%, international acceptance rate, ED/EA deadlines, supplemental essays, course requirements, interviews, AP credit and aid — from official sources (Common Data Set). ${rankEn}.`])
}

// ── 전공 (majors.ts에서 value·label 파싱, 영어명은 괄호 안) ──
const majorsTs = readFileSync('src/data/majors.ts', 'utf8')
const majors = [...majorsTs.matchAll(/\{ value: '([^']+)', label: '([^']+)'/g)].map((m) => ({ value: m[1], label: m[2], en: (m[2].match(/\(([^)]+)\)/)?.[1] ?? m[2]) }))
for (const m of majors) {
  pair(`/major/${m.value}`,
    [`${m.label} 전공 — 미국 대학 진로·추천 AP 가이드 | 미국 대입 로드맵`,
      `${m.label} 전공의 배우는 내용, 졸업 후 직업·연봉·전망(미 노동통계국 공식), 추천 AP와 9~12학년 로드맵, 전공이 강한 미국 대학까지 정리했어요.`],
    [`${m.en} major — careers, pay & recommended APs | US College Roadmap`,
      `What you study in ${m.en}, careers, pay and outlook (U.S. Bureau of Labor Statistics), recommended AP courses, a grade 9–12 roadmap and U.S. colleges strong in ${m.en}.`])
}

// ── 주요 목록·가이드 페이지 ──
pair('/schools',
  ['미국 명문대 합격률·합격 전략 — 대학 147+ 공식 데이터 | 미국 대입 로드맵', '미국 대학 147곳의 합격률·국제학생 합격률·SAT 중간 50%·보충 에세이·장학금을 공식 출처(CDS)로만 정리 — 종합대 톱 100 + 리버럴 아츠 칼리지 35곳 + 미술·디자인 전문학교 11곳.'],
  ['Top U.S. colleges — admit rates, SAT & requirements for 147 schools | US College Roadmap', 'Acceptance rates, international admit rates, SAT middle 50%, supplemental essays and aid for 147 U.S. colleges — top 100 universities, 35 liberal arts colleges and 11 art & design schools — from official sources only.'])
pair('/majors',
  ['미국 대학 전공 가이드 — 유명 전공부터 희귀 전공까지 73+ | 미국 대입 로드맵', '컴퓨터과학부터 해양생물학·고고학까지 미국 대학 전공 73개의 진로·연봉 전망(미 노동통계국), 추천 AP, 4년 로드맵을 정리했어요.'],
  ['College major guide — 73+ majors, careers & recommended APs | US College Roadmap', 'From computer science to marine biology and archaeology: careers and pay outlook (U.S. BLS), recommended APs and a four-year high-school roadmap for 73 college majors.'])
pair('/guide/ap',
  ['AP 과목 가이드 — 새 AP·정책 변화·과목별 점수 분포 | 미국 대입 로드맵', 'AP 전 과목의 배우는 내용·권장 선수 과목·시험 형식(디지털/종이)과 2026년 점수 분포, 새로 생긴 AP와 디지털 시험·응시료·마감 등 최근 정책 변화, 대학별 AP 학점 인정 기준 — College Board·각 대학 공식 자료.'],
  ['AP course guide — score distributions, new APs & college AP credit | US College Roadmap', 'Every AP course: what you learn, prerequisites, exam format and 2026 score distributions, plus new APs, recent policy changes and AP credit policies at 147 colleges — from College Board and official college sources.'])
pair('/guide/courses',
  ['미국 대학 입시 수업 난이도(rigor) 가이드 — 학년별 추천 과목 | 미국 대입 로드맵', '9~12학년 수학·과학·영어·사회·외국어를 일반·심화·최상위 3단계로 정리한 수업 난이도 가이드와 전공별 핵심 과목 — Harvard·Princeton·Caltech·Yale 입학처 공식 권장 근거.'],
  ['High-school course rigor guide — recommended courses by grade | US College Roadmap', 'Math, science, English, social studies and world language for grades 9–12 in standard, advanced and most-rigorous tracks, with key courses by major — based on official guidance from Harvard, Princeton, Caltech and Yale admissions.'])
pair('/guide/cost',
  ['미국 대학 1년 비용 비교·국제학생 재정지원 자격 | 미국 대입 로드맵', '미국 대학 147곳의 국제학생 1년 총비용(학비·기숙사·식비·교재)을 공식 Cost of Attendance로 비교하고, 연방·주 정부·학교 재정지원을 국제학생과 시민권·영주권자가 각각 받을 수 있는지 미국 교육부 공식 자료로 정리했어요.'],
  ['U.S. college cost comparison & financial aid eligibility | US College Roadmap', 'Compare the official yearly cost of attendance at 147 U.S. colleges and see which federal, state and college aid international students and U.S. citizens/permanent residents can receive — from U.S. Department of Education sources.'])
pair('/guide/programs',
  ['미국 대입 대회·서머 프로그램 가이드 — 전공별 추천·국제학생 참가 자격 | 미국 대입 로드맵', 'USACO·AMC·ISEF·RSI·PROMYS·YYGS·RISD Pre-College 등 전공별 대회와 서머 프로그램 75개의 내용, 국제학생 참가 자격, 비용, 운영하거나 공식 언급한 대학(MIT·Caltech 입학처 등)을 공식 출처로 정리했어요.'],
  ['Competitions & summer programs by major — eligibility & official mentions | US College Roadmap', '75 competitions and summer programs by major — USACO, AMC, ISEF, RSI, PROMYS, YYGS, RISD Pre-College and more — with eligibility (including international students), cost and which colleges run or officially mention them.'])
pair('/guide/english',
  ['미국 대학 영어 시험(TOEFL·IELTS·Duolingo) 기준과 면제 조건 | 미국 대입 로드맵', '미국 대학 147곳의 TOEFL·IELTS·Duolingo 최소 점수, SAT 영어 점수로 대체 가능 여부, 면제 조건(2·3·4년)과 면제를 받으려면 직접 요청해야 하는지를 각 대학 공식 입학처 페이지로 확인해 정리했어요.'],
  ['TOEFL, IELTS & Duolingo requirements and waivers at U.S. colleges | US College Roadmap', 'Minimum TOEFL, IELTS and Duolingo scores at 147 U.S. colleges, whether SAT scores can replace them, waiver rules (2, 3 or 4 years of English-medium school) and whether you must request a waiver — checked on official admissions pages.'])
pair('/majors/trends',
  ['미국 대학 전공 트렌드 — 인기 전공·뜨는 전공·취업 잘되는 전공 (공식 통계) | 미국 대입 로드맵', '미 교육부 통계청(NCES) 학사 학위 수로 본 인기·성장·감소 전공과, 뉴욕 연방준비은행 자료로 본 전공별 최근 졸업생 실업률·불완전 취업·초봉, 덜 알려졌지만 지표가 좋은 전공을 정리했어요.'],
  ['College major trends — popular, rising and high-outcome majors (official data) | US College Roadmap', 'Popular, growing and shrinking majors by bachelor’s degrees awarded (NCES), plus recent-graduate unemployment, underemployment and early-career wages by major (Federal Reserve Bank of New York) and lesser-known majors with strong outcomes.'])
pair('/about',
  ['서비스 소개·데이터 출처와 원칙 | 미국 대입 로드맵', '미국 대입 컨설팅 평균 $6,304 — 이 서비스는 무료예요. Common Data Set·각 대학 공식 입학처·College Board·NCES·BLS 등 공식 출처만 쓰고, 확인 못 한 값은 비워 두며, 합격 확률을 예측하지 않는 원칙을 소개해요.'],
  ['About — why it’s free, data sources & principles | US College Roadmap', 'College consulting averages $6,304 — this service is free. We use only official sources (Common Data Set, college admissions offices, College Board, NCES, BLS), leave unverified values blank and never predict admission chances.'])
pair('/privacy',
  ['개인정보처리방침 | 미국 대입 로드맵', '미국 대입 로드맵이 수집하는 정보, 이용 목적, 판매·광고 없음, 보관과 삭제, 이용 대상을 안내해요.'],
  ['Privacy Policy | US College Roadmap', 'What US College Roadmap collects, how it is used, no selling or ads, retention and deletion, and who the service is for.'])
pair('/terms',
  ['이용약관 | 미국 대입 로드맵', '무료 미국 대입 정보·기록 도구인 미국 대입 로드맵의 이용약관이에요.'],
  ['Terms of Use | US College Roadmap', 'Terms of use for US College Roadmap, a free U.S. college admissions information and planning tool.'])
pair('/map',
  ['미국 대학 지도 — 명문대 147곳 위치를 한눈에 | 미국 대입 로드맵', '미국 지도 위에서 명문대 147곳의 위치를 로고로 확인하세요 — 동북부·캘리포니아 확대, 순위 필터, 학교 검색 지원.'],
  ['U.S. college map — 147 top colleges at a glance | US College Roadmap', 'See where 147 top U.S. colleges are on a map, with logos, regional zoom, rank filters and search.'])
pair('/demo',
  ['체험 모드 — 로그인 없이 예시 학생 리포트 보기 | 미국 대입 로드맵', '가상의 11학년 CS 지망 학생으로 시즌 리포트, 목표 학교 내 위치, 내 원서(과목 분석·활동·에세이·추천서)를 로그인 없이 둘러보세요.'],
  ['Try it — sample student report, no login | US College Roadmap', 'Explore a fictional grade-11 CS applicant’s season report, target-school positioning and application workspace (course analysis, activities, essays, recommenders) without signing in.'])

console.log(`prerender-heads: ${pages} pages × 2 languages (ko + en)`)
