// 시즌 시작 리마인더 — Vercel Cron이 매일 호출. 시즌 시작(8/1 Fall, 1/1 Spring, 6/1 Summer) 후 3일 이내면
// 아직 이번 시즌 알림을 못 받은 사용자에게 이메일 1통 (Gmail SMTP). reminder_log로 중복 방지.
// 필요한 Vercel 환경변수: SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD (+ 기존 VITE_SUPABASE_URL)
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const SITE = 'https://us-college-roadmap.vercel.app'

function seasonInfo(now) {
  // KST 기준 날짜
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth() + 1, d = kst.getUTCDate()
  const season = m >= 8 ? 'fall' : m >= 6 ? 'summer' : 'spring'
  const startMonth = season === 'fall' ? 8 : season === 'summer' ? 6 : 1
  const withinStart = m === startMonth && d <= 3
  return { label: `${y}-${season}`, season, withinStart }
}

const seasonKo = { fall: '가을(Fall)', spring: '봄(Spring)', summer: '여름(Summer)' }

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  const force = req.query?.force === '1' // 수동 테스트용 (시즌 시작일이 아니어도 실행)

  if (!url || !service || !gmailUser || !gmailPass) {
    res.status(200).json({ ok: false, skipped: 'missing env (SUPABASE_SERVICE_ROLE_KEY / GMAIL_USER / GMAIL_APP_PASSWORD)' })
    return
  }
  const { label, season, withinStart } = seasonInfo(new Date())
  if (!withinStart && !force) {
    res.status(200).json({ ok: true, skipped: 'not season start', season: label })
    return
  }

  const sb = createClient(url, service, { auth: { persistSession: false } })
  const { data: profiles, error } = await sb
    .from('profiles')
    .select('user_id, nickname, grad_year, reminder_opt_out')
    .eq('reminder_opt_out', false)
  if (error) {
    res.status(500).json({ ok: false, error: error.message })
    return
  }
  const { data: sent } = await sb.from('reminder_log').select('user_id').eq('season_label', label)
  const already = new Set((sent ?? []).map((r) => r.user_id))
  const targets = (profiles ?? []).filter((p) => !already.has(p.user_id))
  if (targets.length === 0) {
    res.status(200).json({ ok: true, sent: 0, season: label })
    return
  }

  // 이메일 주소는 auth.users에서 (서비스 롤)
  const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const emailById = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email]))

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  })

  let count = 0
  const failures = []
  for (const p of targets) {
    const to = emailById.get(p.user_id)
    if (!to) continue
    const name = p.nickname ? `${p.nickname}님` : '안녕하세요'
    const text = [
      `${name}, 새 시즌이 시작됐어요 — ${seasonKo[season]} 시즌 체크리스트가 준비됐습니다.`,
      '',
      '지난 시즌 미완료 항목 정리 → 변경사항 반영 → 새 리포트 발급, 3화면이면 끝나요.',
      `지금 체크인하기: ${SITE}`,
      '',
      '— 미국 대입 로드맵',
      '알림을 끄려면 리포트 하단의 "시즌 시작 알림" 스위치를 꺼 주세요.',
    ].join('\n')
    try {
      await transporter.sendMail({
        from: `"미국 대입 로드맵" <${gmailUser}>`,
        to,
        subject: `[미국 대입 로드맵] ${seasonKo[season]} 시즌 체크인 시간이에요`,
        text,
      })
      await sb.from('reminder_log').insert({ user_id: p.user_id, season_label: label })
      count++
    } catch (e) {
      failures.push({ user: p.user_id, error: String(e).slice(0, 120) })
    }
  }
  res.status(200).json({ ok: true, sent: count, failures, season: label })
}
