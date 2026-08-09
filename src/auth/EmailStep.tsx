import { useState } from 'react'
import { supabase } from '../lib/supabase'

// 만료·사용된 링크로 돌아온 경우 URL 해시에 에러가 담겨 옴
const cameFromExpiredLink = window.location.hash.includes('error')

export const RESEARCH_CONSENT_KEY = 'research_consent' // R1-A③: 닉네임 저장 시 프로필로 옮겨짐

// 온보딩 완료 후 매직 링크 로그인 — 메일의 링크를 누르면 이 앱으로 돌아와 세션이 생김
export default function EmailStep() {
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

  const sendLink = async () => {
    if (!supabase) return
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (error)
      setError(
        error.message.includes('rate limit')
          ? '메일 전송 한도(시간당 2통)를 초과했어요. 1시간 뒤에 다시 시도해 주세요.'
          : error.message,
      )
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
      {cameFromExpiredLink && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          이전 로그인 링크가 만료됐어요. 이메일을 다시 입력하고 새 링크를 받아주세요. (링크는
          1회용이에요)
        </p>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        autoComplete="email"
        className="mt-6 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">전송 실패: {error}</p>}

      {/* R1-A③: 연구 동의 (선택, 기본 해제) */}
      <label className="mt-4 flex items-start gap-2.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={toggleConsent}
          className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
        />
        <span>
          (선택) 익명화된 통계 데이터를 연구 목적으로 활용하는 데 동의합니다{' '}
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="text-blue-600 underline"
          >
            [자세히]
          </button>
        </span>
      </label>

      <button
        onClick={sendLink}
        disabled={sending || !email.includes('@')}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {sending ? '보내는 중…' : '로그인 링크 보내기'}
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
            <p className="font-semibold text-gray-900">연구 데이터 활용 안내</p>
            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-600">
              <li>· 수집하는 것: 프로필 항목과 응답의 익명 통계</li>
              <li>· 이름·이메일은 연구에 사용하지 않아요</li>
              <li>· 동의하지 않아도 모든 기능을 똑같이 쓸 수 있어요</li>
              <li>· 결과는 미국 대입 준비 환경 연구에만 쓰여요</li>
            </ul>
            <button
              onClick={() => setShowDetail(false)}
              className="mt-5 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 active:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
