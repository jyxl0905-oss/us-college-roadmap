import { majorAlias } from '../data/majors'
import { rungOf, subjectOf, type CourseInput } from './courseRecs'

// 전공 맞춤 다음 학년 수업 추천 — 전공 가이드 맵(사용자 승인 원문 major-roadmaps)의 "추천 AP" 목록을 내 과목 기록과 대조
// + 그 전공 로드맵의 다음 학년 학업 항목. 새 조언을 만들지 않고 승인된 문구만 씀

export interface RoadmapMajor { title: string; ap: string[]; roadmap: Record<string, { academic: string[]; activity: string[] }> }
export type ApItemStatus = 'done' | 'now' | 'partial' | 'todo' | 'later' | 'info'
export interface ApItem { head: string; why: string | null; status: ApItemStatus; matched: string[] }
export interface MajorPlan { roadmapKey: string; borrowed: boolean; title: string; items: ApItem[]; nextAcademic: string[] }

// 추천 문구 속 AP 이름 → 내 과목(AP·IB)과 맞춰볼 규칙. 문구 쪽(item)·과목 쪽(course) 정규식
const KEYS: { key: string; item: RegExp; course: RegExp }[] = [
  { key: 'calc_bc', item: /calc(ulus)?\s*bc/i, course: /cal(c(ulus)?)?\.?\s*bc/i },
  { key: 'calc_ab', item: /calc(ulus)?[^,—+]*\bab\b/i, course: /cal(c(ulus)?)?\.?\s*(ab|bc)/i }, // BC를 들었으면 AB 이상 충족
  { key: 'calc', item: /ap calculus(?![^,—+]*\b(ab|bc)\b)|calculus \(/i, course: /(?<!pre[-\s]?)\bcal(c(ulus)?)?\b/i },
  { key: 'cs_a', item: /cs a\b|computer science a\b|computer science principles\/a/i, course: /computer science a\b|\bcs\s*a\b|\bcsa\b/i },
  { key: 'csp', item: /computer science principles/i, course: /computer science principles|\bcsp\b/i },
  { key: 'phys_c_em', item: /physics c: e&m|e&m/i, course: /physics\s*c.*(e\s*&\s*m|electric)/i },
  { key: 'phys_c', item: /physics c(?!: e&m)\b|\(또는 c\)|\(or c\)/i, course: /physics\s*c\b/i },
  { key: 'phys_1', item: /physics 1\b/i, course: /physics\s*(1|i)\b/i },
  { key: 'chem', item: /chemistry/i, course: /chem/i },
  { key: 'bio', item: /biology/i, course: /\bbio/i },
  { key: 'stats', item: /statistics/i, course: /stat/i },
  { key: 'psych', item: /psychology/i, course: /psych/i },
  { key: 'micro', item: /micro/i, course: /micro/i },
  { key: 'macro', item: /macro/i, course: /macro/i },
  { key: 'eng_lang', item: /english lang|english language|english \(|english·|english\/|ap english$/i, course: /english\s*lang|lang(uage)?\s*(and|&)\s*comp/i },
  { key: 'eng_lit', item: /english lit|english literature|language\/literature|\+ ap english lang/i, course: /english\s*lit|lit(erature)?\s*(and|&)\s*comp/i },
  { key: 'world', item: /world/i, course: /world/i },
  { key: 'euro', item: /european/i, course: /euro/i },
  { key: 'us_hist', item: /us\/world history|u\.s\. history|us history/i, course: /us\s*history|apush|united states history|u\.s\.?\s*history/i },
  { key: 'gov', item: /gov/i, course: /gov/i },
  { key: 'art_hist', item: /art history/i, course: /art history/i },
  { key: 'env', item: /environmental/i, course: /environmental/i },
  { key: 'music', item: /music theory/i, course: /music theory/i },
  { key: 'art_design', item: /art & design|studio art|drawing/i, course: /2-?d|3-?d|drawing|art\s*(&|and)\s*design|studio art/i },
  { key: 'lang_ap', item: /외국어 ap|language ap|world language ap|foreign language ap/i, course: /spanish|french|chinese|japanese|german|latin|italian/i },
]

export function roadmapKeyFor(major: string | null, data: Record<string, RoadmapMajor>): string | null {
  if (!major) return null
  let k = major
  for (let i = 0; i < 5 && !data[k] && majorAlias[k]; i++) k = majorAlias[k]
  return data[k] ? k : null
}

export function majorCoursePlan(courses: CourseInput[], grade: number, major: string | null, data: Record<string, RoadmapMajor>): MajorPlan | null {
  const key = roadmapKeyFor(major, data)
  if (!key || key === 'undecided') return null
  const m = data[key]
  const g = Math.min(12, Math.max(9, grade))
  const next = Math.min(12, g + 1)
  const advanced = courses.filter((c) => c.level === 'ap' || c.level === 'ib' || /\bap\b|\bib\b/i.test(c.name))
  const has = (re: RegExp, when: 'past' | 'now') => advanced.filter((c) => (when === 'past' ? c.grade < g : c.grade === g) && re.test(c.name)).map((c) => c.name)
  const mathTop = Math.max(-1, ...courses.filter((c) => subjectOf(c) === 'math').map((c) => rungOf('math', c)))

  const items: ApItem[] = m.ap.map((raw) => {
    const [head, ...rest] = raw.split(' — ')
    const why = rest.join(' — ') || null
    // "A 또는 B" / "A/B" = 하나만, "A + B" = 둘 다
    const keys = KEYS.filter((k) => k.item.test(head))
    // 더 구체적인 키가 있으면 일반 키 제외 (BC가 있으면 calc 제외, E&M이 있으면 phys_c 제외 등)
    const ks = keys.filter((k) => !(k.key === 'calc' && keys.some((x) => x.key === 'calc_bc' || x.key === 'calc_ab')) && !(k.key === 'phys_c' && keys.some((x) => x.key === 'phys_c_em') && !/mechanics/i.test(head)))
    if (ks.length === 0) return { head, why, status: 'info', matched: [] }
    const needAll = /\+/.test(head)
    const past = ks.map((k) => has(k.course, 'past'))
    const now = ks.map((k) => has(k.course, 'now'))
    const hit = ks.map((_, i) => past[i].length > 0 || now[i].length > 0)
    const matched = [...new Set([...past.flat(), ...now.flat()])]
    let status: ApItemStatus
    if (needAll ? hit.every(Boolean) : hit.some(Boolean)) status = past.some((p) => p.length > 0) && !now.some((n) => n.length > 0) ? 'done' : 'now'
    else if (needAll && hit.some(Boolean)) status = 'partial'
    else status = ks.some((k) => k.key.startsWith('calc')) && mathTop >= 0 && mathTop < 3 && !courses.some((c) => c.level === 'ib' && subjectOf(c) === 'math') ? 'later' : 'todo'
    return { head, why, status, matched }
  })
  return { roadmapKey: key, borrowed: key !== major, title: m.title, items, nextAcademic: g >= 12 ? [] : m.roadmap[String(next)]?.academic ?? [] }
}
