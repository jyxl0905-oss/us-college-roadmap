import { useEffect, useState } from 'react'

// 초경량 라우터 — /schools, /schools/:slug 등 고유 URL 직접 접근 지원
export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener('app:navigate', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('app:navigate', update)
    }
  }, [])
  return path
}

const currentUrl = () => window.location.pathname + window.location.search + window.location.hash

export function navigate(to: string): void {
  // 지금 보고 있는 화면과 같은 주소면 기록을 쌓지 않음 — 같은 탭·메뉴를 다시 눌렀을 때 뒤로가기가 두 번 필요해지는 문제 방지
  if (to === currentUrl()) { window.scrollTo(0, 0); return }
  // 앱 내 이동 깊이를 항목 state에 기록 — goBack()이 '직전 화면이 앱 안'인지 판단하는 근거
  const depth = ((window.history.state as { appDepth?: number } | null)?.appDepth ?? 0) + 1
  window.history.pushState({ appDepth: depth }, '', to)
  window.dispatchEvent(new Event('app:navigate'))
  window.scrollTo(0, 0)
}

// 리다이렉트: 현재 기록을 새 주소로 바꿈(쌓지 않음) — 뒤로가기가 리다이렉트 전 주소로 되돌아가 다시 튕기는 문제 방지
export function redirect(to: string): void {
  if (to === currentUrl()) return
  const depth = (window.history.state as { appDepth?: number } | null)?.appDepth ?? 0
  window.history.replaceState({ appDepth: depth }, '', to)
  window.dispatchEvent(new Event('app:navigate'))
  window.scrollTo(0, 0)
}

// 뒤로가기: 앱 안에서 이동해 온 기록이 있으면 브라우저 뒤로(직전 화면), 없으면(새 탭·직접 진입·새로고침) fallback으로
export function goBack(fallback: string): void {
  const depth = (window.history.state as { appDepth?: number } | null)?.appDepth ?? 0
  if (depth > 0) window.history.back()
  else navigate(fallback)
}

// 학교명 → URL slug (예: "University of California, Berkeley" → university-of-california-berkeley)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
