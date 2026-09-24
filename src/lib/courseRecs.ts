import { SUBJECTS, ladders, subjectMatch, ibMathLadder, majorCores, subjectLabel, type Subject } from '../data/courseGuide'
import { majorParent } from '../data/majors'

// 다음 학년 수강 추천 — 학업 탭 과목 기록(학년·과목명·레벨)을 과목 단계표에 대입해 최대 2개 제안
// 우선순위: ① 전공 핵심 과목 빠짐 ② 수학 다음 칸 ③ 올해 빠진 핵심 과목 ④ 같은 과목 레벨 올리기

export interface CourseInput { grade: number; name: string; level: string }
export interface CourseRec { kind: 'major' | 'next' | 'missing' | 'level'; ko: string; en: string; url?: string }

// 레벨을 이름에 반영해 판별 (예: level=ap, name='US History' → 'AP US History')
const effName = (c: CourseInput): string => {
  const n = c.name.trim()
  if (c.level === 'ap' && !/\bap\b/i.test(n)) return `AP ${n}`
  if (c.level === 'honors' && !/honou?rs?/i.test(n)) return `Honors ${n}`
  return n
}

export const subjectOf = (c: CourseInput): Subject | null => {
  const n = c.name
  // 외국어를 먼저 — 'AP Spanish Language'가 영어(language)로 잡히지 않도록
  if (subjectMatch.language.test(n)) return 'language'
  for (const s of SUBJECTS) if (s !== 'language' && subjectMatch[s].test(n)) return s
  return null
}

// 과목 단계 인덱스 (못 찾으면 -1). 레벨로 하한 보정: 과학·영어·사회 AP/Honors
export function rungOf(subject: Subject, c: CourseInput): number {
  const n = effName(c)
  const ladder = ladders[subject]
  let idx = -1
  ladder.forEach((r, i) => { if (r.match.test(n)) idx = Math.max(idx, i) })
  if (subject === 'science' && c.level === 'ap') idx = Math.max(idx, /physics\s*c\b/i.test(n) ? 4 : 3)
  if (subject === 'english') {
    if (c.level === 'honors') idx = Math.max(idx, 2)
    if (c.level === 'ap') idx = Math.max(idx, /lit/i.test(n) ? 4 : 3)
  }
  if (subject === 'social' && c.level === 'ap' && idx < 1) idx = 1
  if (subject === 'language' && c.level === 'ap') idx = 4
  return idx
}

const levelRank: Record<string, number> = { regular: 0, honors: 1, ap: 2, ib: 2 }

export function recommendCourses(courses: CourseInput[], currentGrade: number, majorPrimary: string | null): CourseRec[] {
  if (currentGrade >= 12 || courses.length === 0) return []
  const next = currentGrade + 1
  const recs: CourseRec[] = []
  const names = courses.map(effName)

  // ① 전공 핵심 과목
  const parent = majorParent(majorPrimary)
  const core = majorCores.find((m) => (majorPrimary && m.groups.includes(majorPrimary)) || (parent && m.groups.includes(parent)))
  if (core) {
    // 수학이 아직 Precalculus 전이면 미적분은 한 해 만에 못 감 → 전공 추천에서 빼고 ②의 수학 다음 칸이 대신 안내
    const mathTopNow = Math.max(-1, ...courses.filter((c) => subjectOf(c) === 'math').map((c) => rungOf('math', c)))
    const hasIbMath = courses.some((c) => c.level === 'ib' && subjectOf(c) === 'math')
    const hasIbCalc = courses.some((c) => subjectOf(c) === 'math' && /(aa|analysis)/i.test(c.name)) // IB Math AA(SL·HL)는 미적분 포함
    const missing = core.needs
      .filter((need) => !names.some((n) => need.match.test(n)))
      .filter((need) => !(need.label === 'Calculus' && hasIbCalc))
      .filter((need) => !(need.label === 'Calculus' && !hasIbMath && mathTopNow < 3))
    if (missing.length > 0) {
      const list = missing.map((m) => m.label).join(', ')
      recs.push({
        kind: 'major',
        ko: `${core.ko} 지망이면 ${next}학년에 넣어보세요: ${list} — ${core.source} 입학처가 권장하는 과목이에요.`,
        en: `For ${core.en}, consider adding ${list} in grade ${next} — recommended by ${core.source} admissions.`,
        url: core.url,
      })
    }
  }

  // ② 수학 다음 칸 (IB 수학이면 IB 사다리)
  const ibMath = courses.filter((c) => c.level === 'ib' && subjectOf(c) === 'math')
  if (ibMath.length > 0) {
    let top = -1
    ibMath.forEach((c) => ibMathLadder.forEach((r, i) => { if (r.match.test(c.name)) top = Math.max(top, i) }))
    if (top >= 0 && top < ibMathLadder.length - 1) {
      const nx = ibMathLadder[top + 1].name
      recs.push({ kind: 'next', ko: `수학: ${ibMathLadder[top].name} 다음 단계는 ${nx}예요.`, en: `Math: the next step after ${ibMathLadder[top].name} is ${nx}.` })
    }
  } else {
    const mathTop = Math.max(-1, ...courses.filter((c) => subjectOf(c) === 'math').map((c) => rungOf('math', c)))
    const lad = ladders.math
    if (mathTop >= 0 && mathTop < lad.length - 1) {
      const cur = lad[mathTop].name
      const nx = mathTop === 4 ? 'AP Calculus BC' : lad[mathTop + 1].name
      recs.push({ kind: 'next', ko: `수학: ${cur} 다음 단계는 ${nx}예요 (${next}학년).`, en: `Math: the next step after ${cur} is ${nx} (grade ${next}).` })
    }
  }

  // ③ 올해 빠진 핵심 과목 — 올해 과목을 3개 이상 적은 경우에만 (다 안 적은 학생 오탐 방지)
  const thisYear = courses.filter((c) => c.grade === currentGrade)
  if (thisYear.length >= 3) {
    const have = new Set(thisYear.map(subjectOf).filter(Boolean))
    const miss = SUBJECTS.filter((s) => !have.has(s))
    if (miss.length > 0) {
      const ko = miss.map((s) => subjectLabel[s].ko).join('·')
      const en = miss.map((s) => subjectLabel[s].en).join(', ')
      recs.push({
        kind: 'missing',
        ko: `올해 기록에 ${ko} 과목이 없어요 — Yale은 매년 영어·수학·과학·사회·외국어를 들으라고 권해요.`,
        en: `No ${en} course recorded this year — Yale advises taking English, math, science, social studies and a language every year.`,
        url: 'https://admissions.yale.edu/advice-selecting-high-school-courses',
      })
    }
  }

  // ④ 같은 과목 레벨 올리기 — 올해 일반 레벨인 핵심 과목 하나 (영어 → 과학 → 사회 순)
  const regular = (['english', 'science', 'social'] as Subject[])
    .map((s) => thisYear.find((c) => subjectOf(c) === s && (levelRank[c.level] ?? 0) === 0))
    .find(Boolean)
  if (regular) {
    const s = subjectOf(regular) as Subject
    recs.push({
      kind: 'level',
      ko: `${subjectLabel[s].ko}: 지금 일반 레벨(${regular.name})이에요 — ${next}학년엔 Honors나 AP로 한 단계 올려보세요.`,
      en: `${subjectLabel[s].en}: currently regular level (${regular.name}) — try stepping up to Honors or AP in grade ${next}.`,
    })
  }

  return recs.slice(0, 2)
}

// ── 내 위치 분석: 올해(현재 학년) 과목 기록 → 학년별 가이드 표의 [일반·심화·최상위] 중 어디인지 ──
// 표 칸이 편집 가이드이므로 판정도 같은 기준의 근사치 (학교마다 개설 과목이 다름)
export type Tier = 0 | 1 | 2
export interface Position { subject: Subject; tier: Tier | null; status: 'ok' | 'none' | 'unrecognized'; course: string | null }

const cellRank = (subject: Subject, cell: string): number => {
  if (subject === 'language') { if (/선택|optional/i.test(cell)) return -1; if (/\bAP\b/.test(cell)) return 4; const m = cell.match(/Level\s*(\d)/); return m ? Number(m[1]) - 1 : -1 }
  return rungOf(subject, { grade: 0, name: cell, level: /\bAP\b/.test(cell) ? 'ap' : 'regular' })
}

export function coursePosition(courses: CourseInput[], grade: number, row: (s: Subject) => [string, string, string]): Position[] {
  const g = Math.min(12, Math.max(9, grade))
  const thisYear = courses.filter((c) => c.grade === g)
  return SUBJECTS.map((subject): Position => {
    const list = thisYear.filter((c) => subjectOf(c) === subject)
    if (list.length === 0) return { subject, tier: null, status: 'none', course: null }
    const lv = (c: CourseInput) => levelRank[c.level] ?? 0
    const apCount = list.filter((c) => lv(c) === 2 && c.level !== 'ib').length
    const best = [...list].sort((a, b) => rungOf(subject, b) - rungOf(subject, a) || lv(b) - lv(a))[0]
    let tier: Tier | null = null
    if (subject === 'math' || subject === 'language') {
      const ib = list.find((c) => c.level === 'ib')
      if (subject === 'math' && ib) tier = /(aa|analysis).*\bhl\b|\bhl\b.*(aa|analysis)/i.test(ib.name) ? 2 : /(aa|analysis)/i.test(ib.name) ? 1 : 0
      else {
        const r = Math.max(...list.map((c) => rungOf(subject, c)))
        if (r < 0) return { subject, tier: null, status: 'unrecognized', course: best.name }
        const cells = row(subject).map((c) => cellRank(subject, c))
        tier = 0
        cells.forEach((cr, i) => { if (cr >= 0 && r >= cr) tier = i as Tier })
      }
    } else {
      const top = Math.max(...list.map(lv))
      const hasLit = list.some((c) => lv(c) === 2 && /lit/i.test(c.name))
      const physC = list.some((c) => /physics\s*c\b/i.test(c.name))
      if (subject === 'english') tier = top === 2 ? (g >= 11 ? (g === 12 && !hasLit ? 1 : 2) : 1) : top === 1 ? 1 : 0
      if (subject === 'social') tier = g <= 10 ? (top === 2 ? (g === 10 ? 2 : 1) : top === 1 ? 1 : 0) : g === 11 ? (top === 2 ? 1 : 0) : apCount >= 2 ? 2 : apCount === 1 ? 1 : 0
      if (subject === 'science') tier = g === 9 ? (top >= 1 ? 1 : 0) : g === 10 ? (top === 2 ? 2 : top === 1 ? 1 : 0) : g === 11 ? (apCount >= 2 ? 2 : apCount === 1 ? 1 : 0) : (physC || apCount >= 2 ? 2 : apCount === 1 ? 1 : 0)
      if (top === 2 && list.every((c) => c.level === 'ib')) tier = Math.max(tier ?? 0, 1) as Tier // IB 과목은 심화 이상으로 봄
    }
    // 표에서 심화=최상위 같은 칸이면 둘 다 같은 위치로 취급
    const r3 = row(subject)
    if (tier === 2 && r3[1] === r3[2]) tier = 1
    return { subject, tier, status: 'ok', course: best.name }
  })
}
