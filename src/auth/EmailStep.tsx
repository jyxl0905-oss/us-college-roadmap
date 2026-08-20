import { useState } from 'react'
import { t } from '../i18n'
import { supabase } from '../lib/supabase'

// 만료·사용된 링크로 돌아온 경우 URL 해시에 에러가 담겨 옴
const cameFromExpiredLink = window.location.hash.includes('error')

export const RESEARCH_CONSENT_KEY = 'research_consent' // R1-A③: 닉네임 저장 시 프로필로 옮겨짐

// 온보딩 완료 후 매직 링크 로그인 — 메일의 링크를 누르면 이 앱으로 돌아와 세션이 생김
export default function EmailStep({ redirectPath = '/', title, minimal = false }: { redirectPath?: string; title?: string; minimal?: boolean } = {}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState(() => localStorage.getItem(RESEARCH_CONSENT_KEY) === '1')
  const [showDetail, setShowDetail] = useState(false)

  const toggleConsent = () => {
    const next = !consent
    setConsent(next)
    localStorage.setItem(RESEARCH_CONSENT_KEY, next ? '1' : '0')
  }

  // Google OAuth — 같은 브라우저에서 왕복하므로 답변은 localStorage로 유지됨 (서버 보관 불필요)
  const googleLogin = async () => {
    if (!supabase || sending) return
    setError(null)
    try { if (redirectPath !== '/') localStorage.setItem('post_login_path', redirectPath); else localStorage.removeItem('post_login_path') } catch { /* ignore */ }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://us-college-roadmap.vercel.app' },
    })
    if (error)
      setError(t('구글 로그인이 지금은 안 돼요 — 아래 이메일 방식으로 로그인해 주세요.', 'Google sign-in is unavailable right now — please use the email option below.'))
  }

  const sendLink = async () => {
    if (!supabase) return
    setSending(true)
    setError(null)
    // 로그인 후 돌아갈 경로 (같은 브라우저에서 링크를 열었을 때만 유효)
    try { if (redirectPath !== '/') localStorage.setItem('post_login_path', redirectPath); else localStorage.removeItem('post_login_path') } catch { /* ignore */ }
    // 온보딩 답변을 이메일 키로 서버에 잠깐 보관 — 링크를 다른 브라우저/앱에서 열어도 질문을 다시 안 해도 되게
    try {
      const raw = localStorage.getItem('pending_answers')
      if (raw) await supabase.rpc('stash_onboarding', { p_email: email.trim(), p_answers: { ...JSON.parse(raw), refSource: localStorage.getItem('ref_source') ?? undefined }, p_research: localStorage.getItem(RESEARCH_CONSENT_KEY) === '1' })
    } catch { /* 보관 실패해도 로그인은 진행 (같은 브라우저면 localStorage로 이어짐) */ }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // 메일 링크는 항상 실제 사이트로 돌아오게 고정 — 개발용 localhost에서 요청해도 꺼진 서버로 돌아가는 일 방지
      options: { emailRedirectTo: 'https://us-college-roadmap.vercel.app' },
    })
    setSending(false)
    if (error)
      setError(
        error.message.includes('rate limit')
          ? t('메일 전송 한도를 초과했어요. 잠시 뒤에 다시 시도해 주세요.', 'Email send limit reached. Please try again shortly.')
          : error.message,
      )
    else setSent(true)
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('메일함을 확인해 주세요 📬', 'Check your inbox 📬')}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t('', 'We sent a login link to ')}<strong>{email}</strong>{t('로 로그인 링크를 보냈어요. 메일의 링크를 누르면 입력한 내용이 저장되고 체크리스트가 열려요.', '. Tap the link in the email to save your answers and open your checklist.')}
        </p>
        <p className="mt-4 text-sm text-gray-400">
          {t('메일이 안 보이면 스팸함도 확인해 보세요.', "Don't see it? Check your spam folder.")}
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
        >
          {t('이메일 다시 입력하기', 'Use a different email')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{title ?? t('이메일로 저장할게요', 'Save with your email')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {minimal
          ? t('운영자 이메일로 로그인 링크를 보내드려요.', 'We’ll email a login link to the admin address.')
          : t('비밀번호 없이 메일로 오는 링크 하나로 로그인돼요. 시즌마다 돌아와서 체크리스트를 이어갈 수 있어요.', 'No password — you log in with a link we email you. Come back each season and pick up your checklist.')}
      </p>
      <button
        onClick={googleLogin}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-800 active:bg-gray-50"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        {t('Google로 계속하기', 'Continue with Google')}
      </button>
      <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />{t('또는 이메일로', 'or with email')}<span className="h-px flex-1 bg-gray-200" />
      </div>

      {cameFromExpiredLink && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('이전 로그인 링크가 만료됐어요. 이메일을 다시 입력하고 새 링크를 받아주세요. (링크는 1회용이에요)', 'That login link expired. Enter your email again for a new one (links are single-use).')}
        </p>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('이메일 주소', 'Email address')}
        autoComplete="email"
        className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">{t('전송 실패', 'Send failed')}: {error}</p>}

      {/* R1-A③: 연구 동의 (선택, 기본 해제) */}
      {!minimal && <label className="mt-4 flex items-start gap-2.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={toggleConsent}
          className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
        />
        <span>
          {t('(선택) 익명화된 통계 데이터를 연구 목적으로 활용하는 데 동의합니다', '(Optional) I agree to the use of anonymized statistics for research')}{' '}
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="text-blue-600 underline"
          >
            {t('[자세히]', '[details]')}
          </button>
        </span>
      </label>}

      <button
        onClick={sendLink}
        disabled={sending || !email.includes('@')}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {sending ? t('보내는 중…', 'Sending…') : t('로그인 링크 보내기', 'Send login link')}
      </button>

      {/* 연구 동의 상세 바텀시트 */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white px-5 pb-8 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-gray-900">{t('연구 데이터 활용 안내', 'About research use')}</p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>· {t('수집하는 것: 프로필 항목과 응답의 익명 통계', 'What we collect: anonymized stats from profile items and answers')}</li>
              <li>· {t('이름·이메일은 연구에 사용하지 않아요', 'Names and emails are never used in research')}</li>
              <li>· {t('동의하지 않아도 모든 기능을 똑같이 쓸 수 있어요', 'Every feature works the same without consent')}</li>
              <li>· {t('결과는 미국 대입 준비 환경 연구에만 쓰여요', 'Results are used only for research on US admissions preparation')}</li>
            </ul>
            <button
              onClick={() => setShowDetail(false)}
              className="mt-5 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 active:bg-gray-50"
            >
              {t('닫기', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
