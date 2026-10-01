import { supabase } from './supabase'

// 누적 방문자 집계 — 브라우저마다 무작위 ID(개인정보 아님) 1개, 하루 한 번만 기록. 운영 사이트에서만, 봇 제외
const VID_KEY = 'vid'
const DAY_KEY = 'visit_logged'

const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

export function logVisit(loggedIn: boolean): void {
  if (!supabase || import.meta.env.DEV) return
  if (!/(^|\.)uscollegeroadmap\.com$/.test(window.location.hostname)) return
  if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent)) return
  try {
    let vid = localStorage.getItem(VID_KEY)
    if (!vid) { vid = crypto.randomUUID(); localStorage.setItem(VID_KEY, vid) }
    const day = kstDay()
    const stored = localStorage.getItem(DAY_KEY) // 'YYYY-MM-DD:anon' | 'YYYY-MM-DD:user'
    const state = loggedIn ? 'user' : 'anon'
    if (stored === `${day}:user` || stored === `${day}:${state}`) return
    localStorage.setItem(DAY_KEY, `${day}:${state}`)
    const path = window.location.pathname
    void supabase.rpc('log_visit', { p_visitor: vid, p_path: path }).then(() => {}, () => {})
  } catch { /* 저장소 차단(프라이빗 모드 등) — 집계 생략 */ }
}
