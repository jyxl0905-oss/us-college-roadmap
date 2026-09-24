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
export interface Position {
  subject: Subject
  tier: Tier | null
  rowGrade: number // 비교한 표 줄 (외국어 늦게 시작하면 학년과 다름)
  merged: boolean // 표에서 심화=최상위가 같은 칸인 경우 (둘 다 해당)
  status: 'ok' | 'none' | 'unrecognized'
  course: string | null // 판정 기준이 된 과목
  courses: { name: string; level: string }[] // 이 과목 분류로 인식된 올해 과목 전부
  reason_ko: string; reason_en: string
}

const cellRank = (subject: Subject, cell: string): number => {
  if (subject === 'language') { if (/선택|optional/i.test(cell)) return -1; if (/\bAP\b/.test(cell)) return 4; const m = cell.match(/Level\s*(\d)/); return m ? Number(m[1]) - 1 : -1 }
  return rungOf(subject, { grade: 0, name: cell, level: /\bAP\b/.test(cell) ? 'ap' : 'regular' })
}

export function coursePosition(courses: CourseInput[], grade: number, rowOf: (s: Subject, g: number) => [string, string, string]): Position[] {
  const g = Math.min(12, Math.max(9, grade))
  const thisYear = courses.filter((c) => c.grade === g)
  // 외국어는 시작 학년 반영 — 이전 학년 기록은 있는데 외국어가 없으면 늦게 시작한 것으로 보고, 학년 대신 '몇 년차' 줄과 비교
  const langGrades = courses.filter((c) => subjectOf(c) === 'language').map((c) => c.grade)
  const langStart = langGrades.length ? Math.min(...langGrades) : 9
  const lateStart = langStart > 9 && langStart <= g && courses.some((c) => c.grade < langStart)
  const langRowGrade = lateStart ? 9 + (g - langStart) : g
  return SUBJECTS.map((subject): Position => {
    const list = thisYear.filter((c) => subjectOf(c) === subject)
    const listed = list.map((c) => ({ name: c.name, level: c.level }))
    const rowGrade = subject === 'language' ? langRowGrade : g
    const r3 = rowOf(subject, rowGrade)
    const merged = r3[1] === r3[2]
    const base = { subject, merged, courses: listed, rowGrade }
    if (list.length === 0) return { ...base, tier: null, status: 'none', course: null, reason_ko: '올해 기록이 없어요', reason_en: 'No course recorded this year' }
    const lv = (c: CourseInput) => levelRank[c.level] ?? 0
    const aps = list.filter((c) => c.level === 'ap')
    const ibs = list.filter((c) => c.level === 'ib')
    const honors = list.filter((c) => c.level === 'honors')
    const best = [...list].sort((a, b) => lv(b) - lv(a) || rungOf(subject, b) - rungOf(subject, a))[0]
    let tier: Tier = 0
    let reason_ko = ''
    let reason_en = ''

    if (subject === 'math' || subject === 'language') {
      const ib = ibs[0]
      if (subject === 'math' && ib) {
        tier = /(aa|analysis).*\bhl\b|\bhl\b.*(aa|analysis)/i.test(ib.name) ? 2 : /(aa|analysis)/i.test(ib.name) ? 1 : 0
        reason_ko = `IB 수학 ${ib.name} 기준`; reason_en = `Based on IB ${ib.name}`
      } else {
        const top = [...list].sort((a, b) => rungOf(subject, b) - rungOf(subject, a))[0]
        const r = rungOf(subject, top)
        if (r < 0) return { ...base, tier: null, status: 'unrecognized', course: top.name, reason_ko: '과목 단계를 알아보지 못했어요', reason_en: 'Couldn’t read the course level' }
        const cells = r3.map((c) => cellRank(subject, c))
        cells.forEach((cr, i) => { if (cr >= 0 && r >= cr) tier = i as Tier })
        // 같은 단계라도 Honors면 한 칸 위로 (예: Honors Precalculus)
        if (tier < 2 && top.level === 'honors' && subject === 'math') tier = (tier + 1) as Tier
        const step = subject === 'math' ? ladders.math[r]?.name : ladders.language[r]?.name
        if (subject === 'language' && lateStart) {
          const yr = g - langStart + 1
          reason_ko = `${top.name} → ${step} 단계 (${langStart}학년 시작 · ${yr}년차 → 9학년 시작 기준 ${yr}년차 줄과 비교)`
          reason_en = `${top.name} → ${step} level (started grade ${langStart} · year ${yr} → compared with year ${yr} of a grade-9 start)`
        } else {
          reason_ko = `${top.name} → ${step} 단계 (${g}학년 표와 비교)`; reason_en = `${top.name} → ${step} level (vs the grade ${g} row)`
        }
        if (subject === 'math' && top.level === 'honors' && tier > 0) { reason_ko += ' · Honors 반영'; reason_en += ' · Honors counted' }
        return { ...base, tier, merged: merged && tier >= 1, status: 'ok', course: top.name, reason_ko, reason_en }
      }
    } else {
      // 영어·과학·사회: 레벨 중심 — Honors는 최소 심화, AP는 개수와 학년 표 기준
      const nAp = aps.length + ibs.length
      const physC = list.some((c) => /physics\s*c\b/i.test(c.name))
      const hasLit = aps.some((c) => /lit/i.test(c.name))
      if (nAp === 0) tier = honors.length > 0 ? 1 : 0
      else if (subject === 'english') tier = g <= 10 ? 1 : g === 12 && !hasLit ? 1 : 2
      else if (subject === 'social') tier = g === 9 ? 1 : g === 10 ? 2 : g === 11 ? 2 : nAp >= 2 ? 2 : 1
      else if (subject === 'science') tier = g === 9 ? 1 : g === 10 ? 2 : g === 11 ? (nAp >= 2 ? 2 : 1) : (physC || nAp >= 2 ? 2 : 1)
      const lvName = (c: CourseInput) => (c.level === 'ap' ? 'AP' : c.level === 'ib' ? 'IB' : c.level === 'honors' ? 'Honors' : t_ko_regular)
      reason_ko = list.map((c) => `${c.name}(${lvName(c)})`).join(' · ') + (nAp > 0 ? ` → AP·IB ${nAp}개` : honors.length > 0 ? ' → Honors 있음' : ' → 모두 일반 레벨')
      reason_en = list.map((c) => `${c.name} (${c.level === 'regular' ? 'regular' : lvName(c)})`).join(' · ') + (nAp > 0 ? ` → ${nAp} AP/IB` : honors.length > 0 ? ' → Honors' : ' → all regular')
    }
    // 표에서 심화=최상위 같은 칸이면 '심화·최상위'로 묶어서 보여줌
    const isMerged = merged && tier >= 1
    if (isMerged) tier = 1
    return { ...base, tier, merged: isMerged, status: 'ok', course: best.name, reason_ko, reason_en }
  })
}
const t_ko_regular = '일반'

// ── 리거 추이: 학년별 AP·IB·Honors 개수 → 지난 학년보다 늘었는지 ──
// 기준은 이 사이트의 참고용 (학교마다 개설 과목·상한이 달라 절대 기준 아님)
export interface RigorYear { grade: number; total: number; ap: number; honors: number; adv: number }
export interface RigorTrend {
  years: RigorYear[]
  verdict: 'strong_up' | 'up' | 'steady_high' | 'steady' | 'down' | 'no_prev' | 'none'
  delta: number
  ko: string; en: string
}
export function rigorTrend(courses: CourseInput[], grade: number): RigorTrend {
  const g = Math.min(12, Math.max(9, grade))
  const years: RigorYear[] = []
  for (let y = 9; y <= g; y++) {
    const list = courses.filter((c) => c.grade === y)
    if (list.length === 0) continue
    const ap = list.filter((c) => c.level === 'ap' || c.level === 'ib').length
    const honors = list.filter((c) => c.level === 'honors').length
    years.push({ grade: y, total: list.length, ap, honors, adv: ap + honors })
  }
  const cur = years.find((y) => y.grade === g)
  const prev = [...years].reverse().find((y) => y.grade < g)
  if (!cur) return { years, verdict: 'none', delta: 0, ko: `${g}학년 과목을 적으면 지난 학년과 비교해 드려요.`, en: `Add your grade ${g} courses to compare with last year.` }
  if (!prev) return { years, verdict: 'no_prev', delta: 0, ko: '비교할 이전 학년 기록이 없어요 — 지난 학년 과목도 적으면 추이를 보여드려요.', en: 'No earlier year to compare — add last year’s courses to see the trend.' }
  const delta = cur.adv - prev.adv
  const apDelta = cur.ap - prev.ap
  const share = (y: RigorYear) => y.adv / y.total
  const shareUp = share(cur) - share(prev)
  const diff = `${prev.grade}학년 AP·IB ${prev.ap} + Honors ${prev.honors} → ${g}학년 AP·IB ${cur.ap} + Honors ${cur.honors}`
  const diffEn = `Grade ${prev.grade}: ${prev.ap} AP/IB + ${prev.honors} Honors → grade ${g}: ${cur.ap} AP/IB + ${cur.honors} Honors`
  if (delta >= 2 || (delta >= 1 && apDelta >= 1 && shareUp >= 0.2))
    return { years, verdict: 'strong_up', delta, ko: `${diff}. 심화 과목이 ${delta}개 늘어 '난이도를 올렸다'고 말할 수 있는 뚜렷한 흐름이에요.`, en: `${diffEn}. ${delta} more advanced courses — a clear upward rigor trend.` }
  if (delta === 1 || (delta === 0 && apDelta >= 1))
    return { years, verdict: 'up', delta, ko: `${diff}. 한 단계 올라갔어요 — 상승 흐름이지만 폭은 작아요. 다음 학년에 하나 더 올리면 추이가 분명해져요.`, en: `${diffEn}. One step up — an upward trend, but a small one. One more next year makes it clear.` }
  if (delta === 0 && share(cur) >= 0.5)
    return { years, verdict: 'steady_high', delta, ko: `${diff}. 이미 절반 이상이 심화 과목이고 그 수준을 유지하고 있어요.`, en: `${diffEn}. Over half your courses are already advanced, and you’re holding that level.` }
  if (delta === 0)
    return { years, verdict: 'steady', delta, ko: `${diff}. 지난 학년과 같아요 — 상승 추이로 보이려면 Honors·AP를 하나 이상 늘려보세요.`, en: `${diffEn}. Same as last year — add at least one Honors/AP to show an upward trend.` }
  return { years, verdict: 'down', delta, ko: `${diff}. 지난 학년보다 ${-delta}개 줄었어요 — 학교 개설 사정 같은 이유가 있다면 카운슬러가 추천서에서 설명할 수 있어요.`, en: `${diffEn}. ${-delta} fewer than last year — if your school’s offerings are the reason, your counselor can explain it.` }
}
