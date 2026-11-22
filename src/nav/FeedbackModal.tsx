import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import { HeartHandshake, MessageCircle } from 'lucide-react'
import { navigate } from '../lib/router'

// 💬 의견 보내기 — 상단 바에서 어느 화면에서든 열림. 내용은 운영 통계에서만 열람
// kind='major': 전공 알아보기의 '전공 추가 요청' — 같은 feedback 테이블에 [전공 추가 요청] 머리말을 붙여 저장 (관리자 피드백 탭에서 확인)
export default function FeedbackModal({ onClose, kind = 'general', initial = '' }: { onClose: () => void; kind?: 'general' | 'major'; initial?: string }) {
  const isMajor = kind === 'major'
  const [message, setMessage] = useState(initial)
  const [state, setState] = useState<'edit' | 'sending' | 'done'>('edit')
  const [error, setError] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) { setLoggedIn(false); return }
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session), () => setLoggedIn(false))
  }, [])

  const send = async () => {
    if (!supabase || state !== 'edit' || message.trim().length < 2) return
    setState('sending'); setError(null)
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user.id
    if (!uid) { setError(t('로그인 후 보낼 수 있어요.', 'Please log in to send feedback.')); setState('edit'); return }
    const body = isMajor ? `[전공 추가 요청] ${message.trim()}` : message.trim()
    const { error } = await supabase.from('feedback').insert({ user_id: uid, message: body.slice(0, 2000), page: window.location.pathname })
    if (error) {
      setError(error.message.includes('too many')
        ? t('잠시 후 다시 보내 주세요 — 1시간에 10건까지 보낼 수 있어요.', 'Please try again later — up to 10 messages per hour.')
        : t('보내지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.', 'Couldn’t send. Check your connection and try again.'))
      setState('edit')
      return
    }
    setState('done')
  }

  // 상단 바(backdrop-blur)가 fixed의 기준이 되어 모달이 헤더 안에 갇히는 문제 → body로 포털
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5 sm:rounded-2xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
        {state === 'done' ? (
          <div className="py-6 text-center">
            <p className="flex justify-center text-blue-600"><HeartHandshake size={32} strokeWidth={1.9} /></p>
            <p className="mt-3 font-semibold text-gray-900">{t('고마워요! 잘 전달됐어요.', 'Thank you! Your feedback was sent.')}</p>
            <p className="mt-1 text-sm text-gray-500">{isMajor
              ? t('운영자가 확인하고, 공식 자료로 정리할 수 있는 전공부터 추가할게요.', 'We’ll review it and add majors we can cover with official sources.')
              : t('보내주신 의견은 다음 업데이트에 반영할게요.', 'We read every note and use it for the next update.')}</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700">{t('닫기', 'Close')}</button>
          </div>
        ) : loggedIn === false ? (
          <div className="py-4 text-center">
            <p className="flex justify-center text-blue-600"><MessageCircle size={30} strokeWidth={1.9} /></p>
            <p className="mt-3 font-semibold text-gray-900">{isMajor ? t('전공 추가 요청', 'Request a major') : t('의견 보내기', 'Send feedback')}</p>
            <p className="mt-1 text-sm text-gray-500">{t('스팸을 막으려고 로그인한 경우에만 보낼 수 있어요. 가입은 무료예요.', 'To prevent spam, you need to log in to send this. Signing up is free.')}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 active:bg-gray-50">{t('닫기', 'Close')}</button>
              <button onClick={() => { onClose(); navigate('/') }} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700">{t('로그인하러 가기', 'Go log in')}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="flex items-center gap-1.5 font-semibold text-gray-900"><MessageCircle size={18} strokeWidth={2} className="text-blue-600" />{isMajor ? t('전공 추가 요청', 'Request a major') : t('의견 보내기', 'Send feedback')}</p>
            <p className="mt-0.5 text-xs text-gray-500">{isMajor
              ? t('목록에 없는 전공이나, 더 자세히 알고 싶은 전공을 적어주세요. 운영자가 보고 추가해요.', 'Tell us a major that’s missing, or one you want more detail on. We’ll review and add it.')
              : t('불편한 점, 바라는 기능, 이상한 정보 — 뭐든 자유롭게 적어주세요.', 'Anything goes — bugs, feature wishes, wrong info.')}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={4}
              autoFocus
              placeholder={isMajor
                ? t('예: 산업디자인(Industrial Design) 전공도 있으면 좋겠어요 / 컴퓨터공학 가이드에 어떤 AP가 좋은지 더 알고 싶어요', 'e.g., Please add Industrial Design / I want to know more about which APs fit CS')
                : t('예: 체크리스트에 이런 항목도 있으면 좋겠어요', 'e.g., I wish the checklist had…')}
              className="mt-3 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 active:bg-gray-50">{t('취소', 'Cancel')}</button>
              <button onClick={send} disabled={state === 'sending' || message.trim().length < 2} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400">
                {state === 'sending' ? t('보내는 중…', 'Sending…') : t('보내기', 'Send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
