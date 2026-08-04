import { useState } from 'react'
import { supabase } from '../lib/supabase'

// 온보딩 완료 후 매직 링크 로그인 — 메일의 링크를 누르면 이 앱으로 돌아와 세션이 생김
export default function EmailStep() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendLink = async () => {
    if (!supabase) return
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900">메일함을 확인해 주세요 📬</h1>
        <p className="mt-2 text-sm text-gray-500">
          <strong>{email}</strong>로 로그인 링크를 보냈어요. 메일의 링크를 누르면 입력한 내용이
          저장되고 체크리스트가 열려요.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          메일이 안 보이면 스팸함도 확인해 보세요.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
        >
          이메일 다시 입력하기
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">이메일로 저장할게요</h1>
      <p className="mt-2 text-sm text-gray-500">
        비밀번호 없이 메일로 오는 링크 하나로 로그인돼요. 시즌마다 돌아와서 체크리스트를 이어갈
        수 있어요.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        autoComplete="email"
        className="mt-6 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">전송 실패: {error}</p>}
      <button
        onClick={sendLink}
        disabled={sending || !email.includes('@')}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {sending ? '보내는 중…' : '로그인 링크 보내기'}
      </button>
    </div>
  )
}
