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
  window.history.pushState({}, '', to)
  window.dispatchEvent(new Event('app:navigate'))
  window.scrollTo(0, 0)
}

// 학교명 → URL slug (예: "University of California, Berkeley" → university-of-california-berkeley)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
