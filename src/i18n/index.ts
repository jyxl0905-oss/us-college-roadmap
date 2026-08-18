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
