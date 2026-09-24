import { COURSE_CATALOG } from '../data/courseCatalog'

// 과목명 자동완성 — 줄임말·오타·한국어 입력도 표준 과목명으로 (예: "cal bc" → AP Calculus BC, "spainish2" → Spanish 2)

// 줄임말·한국어 → 표준 단어
const ALIAS: Record<string, string[]> = {
  cal: ['calculus'], calc: ['calculus'], precal: ['precalculus'], precalc: ['precalculus'], pre: ['precalculus'],
  alg: ['algebra'], geo: ['geometry'], trig: ['trigonometry'], stat: ['statistics'], stats: ['statistics'],
  bio: ['biology'], chem: ['chemistry'], phys: ['physics'], physic: ['physics'], env: ['environmental'], enviro: ['environmental'], apes: ['ap', 'environmental'],
  eng: ['english'], lang: ['language'], lit: ['literature'], comp: ['composition'],
  gov: ['government'], govt: ['government'], econ: ['economics'], macro: ['macroeconomics'], micro: ['microeconomics'], psych: ['psychology'], psy: ['psychology'],
  euro: ['european'], apush: ['ap', 'us', 'history'], usa: ['us'], american: ['us'], hug: ['human', 'geography'],
  cs: ['computer', 'science'], csa: ['computer', 'science', 'a'], csp: ['computer', 'science', 'principles'],
  mandarin: ['chinese'], pe: ['physical', 'education'],
  ii: ['2'], iii: ['3'], iv: ['4'],
  미적분: ['calculus'], 프리캘: ['precalculus'], 대수: ['algebra'], 기하: ['geometry'], 통계: ['statistics'],
  생물: ['biology'], 화학: ['chemistry'], 물리: ['physics'], 환경: ['environmental'],
  영어: ['english'], 문학: ['literature'], 미국사: ['us', 'history'], 세계사: ['world', 'history'], 경제: ['economics'], 심리: ['psychology'], 정치: ['government'],
  스페인어: ['spanish'], 프랑스어: ['french'], 중국어: ['chinese'], 일본어: ['japanese'], 독일어: ['german'], 라틴어: ['latin'], 한국어: ['korean'],
  컴퓨터: ['computer', 'science'], 미술: ['art'], 음악: ['music'],
}

const norm = (s: string): string[] =>
  s.toLowerCase()
    .replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2') // spanish2 → spanish 2
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .trim().split(' ').filter(Boolean)

const expand = (tokens: string[]): string[] => tokens.flatMap((w) => ALIAS[w] ?? [w])

// 편집 거리 (짧은 단어용)
function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

// 입력 단어 하나가 과목명 단어와 얼마나 맞는지 (3 정확 · 2 앞부분 · 1 오타 허용 · 0 불일치)
function tokenScore(q: string, t: string): number {
  if (q === t) return 3
  if (/^\d+$/.test(q) || q.length === 1) return 0 // 숫자·한 글자(A·C)는 정확히 같아야
  if (t.startsWith(q)) return 2
  if (q.length >= 4 && Math.abs(q.length - t.length) <= 2 && lev(q, t) <= (q.length >= 7 ? 2 : 1)) return 1
  return 0
}

const CATALOG = COURSE_CATALOG.map((name) => ({ name, tokens: norm(name) }))

export function suggestCourses(input: string, limit = 6): string[] {
  const q = expand(norm(input))
  if (q.length === 0) return []
  const scored: { name: string; score: number; extra: number }[] = []
  for (const c of CATALOG) {
    let score = 0
    const used = new Set<number>()
    let ok = true
    for (const w of q) {
      let best = 0, bestIdx = -1
      c.tokens.forEach((t, i) => { if (used.has(i)) return; const s = tokenScore(w, t); if (s > best) { best = s; bestIdx = i } })
      if (best === 0) { ok = false; break }
      used.add(bestIdx)
      score += best
    }
    if (ok) scored.push({ name: c.name, score, extra: c.tokens.length - used.size })
  }
  // 점수 높은 순 → 남는 단어 적은 순(= 더 딱 맞는 이름) → 짧은 이름
  return scored.sort((a, b) => b.score - a.score || a.extra - b.extra || a.name.length - b.name.length).slice(0, limit).map((s) => s.name)
}

// 표준 이름이 가리키는 레벨 (AP·IB 과목은 레벨 자동 설정)
export function levelFromName(name: string): 'ap' | 'ib' | null {
  if (/^AP\s/.test(name)) return 'ap'
  if (/^IB\s/.test(name)) return 'ib'
  return null
}
