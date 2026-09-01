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

export function navigate(to: string): void {
  // 앱 내 이동 깊이를 항목 state에 기록 — goBack()이 '직전 화면이 앱 안'인지 판단하는 근거
  const depth = ((window.history.state as { appDepth?: number } | null)?.appDepth ?? 0) + 1
  window.history.pushState({ appDepth: depth }, '', to)
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
