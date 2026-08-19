// 시즌 시작 리마인더 — Vercel Cron이 매일 호출. 시즌 시작(8/1 Fall, 1/1 Spring, 6/1 Summer) 후 3일 이내면
// 아직 이번 시즌 알림을 못 받은 사용자에게 이메일 1통 (Gmail SMTP). reminder_log로 중복 방지.
// 필요한 Vercel 환경변수: SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD (+ 기존 VITE_SUPABASE_URL)
// 선택: CRON_SECRET — 설정하면 Vercel Cron이 자동으로 `Authorization: Bearer $CRON_SECRET`를 붙여 호출하고,
//   그 헤더가 없는 요청(외부에서 임의 호출)은 401로 거부. ?force=1(시즌 시작일 아니어도 발송)은 CRON_SECRET이 있을 때만 허용.
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const SITE = 'https://us-college-roadmap.vercel.app'

function seasonInfo(now) {
  // KST 기준 날짜 (크론은 00:30 UTC = 09:30 KST에 실행)
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth() + 1, d = kst.getUTCDate()
  const season = m >= 8 ? 'fall' : m >= 6 ? 'summer' : 'spring'
  const startMonth = season === 'fall' ? 8 : season === 'summer' ? 6 : 1
  const withinStart = m === startMonth && d <= 3
  return { label: `${y}-${season}`, season, withinStart }
}

const seasonKo = { fall: '가을(Fall)', spring: '봄(Spring)', summer: '여름(Summer)' }

// auth.users 전체를 페이지 단위로 순회해 user_id → email 맵 구성 (1000명 초과 대비)
async function loadEmailMap(sb) {
  const map = new Map()
  const perPage = 1000
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users ?? []
    for (const u of users) if (u.email) map.set(u.id, u.email)
    if (users.length < perPage) break
  }
  return map
}

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  const cronSecret = process.env.CRON_SECRET

  // 호출자 검증 — CRON_SECRET이 설정돼 있으면 Vercel Cron(또는 그 값을 아는 운영자)만 실행 가능
  const authHeader = req.headers?.authorization ?? ''
  const authorized = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`
  if (cronSecret && !authorized) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  // 수동 테스트용 (시즌 시작일이 아니어도 실행) — 시크릿 없이 공개 URL로 발송을 유발할 수 없도록 인증된 요청에만 허용
  const force = req.query?.force === '1'
  if (force && !authorized) {
    res.status(403).json({ ok: false, error: 'force requires CRON_SECRET (set env and send Authorization: Bearer <secret>)' })
    return
  }

  if (!url || !service || !gmailUser || !gmailPass) {
    res.status(200).json({ ok: false, skipped: 'missing env (SUPABASE_SERVICE_ROLE_KEY / GMAIL_USER / GMAIL_APP_PASSWORD)' })
    return
  }
  const { label, season, withinStart } = seasonInfo(new Date())
  if (!withinStart && !force) {
    res.status(200).json({ ok: true, skipped: 'not season start', season: label })
    return
  }

  try {
    const sb = createClient(url, service, { auth: { persistSession: false } })
    const { data: profiles, error } = await sb
      .from('profiles')
      .select('user_id, nickname, grad_year, reminder_opt_out, lang')
      .eq('reminder_opt_out', false)
      .eq('graduated', false)
    if (error) {
      res.status(500).json({ ok: false, error: error.message })
      return
    }
    const { data: sent, error: logErr } = await sb.from('reminder_log').select('user_id').eq('season_label', label)
    if (logErr) {
      // 발송 이력을 못 읽으면 중복 발송 위험 → 중단
      res.status(500).json({ ok: false, error: `reminder_log: ${logErr.message}` })
      return
    }
    const already = new Set((sent ?? []).map((r) => r.user_id))
    const targets = (profiles ?? []).filter((p) => !already.has(p.user_id))
    if (targets.length === 0) {
      res.status(200).json({ ok: true, sent: 0, season: label })
      return
    }

    // 이메일 주소는 auth.users에서 (서비스 롤)
    const emailById = await loadEmailMap(sb)

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    })

    let count = 0
    const failures = []
    for (const p of targets) {
      const to = emailById.get(p.user_id)
      if (!to) continue
      const en = p.lang === 'en'
      const seasonEn = { fall: 'Fall', spring: 'Spring', summer: 'Summer' }[season]
      const name = en ? (p.nickname ? `Hi ${p.nickname}` : 'Hi') : (p.nickname ? `${p.nickname}님` : '안녕하세요')
      const text = (en
        ? [
            `${name}, a new season has started — your ${seasonEn} checklist is ready.`,
            '',
            'Wrap up last season’s items → note what changed → get your new report. Three screens and you’re done.',
            `Check in now: ${SITE}`,
            '',
            '— US College Roadmap',
            'To stop these emails, turn off the "Season-start reminder" switch at the bottom of your report.',
          ]
        : [
            `${name}, 새 시즌이 시작됐어요 — ${seasonKo[season]} 시즌 체크리스트가 준비됐습니다.`,
            '',
            '지난 시즌 미완료 항목 정리 → 변경사항 반영 → 새 리포트 발급, 3화면이면 끝나요.',
            `지금 체크인하기: ${SITE}`,
            '',
            '— 미국 대입 로드맵',
            '알림을 끄려면 리포트 하단의 "시즌 시작 알림" 스위치를 꺼 주세요.',
          ]).join('\n')
      try {
        await transporter.sendMail({
          from: `"${en ? 'US College Roadmap' : '미국 대입 로드맵'}" <${gmailUser}>`,
          to,
          subject: en ? `[US College Roadmap] Time for your ${seasonEn} check-in` : `[미국 대입 로드맵] ${seasonKo[season]} 시즌 체크인 시간이에요`,
          text,
        })
        count++
        // 발송 성공 후 이력 기록 — 기록 실패는 발송 실패와 구분해 보고 (다음 실행에서 중복 발송될 수 있음)
        const { error: insErr } = await sb.from('reminder_log').insert({ user_id: p.user_id, season_label: label })
        if (insErr) failures.push({ user: p.user_id, error: `log: ${insErr.message}`.slice(0, 120) })
      } catch (e) {
        failures.push({ user: p.user_id, error: String(e).slice(0, 120) })
      }
    }
    res.status(200).json({ ok: true, sent: count, failures, season: label })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e).slice(0, 300) })
  }
}
