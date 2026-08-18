// 초경량 i18n — 화면 문구는 t('한국어', 'English') 인라인. 언어 바꾸면 App이 key로 리마운트되어 전부 갱신됨.
// DB 콘텐츠(체크리스트·처방·용어집·가이드 맵·학교 소개)는 한국어 원문 — 영어판은 별도 번역 배치(승인 후)에서.
export type Lang = 'ko' | 'en'
const KEY = 'lang'

let current: Lang = (() => {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
  if (saved === 'ko' || saved === 'en') return saved
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'ko'
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en'
})()

export function getLang(): Lang {
  return current
}

export function setLang(l: Lang): void {
  current = l
  localStorage.setItem(KEY, l)
  document.documentElement.lang = l
  window.dispatchEvent(new Event('app:lang'))
}

export function t(ko: string, en: string): string {
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
