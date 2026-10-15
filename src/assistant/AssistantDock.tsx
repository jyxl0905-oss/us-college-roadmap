import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, ThumbsUp, ThumbsDown, ExternalLink, RotateCcw, Square, Copy, Check, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { navigate, usePath, slugify } from '../lib/router'
import { t, getLang } from '../i18n'
import { useNavState } from '../nav/navState'
import { profileBus, useBusProfile } from './profileBus'
import { buildAiProfile } from './aiProfile'
import schoolsIndex from '../data/schools.index.json'

// AI 도우미 (설계: docs/ai-assistant-design.md) — 사이트 데이터 안에서만 답하는 서버 함수(supabase/functions/ask)를 부름
// 운영자만 먼저 공개(ai_status.open). 처음 열 때 정보 참고 동의를 받고, 설정에서 바꿀 수 있음
interface Source { n: number; label: string; site?: string; url?: string | null }
interface Msg { role: 'user' | 'assistant'; content: string; sources?: Source[]; id?: number | null; rating?: 1 | -1 | null; error?: boolean; stopped?: boolean }
interface Status { open: boolean; used: number; limit: number; admin: boolean }

const slugToId = new Map((schoolsIndex as { id: number; name: string }[]).map((s) => [slugify(s.name), s.id]))
const URL_RE = /\(?https?:\/\/[^\s)]+\)?/g
const NEXT_RE = /\[\[\s*(?:다음|next)\s*:([^\]]*)\]\]/i
const STORE = 'ai_chat' // 같은 탭 안에서 페이지를 옮겨도 대화 유지 (탭을 닫으면 사라짐)

// 답변 끝의 [[다음: 질문1 | 질문2]] → 추천 질문 버튼으로 분리
function splitNext(text: string): { body: string; next: string[] } {
  const m = text.match(NEXT_RE)
  const body = text.replace(NEXT_RE, '').replace(/\[\[[^\]]*$/, '').trimEnd() // 스트리밍 중 반쯤 온 표시도 숨김
  return { body, next: m ? m[1].split('|').map((q) => q.trim()).filter(Boolean).slice(0, 2) : [] }
}
const forHistory = (text: string) => splitNext(text).body.replace(/\[(S\d+|P)\]/g, '')

function suggestions(path: string): string[] {
  if (path.startsWith('/schools/')) return [t('이 학교 국제학생 원서비랑 마감 알려줘', 'Application fee and deadlines for this school?'), t('이 학교 장학금 있어?', 'Does this school offer scholarships?'), t('이 학교 영어 시험 기준은?', 'English test requirements here?')]
  if (path.startsWith('/targets')) return [t('내 목표 학교 마감 순서대로 정리해줘', 'List my target schools by deadline'), t('내 SAT로 목표 학교들 범위 어디쯤이야?', 'Where does my SAT fall at my targets?'), t('내 목표 학교 원서비 다 합치면?', 'Total application fees for my targets?')]
  if (path.startsWith('/major')) return [t('이 전공은 학년별로 뭘 준비해야 해?', 'What should I do each year for this major?'), t('이 전공 졸업하면 어떤 직업을 가져?', 'What jobs does this major lead to?'), t('이 전공에 맞는 대회·서머 추천해줘', 'Competitions and summer programs for this major?')]
  return [t('이번 시즌에 뭐 해야 해?', 'What should I do this season?'), t('내 전공은 학년별로 뭘 준비해야 해?', 'What should I prepare for my major?'), t('내 목표 학교 중 SAT 안 내도 되는 곳 있어?', 'Which of my targets don’t need the SAT?')]
}

// 답변 표시: [S1]·[P]는 작은 번호, 본문 URL은 지움(링크는 출처 칩으로만), 사이트 경로는 누르면 이동, **굵게**·목록·표
function Answer({ text, onNav }: { text: string; onNav: (to: string) => void }) {
  const clean = text.replace(URL_RE, '').replace(/[ \t]+\n/g, '\n')
  const inline = (s: string, k: string) =>
    s.split(/(\*\*[^*]+\*\*|\[S\d+\]|\[P\]|\/(?:schools|guide|targets|deadlines|board|majors?|app|compare|map|settings)(?:\/[a-z0-9_-]+)*)/g).map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${k}-${i}`} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      if (/^\/[a-z]/.test(part)) return <button key={`${k}-${i}`} onClick={() => onNav(part)} className="font-medium text-blue-600 underline-offset-2 hover:underline">{part}</button>
      const m = part.match(/^\[S(\d+)\]$/)
      if (m) return <sup key={`${k}-${i}`} className="ml-0.5 rounded bg-blue-50 px-1 text-[10px] font-semibold text-blue-600">{m[1]}</sup>
      if (part === '[P]') return <sup key={`${k}-${i}`} className="ml-0.5 rounded bg-green-50 px-1 text-[10px] font-semibold text-green-700">{t('내 정보', 'me')}</sup>
      return part
    })
  // 줄 단위로 묶기: 목록(-, •, 1.) / 표(| a | b |) / 제목(### 또는 **제목**만 있는 줄) / 문단
  type Block = { kind: 'p' | 'ul' | 'table' | 'h'; lines: string[] }
  const blocks: Block[] = []
  for (const raw of clean.split('\n')) {
    const line = raw.trim()
    if (!line) { blocks.push({ kind: 'p', lines: [] }); continue }
    const kind: Block['kind'] = /^\|.*\|$/.test(line) ? 'table' : /^([-•*]|\d+\.)\s/.test(line) ? 'ul' : /^#{1,4}\s/.test(line) || /^\*\*[^*]+\*\*:?$/.test(line) ? 'h' : 'p'
    const last = blocks[blocks.length - 1]
    if (last && last.kind === kind && last.lines.length && kind !== 'h') last.lines.push(line)
    else blocks.push({ kind, lines: [line] })
  }
  return (
    <div className="space-y-2 text-[14px] leading-relaxed text-gray-800">
      {blocks.filter((b) => b.lines.length).map((b, bi) => {
        if (b.kind === 'h') return <p key={bi} className="pt-1 text-[13px] font-bold text-gray-900">{b.lines[0].replace(/^#+\s*/, '').replace(/^\*\*|\*\*:?$/g, '')}</p>
        if (b.kind === 'ul') return <ul key={bi} className="list-disc space-y-1 pl-5 marker:text-gray-400">{b.lines.map((l, li) => <li key={li}>{inline(l.replace(/^([-•*]|\d+\.)\s/, ''), `${bi}-${li}`)}</li>)}</ul>
        if (b.kind === 'table') {
          const rows = b.lines.filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()))
          return (
            <div key={bi} className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-[12.5px]">
                <tbody>{rows.map((r, ri) => <tr key={ri} className={ri === 0 ? 'bg-gray-50 font-semibold text-gray-700' : 'border-t border-gray-100'}>{r.map((c, ci) => <td key={ci} className="px-2.5 py-1.5 align-top">{inline(c, `${bi}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )
        }
        return <p key={bi}>{b.lines.map((l, li) => <span key={li}>{li > 0 && <br />}{inline(l, `${bi}-${li}`)}</span>)}</p>
      })}
    </div>
  )
}

function Sources({ list, onNav }: { list: Source[]; onNav: (to: string) => void }) {
  if (!list.length) return null
  return (
    <div className="mt-3 border-t border-gray-200/70 pt-2">
      <p className="mb-1.5 text-[11px] font-semibold text-gray-400">{t('출처', 'Sources')}</p>
      <div className="flex flex-col gap-1">
        {list.map((s) => {
          const site = s.site?.split(' ')[0]
          return (
            <div key={s.n} className="flex min-w-0 items-center gap-1.5 text-[12px]">
              <span className={`shrink-0 rounded px-1 text-[10px] font-semibold ${s.n ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>{s.n || t('내 정보', 'me')}</span>
              <button onClick={() => site && onNav(site)} className="min-w-0 truncate text-left text-gray-600 hover:text-gray-900 hover:underline" title={s.label}>{s.label.replace(/\s*—\s*/, ' · ')}</button>
              {s.url && (
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                  {t('공식', 'Official')}<ExternalLink size={10} />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AssistantDock() {
  const { loggedIn } = useNavState()
  const path = usePath()
  const profile = useBusProfile()
  const [status, setStatus] = useState<Status | null>(null)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem(STORE) ?? '[]') as Msg[] } catch { return [] } })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [age, setAge] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!loggedIn || !supabase) { setStatus(null); return }
    void supabase.rpc('ai_status').then(({ data }) => setStatus((data as Status) ?? null), () => setStatus(null))
  }, [loggedIn])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])
  useEffect(() => { if (!busy) try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))) } catch { /* 저장 불가 — 무시 */ } }, [msgs, busy])
  useEffect(() => { if (open && !busy) inputRef.current?.focus({ preventScroll: true }) }, [open, busy])

  if (!status?.open || !profile || path.startsWith('/admin') || path.startsWith('/s/')) return null
  const needConsent = !profile.ai_consent_at
  const personal = !!profile.ai_profile_consent

  // 출처·경로를 누르면 이동 — 폰은 화면을 가리므로 패널을 닫음
  const go = (to: string) => { navigate(to); if (window.innerWidth < 768) setOpen(false) }

  const decide = async (consent: boolean) => {
    if (!supabase || !profile.user_id) return
    const patch = { ai_profile_consent: consent, ai_consent_at: new Date().toISOString() }
    const { error } = await supabase.from('profiles').update(patch).eq('user_id', profile.user_id)
    if (!error) profileBus.patch(patch)
  }

  const ask = async (q: string) => {
    const question = q.trim()
    if (!question || busy || !supabase) return
    setInput('')
    setBusy(true)
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, content: forHistory(m.content) }))
    setMsgs((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])
    const update = (f: (m: Msg) => Msg) => setMsgs((list) => list.map((m, i) => (i === list.length - 1 ? f(m) : m)))
    const fail = (text: string) => update((m) => ({ ...m, content: text, error: true }))
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (!token) return fail(t('다시 로그인해 주세요.', 'Please sign in again.'))
      const slug = path.startsWith('/schools/') ? decodeURIComponent(path.slice(9).replace(/\/+$/, '')).toLowerCase() : null
      const aiProfile = personal && profile.user_id ? await buildAiProfile(profile.user_id, profile).catch(() => undefined) : undefined
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, lang: getLang(), page: { path, school_id: slug ? slugToId.get(slug) ?? null : null }, profile: aiProfile }),
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        return fail(err.error === 'limit' ? t(`오늘 질문 ${err.limit}회를 다 썼어요. 내일 다시 물어봐 주세요.`, `You've used all ${err.limit} questions today. Try again tomorrow.`) : err.error === 'not_open' ? t('AI 도우미는 아직 준비 중이에요.', 'The assistant isn’t open yet.') : t('답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.', 'Couldn’t get an answer. Please try again shortly.'))
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const ev = JSON.parse(part.slice(6))
          if (ev.t) update((m) => ({ ...m, content: m.content + ev.t }))
          if (ev.replace) update((m) => ({ ...m, content: ev.replace }))
          if (ev.done) {
            update((m) => ({ ...m, sources: ev.sources, id: ev.id }))
            setStatus((s) => (s ? { ...s, used: ev.used, limit: ev.limit } : s))
          }
          if (ev.error) fail(ev.error === 'budget' ? t('이번 달 도우미 사용량이 다 찼어요. 다음 달에 다시 열려요.', 'This month’s assistant budget is used up. It reopens next month.') : ev.error === 'busy' ? t('지금 질문이 많아요. 잠시 후 다시 시도해 주세요.', 'It’s busy right now. Please try again shortly.') : t('답변 중 문제가 생겼어요. 다시 시도해 주세요.', 'Something went wrong. Please try again.'))
        }
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') update((m) => ({ ...m, stopped: true, content: m.content || t('답변을 멈췄어요.', 'Stopped.') }))
      else fail(t('연결이 끊겼어요. 다시 시도해 주세요.', 'Connection lost. Please try again.'))
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }

  const rate = (i: number, rating: 1 | -1) => {
    const m = msgs[i]
    if (!m.id || !supabase) return
    setMsgs((list) => list.map((x, j) => (j === i ? { ...x, rating } : x)))
    void supabase.from('ai_messages').update({ rating }).eq('id', m.id).then(() => {}, () => {})
  }
  const copy = (i: number) => {
    const body = splitNext(msgs[i].content).body.replace(/\s?\[(S\d+|P)\]/g, '')
    void navigator.clipboard?.writeText(body).then(() => { setCopied(i); setTimeout(() => setCopied(null), 1500) }, () => {})
  }

  const left = status.admin ? null : Math.max(0, status.limit - status.used)
  const lastAssistant = msgs.length - 1

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="ai-fab fixed right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-gray-900 py-3 pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(11,22,51,0.7)] ring-1 ring-white/10 transition-transform active:scale-95">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><Sparkles size={14} /></span>
          {t('물어보기', 'Ask')}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25 md:bg-black/10" onClick={() => setOpen(false)}>
          <aside role="dialog" aria-label={t('AI 도우미', 'AI assistant')} onClick={(e) => e.stopPropagation()} className="flex h-full w-full flex-col bg-white shadow-2xl md:w-[440px] md:border-l md:border-gray-200">
            <header className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white"><Sparkles size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{t('AI 도우미', 'AI assistant')}</p>
                <p className="truncate text-[11px] text-gray-400">{t('사이트에 정리된 공식 자료로만 답해요', 'Answers only from this site’s official data')}</p>
              </div>
              {!needConsent && (
                <button onClick={() => go('/settings')} title={t('설정에서 바꿀 수 있어요', 'Change in Settings')} className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold sm:inline-flex ${personal ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <UserRound size={11} />{personal ? t('내 정보 참고 중', 'Using my info') : t('일반 답변', 'General')}
                </button>
              )}
              {msgs.length > 0 && <button onClick={() => { abortRef.current?.abort(); setMsgs([]) }} aria-label={t('새 대화', 'New chat')} title={t('새 대화', 'New chat')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><RotateCcw size={16} /></button>}
              <button onClick={() => setOpen(false)} aria-label={t('닫기', 'Close')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={18} /></button>
            </header>

            {needConsent ? (
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <p className="text-base font-bold text-gray-900">{t('AI 도우미가 내 정보를 참고해도 될까요?', 'Can the assistant use your info?')}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{t('동의하면 질문할 때 아래 정보가 Anthropic(Claude AI 제공사, 미국)으로 전송돼 맞춤 답변에 쓰여요.', 'If you agree, the info below is sent to Anthropic (the Claude AI provider, U.S.) with each question to personalize answers.')}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  <li>{t('학년, 지원 신분, 희망 전공', 'Grade, applicant status, intended major')}</li>
                  <li>{t('목표 학교, GPA·SAT·영어 시험 점수(구간)', 'Target schools, GPA/SAT/English test scores (or bands)')}</li>
                  <li>{t('이번 시즌 체크리스트 진행 상황, 지원 라운드', 'This season’s checklist progress, application rounds')}</li>
                </ul>
                <p className="mt-3 text-sm text-gray-600">{t('이름·이메일·다니는 학교는 보내지 않아요. 질문과 답변은 품질 점검을 위해 90일 동안 보관한 뒤 지워요. 설정에서 언제든 바꿀 수 있어요.', 'Your name, email and school are never sent. Questions and answers are kept 90 days for quality checks, then deleted. Change this anytime in Settings.')}</p>
                <label className="mt-4 flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="h-4 w-4 accent-gray-900" />
                  {t('만 14세 이상이에요', 'I am 14 or older')}
                </label>
                <button disabled={!age} onClick={() => void decide(true)} className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{t('동의하고 맞춤 답변 받기', 'Agree and get personalized answers')}</button>
                <button onClick={() => void decide(false)} className="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">{t('동의 없이 일반 답변만 받기', 'Continue with general answers only')}</button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                  {msgs.length === 0 && (
                    <div className="pt-2">
                      <p className="text-lg font-bold tracking-tight text-gray-900">{profile.nickname ? t(`${profile.nickname}님, 무엇이 궁금하세요?`, `Hi ${profile.nickname}, what can I help with?`) : t('무엇이 궁금하세요?', 'What can I help with?')}</p>
                      <p className="mt-1 text-sm text-gray-500">{t('마감·원서비·영어 시험·장학금·전공별 준비·이번 시즌 할 일처럼 사이트에 정리된 내용을 물어보세요.', 'Ask about deadlines, fees, English tests, scholarships, major prep or this season’s tasks — anything this site covers.')}</p>
                      <div className="mt-4 flex flex-col gap-2">
                        {suggestions(path).map((s) => (
                          <button key={s} onClick={() => void ask(s)} className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-left text-sm text-gray-700 shadow-sm hover:border-gray-300 active:bg-gray-50">
                            {s}<Send size={13} className="shrink-0 text-gray-300 group-hover:text-gray-500" />
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-xs text-gray-400">{personal ? t('내 학년·전공·목표 학교·체크리스트를 참고해서 답해요.', 'Answers use your grade, major, targets and checklist.') : t('지금은 일반 답변이에요. 맞춤 답변은 설정에서 켤 수 있어요.', 'General answers only. Turn on personalization in Settings.')}</p>
                    </div>
                  )}
                  {msgs.map((m, i) => {
                    if (m.role === 'user') return <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gray-900 px-3.5 py-2 text-sm text-white">{m.content}</div>
                    const { body, next } = splitNext(m.content)
                    const streaming = busy && i === lastAssistant
                    return (
                      <div key={i}>
                        <div className={`rounded-2xl rounded-bl-md px-4 py-3 ${m.error ? 'bg-amber-50 text-amber-800' : 'border border-gray-100 bg-gray-50/70'}`}>
                          {body ? (m.error ? <p className="text-sm">{body}</p> : <Answer text={body} onNav={go} />) : (
                            <p className="flex items-center gap-1.5 text-sm text-gray-400">
                              <span className="flex gap-0.5">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: `${d * 0.15}s` }} />)}</span>
                              {t('사이트 자료 찾는 중', 'Looking through the site')}
                            </p>
                          )}
                          {m.sources && <Sources list={m.sources} onNav={go} />}
                          {(m.id || m.stopped) && !streaming && (
                            <div className="mt-2 flex items-center gap-0.5 text-gray-300">
                              {m.id && <button onClick={() => rate(i, 1)} aria-label={t('도움 됐어요', 'Helpful')} className={`rounded-md p-1 hover:bg-white ${m.rating === 1 ? 'text-green-600' : 'hover:text-gray-500'}`}><ThumbsUp size={14} /></button>}
                              {m.id && <button onClick={() => rate(i, -1)} aria-label={t('별로예요', 'Not helpful')} className={`rounded-md p-1 hover:bg-white ${m.rating === -1 ? 'text-red-500' : 'hover:text-gray-500'}`}><ThumbsDown size={14} /></button>}
                              <button onClick={() => copy(i)} aria-label={t('복사', 'Copy')} className="rounded-md p-1 hover:bg-white hover:text-gray-500">{copied === i ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}</button>
                            </div>
                          )}
                        </div>
                        {i === lastAssistant && !streaming && next.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {next.map((q) => <button key={q} onClick={() => void ask(q)} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900">{q}</button>)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); void ask(input) }} className="border-t border-gray-100 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
                  <div className="flex items-end gap-2 rounded-2xl border-2 border-gray-200 bg-white px-2 py-1.5 focus-within:border-gray-900">
                    <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value.slice(0, 500))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(input) } }} rows={1} placeholder={t('예: UIUC 국제학생 원서비 얼마야?', 'e.g. What is UIUC’s application fee?')} className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm focus:outline-none" />
                    {busy ? (
                      <button type="button" onClick={() => abortRef.current?.abort()} aria-label={t('멈추기', 'Stop')} className="rounded-xl bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"><Square size={16} fill="currentColor" /></button>
                    ) : (
                      <button type="submit" disabled={!input.trim()} aria-label={t('보내기', 'Send')} className="rounded-xl bg-gray-900 p-2 text-white disabled:opacity-25"><Send size={16} /></button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {t('AI 답변은 틀릴 수 있어요. 원서 내기 전 공식 페이지에서 꼭 확인하세요.', 'AI answers can be wrong. Always confirm on the official page before applying.')}
                    {left !== null && ` · ${t(`오늘 ${left}회 남음`, `${left} left today`)}`}
                  </p>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
