import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'

// 💬 의견 보내기 — 상단 바에서 어느 화면에서든 열림. 내용은 운영 통계에서만 열람
export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'edit' | 'sending' | 'done'>('edit')
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!supabase || state !== 'edit' || message.trim().length < 2) return
    setState('sending'); setError(null)
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user.id
    if (!uid) { setError(t('로그인 후 보낼 수 있어요.', 'Please log in to send feedback.')); setState('edit'); return }
    const { error } = await supabase.from('feedback').insert({ user_id: uid, message: message.trim().slice(0, 2000), page: window.location.pathname })
    if (error) { setError(error.message); setState('edit'); return }
    setState('done')
  }

  // 상단 바(backdrop-blur)가 fixed의 기준이 되어 모달이 헤더 안에 갇히는 문제 → body로 포털
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5 sm:rounded-2xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
        {state === 'done' ? (
          <div className="py-6 text-center">
            <p className="text-3xl">🙏</p>
            <p className="mt-3 font-semibold text-gray-900">{t('고마워요! 잘 전달됐어요.', 'Thank you! Your feedback was sent.')}</p>
            <p className="mt-1 text-sm text-gray-500">{t('보내주신 의견은 다음 업데이트에 반영할게요.', 'We read every note and use it for the next update.')}</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700">{t('닫기', 'Close')}</button>
          </div>
        ) : (
          <>
            <p className="font-semibold text-gray-900">💬 {t('의견 보내기', 'Send feedback')}</p>
            <p className="mt-0.5 text-xs text-gray-500">{t('불편한 점, 바라는 기능, 이상한 정보 — 뭐든 자유롭게 적어주세요.', 'Anything goes — bugs, feature wishes, wrong info.')}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={4}
              autoFocus
              placeholder={t('예: 체크리스트에 이런 항목도 있으면 좋겠어요', 'e.g., I wish the checklist had…')}
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
