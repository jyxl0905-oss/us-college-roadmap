import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, ThumbsUp, ThumbsDown, ExternalLink, RotateCcw } from 'lucide-react'
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
interface Msg { role: 'user' | 'assistant'; content: string; sources?: Source[]; id?: number | null; rating?: 1 | -1 | null; error?: boolean }
interface Status { open: boolean; used: number; limit: number; admin: boolean }

const slugToId = new Map((schoolsIndex as { id: number; name: string }[]).map((s) => [slugify(s.name), s.id]))
const URL_RE = /\(?https?:\/\/[^\s)]+\)?/g

function suggestions(path: string): string[] {
  if (path.startsWith('/schools/')) return [t('이 학교 국제학생 원서비랑 마감 알려줘', 'Application fee and deadlines for this school?'), t('이 학교 장학금 있어?', 'Does this school offer scholarships?'), t('이 학교 영어 시험 기준은?', 'English test requirements here?')]
  if (path.startsWith('/targets')) return [t('내 목표 학교 마감 순서대로 정리해줘', 'List my target schools by deadline'), t('내 SAT로 목표 학교들 범위 어디쯤이야?', 'Where does my SAT fall at my targets?'), t('내 목표 학교 원서비 다 합치면?', 'Total application fees for my targets?')]
  return [t('이번 달에 뭐 해야 해?', 'What should I do this month?'), t('내 목표 학교 중 SAT 안 내도 되는 곳 있어?', 'Which of my targets don’t need the SAT?'), t('CS 전공 서머 프로그램 추천해줘', 'Summer programs for CS?')]
}

// 답변 표시: [S1]·[P] 표시는 작은 번호로, 본문 URL은 지움(링크는 출처 칩으로만), **굵게**·목록만 간단히
function Answer({ text }: { text: string }) {
  const clean = text.replace(URL_RE, '').replace(/[ \t]+\n/g, '\n')
  const inline = (s: string, k: string) =>
    s.split(/(\*\*[^*]+\*\*|\[S\d+\]|\[P\]|\/(?:schools|guide|targets|deadlines|board|majors|app|compare|map|settings)(?:\/[a-z0-9-]+)*)/g).map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${k}-${i}`}>{part.slice(2, -2)}</strong>
      if (/^\/[a-z]/.test(part)) return <button key={`${k}-${i}`} onClick={() => navigate(part)} className="font-medium text-blue-600 underline-offset-2 hover:underline">{part}</button>
      const m = part.match(/^\[S(\d+)\]$/)
      if (m) return <sup key={`${k}-${i}`} className="ml-0.5 text-[10px] font-semibold text-blue-600">{m[1]}</sup>
      if (part === '[P]') return <sup key={`${k}-${i}`} className="ml-0.5 text-[10px] font-semibold text-green-600">{t('내 정보', 'me')}</sup>
      return part
    })
  // 줄 단위로: 연속된 목록 줄(-, •, 1.)은 하나의 목록으로, 나머지는 문단으로
  const blocks: { list: boolean; lines: string[] }[] = []
  for (const raw of clean.split('\n')) {
    const line = raw.trim()
    if (!line) { blocks.push({ list: false, lines: [] }); continue }
    const isList = /^([-•*]|\d+\.)\s/.test(line)
    const last = blocks[blocks.length - 1]
    if (last && last.list === isList && last.lines.length) last.lines.push(line)
    else blocks.push({ list: isList, lines: [line] })
  }
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-gray-800">
      {blocks.filter((b) => b.lines.length).map((b, bi) =>
        b.list
          ? <ul key={bi} className="list-disc space-y-0.5 pl-5">{b.lines.map((l, li) => <li key={li}>{inline(l.replace(/^([-•*]|\d+\.)\s/, ''), `${bi}-${li}`)}</li>)}</ul>
          : <p key={bi}>{b.lines.map((l, li) => <span key={li}>{li > 0 && <br />}{inline(l.replace(/^#+\s*/, ''), `${bi}-${li}`)}</span>)}</p>,
      )}
    </div>
  )
}

function Sources({ list }: { list: Source[] }) {
  if (!list.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map((s) => {
        const site = s.site?.split(' ')[0]
        return (
          <span key={s.n} className="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
            <span className="font-semibold text-blue-600">{s.n || t('내 정보', 'me')}</span>
            <button onClick={() => site && navigate(site)} className="truncate hover:underline" title={s.label}>{s.label.replace(/\s*—\s*/, ' · ')}</button>
            {s.url && <a href={s.url} target="_blank" rel="noreferrer" aria-label={t('공식 페이지', 'Official page')} className="shrink-0 text-gray-400 hover:text-blue-600"><ExternalLink size={11} /></a>}
          </span>
        )
      })}
    </div>
  )
}

export default function AssistantDock() {
  const { loggedIn } = useNavState()
  const path = usePath()
  const profile = useBusProfile()
  const [status, setStatus] = useState<Status | null>(null)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [age, setAge] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loggedIn || !supabase) { setStatus(null); return }
    void supabase.rpc('ai_status').then(({ data }) => setStatus((data as Status) ?? null), () => setStatus(null))
  }, [loggedIn])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])

  if (!status?.open || !profile || path.startsWith('/admin') || path.startsWith('/s/')) return null
  const needConsent = !profile.ai_consent_at

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
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, content: m.content.replace(/\[(S\d+|P)\]/g, '') }))
    setMsgs((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])
    const update = (f: (m: Msg) => Msg) => setMsgs((list) => list.map((m, i) => (i === list.length - 1 ? f(m) : m)))
    const fail = (text: string) => update((m) => ({ ...m, content: text, error: true }))
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (!token) return fail(t('다시 로그인해 주세요.', 'Please sign in again.'))
      const slug = path.startsWith('/schools/') ? decodeURIComponent(path.slice(9).replace(/\/+$/, '')).toLowerCase() : null
      const aiProfile = profile.ai_profile_consent && profile.user_id ? await buildAiProfile(profile.user_id, profile).catch(() => undefined) : undefined
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask`, {
        method: 'POST',
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
    } catch {
      fail(t('연결이 끊겼어요. 다시 시도해 주세요.', 'Connection lost. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const rate = (i: number, rating: 1 | -1) => {
    const m = msgs[i]
    if (!m.id || !supabase) return
    setMsgs((list) => list.map((x, j) => (j === i ? { ...x, rating } : x)))
    void supabase.from('ai_messages').update({ rating }).eq('id', m.id).then(() => {}, () => {})
  }

  const left = status.admin ? null : Math.max(0, status.limit - status.used)

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="ai-fab fixed right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg active:bg-gray-800">
          <Sparkles size={16} />{t('물어보기', 'Ask')}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 md:bg-transparent" onClick={() => setOpen(false)}>
          <aside role="dialog" aria-label={t('AI 도우미', 'AI assistant')} onClick={(e) => e.stopPropagation()} className="flex h-full w-full flex-col bg-white shadow-2xl md:w-[420px] md:border-l md:border-gray-200">
            <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <Sparkles size={18} className="text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{t('AI 도우미', 'AI assistant')}</p>
                <p className="text-[11px] text-gray-400">{t('이 사이트의 공식 자료 안에서만 답해요', 'Answers only from this site’s official data')}</p>
              </div>
              {msgs.length > 0 && <button onClick={() => setMsgs([])} aria-label={t('새 대화', 'New chat')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><RotateCcw size={16} /></button>}
              <button onClick={() => setOpen(false)} aria-label={t('닫기', 'Close')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
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
                    <div>
                      <p className="text-sm text-gray-600">{t('마감·원서비·영어 시험·장학금·체크리스트처럼 사이트에 정리된 정보를 물어보세요.', 'Ask about deadlines, fees, English tests, scholarships or your checklist — anything this site covers.')}</p>
                      <div className="mt-3 flex flex-col gap-2">
                        {suggestions(path).map((s) => (
                          <button key={s} onClick={() => void ask(s)} className="rounded-xl border-2 border-gray-200 px-3 py-2 text-left text-sm text-gray-700 active:bg-gray-50">{s}</button>
                        ))}
                      </div>
                      {!profile.ai_profile_consent && <p className="mt-3 text-xs text-gray-400">{t('지금은 일반 답변이에요. 맞춤 답변은 설정에서 켤 수 있어요.', 'General answers only. Turn on personalization in Settings.')}</p>}
                    </div>
                  )}
                  {msgs.map((m, i) =>
                    m.role === 'user' ? (
                      <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 px-3.5 py-2 text-sm text-white">{m.content}</div>
                    ) : (
                      <div key={i} className={`max-w-[95%] rounded-2xl rounded-bl-md px-3.5 py-2.5 ${m.error ? 'bg-amber-50 text-amber-800' : 'bg-gray-50'}`}>
                        {m.content ? (m.error ? <p className="text-sm">{m.content}</p> : <Answer text={m.content} />) : <p className="animate-pulse text-sm text-gray-400">{t('자료 찾는 중…', 'Looking it up…')}</p>}
                        {m.sources && <Sources list={m.sources} />}
                        {m.id && (
                          <div className="mt-2 flex gap-1">
                            <button onClick={() => rate(i, 1)} aria-label={t('도움 됐어요', 'Helpful')} className={`rounded-md p-1 ${m.rating === 1 ? 'text-green-600' : 'text-gray-300 hover:text-gray-500'}`}><ThumbsUp size={14} /></button>
                            <button onClick={() => rate(i, -1)} aria-label={t('별로예요', 'Not helpful')} className={`rounded-md p-1 ${m.rating === -1 ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'}`}><ThumbsDown size={14} /></button>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                  <div ref={endRef} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); void ask(input) }} className="border-t border-gray-100 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
                  <div className="flex items-end gap-2">
                    <textarea value={input} onChange={(e) => setInput(e.target.value.slice(0, 500))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(input) } }} rows={1} placeholder={t('예: UIUC 국제학생 원서비 얼마야?', 'e.g. What is UIUC’s application fee?')} className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none" />
                    <button type="submit" disabled={busy || !input.trim()} aria-label={t('보내기', 'Send')} className="rounded-xl bg-gray-900 p-2.5 text-white disabled:opacity-30"><Send size={18} /></button>
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
