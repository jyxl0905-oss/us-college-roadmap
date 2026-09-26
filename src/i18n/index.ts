// 초경량 i18n — 화면 문구는 t('한국어', 'English') 인라인. 언어 바꾸면 App이 key로 리마운트되어 전부 갱신됨.
// DB 콘텐츠(체크리스트·처방·용어집·가이드 맵·학교 소개)는 한국어 원문 — 영어판은 별도 번역 배치(승인 후)에서.
export type Lang = 'ko' | 'en'
const KEY = 'lang'

// 언어는 주소로 정함: /en/... = 영어, 그 외 = 한국어 (검색엔진이 언어별 페이지를 구분하도록).
// 영어를 골라 둔 사용자가 한국어 주소로 오면 main.tsx가 /en 주소로 옮겨 줌.
const onEn = () => typeof window !== 'undefined' && (window.location.pathname === '/en' || window.location.pathname.startsWith('/en/'))
let current: Lang = onEn() ? 'en' : 'ko'
export const savedLang = (): Lang | null => { try { const v = localStorage.getItem(KEY); return v === 'ko' || v === 'en' ? v : null } catch { return null } }
// index.html은 lang="ko" 고정 — 저장된/감지된 언어가 영어면 첫 로딩부터 맞춰줌 (스크린리더·번역 확장 기준)
// 기본 탭 제목도 언어에 맞춤 (페이지별 제목이 없는 화면 — 체험 모드·리포트 등)
const DEFAULT_TITLE = { ko: '미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', en: 'US College Roadmap — free US college admissions planner' }
function syncDefaultTitle() {
  if (document.title === DEFAULT_TITLE.ko || document.title === DEFAULT_TITLE.en) document.title = DEFAULT_TITLE[current]
}
if (typeof document !== 'undefined') { document.documentElement.lang = current; syncDefaultTitle() }

export function getLang(): Lang {
  return current
}

export function setLang(l: Lang): void {
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  // 주소도 같은 화면의 해당 언어판으로 (/x ↔ /en/x)
  try {
    const p = window.location.pathname
    const base = p === '/en' ? '/' : p.startsWith('/en/') ? p.slice(3) : p
    const rest = window.location.search + window.location.hash
    const next = l === 'en' ? `/en${base === '/' ? '' : base}${rest}` : `${base}${rest}`
    window.history.replaceState(window.history.state, '', next)
    window.dispatchEvent(new Event('app:navigate'))
  } catch { /* ignore */ }
  document.documentElement.lang = l
  syncDefaultTitle()
  window.dispatchEvent(new Event('app:lang'))
}

// 부모 계정: 학생 기준 '내 ○○' 문구를 '자녀 ○○'로 (정해진 표현만 바꿈 — 기록·분석은 동일)
let audience: 'student' | 'parent' = 'student'
export const getAudience = () => audience
export function setAudience(a: 'student' | 'parent'): void { audience = a }
const KO_PARENT: [RegExp, string][] = [
  [/내 (원서|리포트|위치|과목|기록|GPA|계획|성적|활동|점수|전공|목표|학교|입시|수업|시험|에세이|추천서|체크리스트|진로|AP)/g, '자녀 $1'],
  [/내가 적은/g, '적어 둔'],
  [/나를 대표하는/g, '자녀를 대표하는'],
]
const EN_PARENT: [RegExp, string][] = [
  [/\bMy App\b/g, 'My Child’s App'],
  [/\b(M|m)y (application|report|courses|plans|GPA|grades|activities|scores|record|records|major|targets|target schools|position)\b/g, '$1y child’s $2'],
  [/\bWhere you are\b/g, 'Where your child is'],
  [/\byour (courses|record|records|grades|GPA|activities|scores|plans|report|APs|AP scores|transcript)\b/g, 'your child’s $1'],
]
const parentize = (s: string, rules: [RegExp, string][]) => rules.reduce((acc, [re, to]) => acc.replace(re, to), s)

export function t(ko: string, en: string): string {
  if (audience === 'parent') return current === 'ko' ? parentize(ko, KO_PARENT) : parentize(en, EN_PARENT)
  return current === 'ko' ? ko : en
}

// 언어별 라벨 맵 — 접근 시점의 언어로 값을 돌려줌 (모듈 상수처럼 쓰되 토글에 반응)
export function bilingual<K extends string | number>(ko: Record<K, string>, en: Record<K, string>): Record<K, string> {
  return new Proxy(ko, {
    get: (target, key) => (current === 'ko' ? (target as Record<string, string>)[key as string] : (en as Record<string, string>)[key as string]),
  }) as Record<K, string>
}

// DB 콘텐츠 현지화 — 행에 `xxx_en` 컬럼이 있고 값이 있으면(영어 모드) `xxx_ko` 또는 `xxx` 필드를 덮어씀.
// 예: title_en→title, text_en→text_ko, intro_en→intro_ko. 영어값이 비어 있으면 한국어 원문 유지.
export function localizeRow<T extends object>(row: T): T {
  if (current === 'ko' || !row) return row
  const r = row as Record<string, unknown>
  let out: Record<string, unknown> | null = null
  for (const key of Object.keys(r)) {
    if (!key.endsWith('_en')) continue
    const en = r[key]
    if (typeof en !== 'string' || en.trim() === '') continue
    const base = key.slice(0, -3)
    const target = `${base}_ko` in r ? `${base}_ko` : base in r ? base : null
    if (!target) continue
    if (!out) out = { ...r }
    out[target] = en
  }
  return (out ?? r) as T
}

export function localizeRows<T extends object>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).map(localizeRow)
}
