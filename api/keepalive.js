// Supabase 무료 프로젝트 자동 일시정지 방지 — Vercel Cron이 매일 호출해 DB에 가벼운 읽기 1회
// (vercel.json의 crons 참고). 수동 확인: GET /api/keepalive
export default async function handler(_req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'missing env' })
    return
  }
  try {
    const r = await fetch(`${url}/rest/v1/schools?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() })
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e), at: new Date().toISOString() })
  }
}
