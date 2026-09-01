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

// ── 학교 136곳 ──
const schools = JSON.parse(readFileSync('src/data/schools.index.json', 'utf8'))
for (const s of schools) {
  const rank = s.kind === 'lac' ? `리버럴 아츠 칼리지 ${s.lac_rank ?? ''}위` : `미국 대학 순위 ${s.usnews_rank}위`
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
emit('/schools', '미국 명문대 합격률·합격 전략 — 대학 136+ 공식 데이터 | 미국 대입 로드맵',
  '미국 대학 136곳의 합격률·국제학생 합격률·SAT 중간 50%·보충 에세이·장학금을 공식 출처(CDS)로만 정리 — 종합대 톱 100 + 리버럴 아츠 칼리지 35곳.')
emit('/majors', '미국 대학 전공 가이드 — 유명 전공부터 희귀 전공까지 73+ | 미국 대입 로드맵',
  '컴퓨터과학부터 해양생물학·고고학까지 미국 대학 전공 73개의 진로·연봉 전망(미 노동통계국), 추천 AP, 4년 로드맵을 정리했어요.')
emit('/map', '미국 대학 지도 — 명문대 136곳 위치를 한눈에 | 미국 대입 로드맵',
  '미국 지도 위에서 명문대 136곳의 위치를 로고로 확인하세요 — 동북부·캘리포니아 확대, 순위 필터, 학교 검색 지원.')

console.log(`prerender-heads: ${schools.length} schools + ${majors.length} majors + 3 lists`)
