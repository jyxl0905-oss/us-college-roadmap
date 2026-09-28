import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logout } from '../lib/logout'
import { navigate } from '../lib/router'
import { t } from '../i18n'

const CONFIRM_KO = '삭제'
const CONFIRM_EN = 'DELETE'

// 올린 파일(records/{userId}/{학년}/파일) — DB에서 직접 지울 수 없어 스토리지 API로 먼저 지움
async function removeMyFiles(userId: string): Promise<void> {
  if (!supabase) return
  const bucket = supabase.storage.from('records')
  const { data: folders } = await bucket.list(userId, { limit: 100 })
  for (const f of folders ?? []) {
    const dir = `${userId}/${f.name}`
    const { data: files } = await bucket.list(dir, { limit: 1000 })
    const paths = (files ?? []).filter((x) => x.id).map((x) => `${dir}/${x.name}`)
    if (f.id) paths.push(dir) // 폴더가 아니라 파일인 경우
    if (paths.length) await bucket.remove(paths)
  }
}

// 계정 삭제 — 되돌릴 수 없음. 확인 단어를 입력해야 버튼이 켜짐
export default function DeleteAccount({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const word = t(CONFIRM_KO, CONFIRM_EN)
  const ready = typed.trim() === word

  const run = async () => {
    if (!supabase || !ready) return
    setBusy(true); setError(false)
    try {
      await removeMyFiles(userId)
      const { error: e } = await supabase.rpc('delete_my_account')
      if (e) throw e
      await logout()
      window.alert(t('계정과 모든 기록을 삭제했어요. 그동안 이용해 주셔서 고마워요.', 'Your account and all records have been deleted. Thanks for using US College Roadmap.'))
      navigate('/')
    } catch {
      setBusy(false); setError(true)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="no-print mt-8 inline-flex items-center gap-1 text-xs text-gray-400 underline">
        <Trash2 size={12} />{t('계정 삭제', 'Delete account')}
      </button>
    )
  }
  return (
    <div className="no-print mt-8 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3.5">
      <p className="flex items-center gap-1.5 font-semibold text-red-800"><Trash2 size={16} />{t('계정과 모든 기록 삭제', 'Delete your account and all records')}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-red-800">
        {t('프로필, 체크리스트, 과목·성적, 시험 점수, 활동·수상, 에세이, 추천인, 지원 학교, 올린 파일, 공유 링크가 모두 바로 지워지고 되돌릴 수 없어요. 같은 이메일로 다시 가입하면 처음부터 시작해요.', 'Your profile, checklist, courses and grades, test scores, activities and honors, essays, recommenders, college list, uploaded files and share links are deleted immediately and cannot be recovered. Signing up again with the same email starts from scratch.')}
      </p>
      <label className="mt-2.5 block text-[12px] text-red-900">
        {t(`확인을 위해 "${CONFIRM_KO}"라고 입력해 주세요`, `Type "${CONFIRM_EN}" to confirm`)}
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 block w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-900" autoComplete="off" />
      </label>
      <div className="mt-2.5 flex gap-2">
        <button onClick={run} disabled={!ready || busy} className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? t('삭제하는 중…', 'Deleting…') : t('영구 삭제', 'Delete permanently')}
        </button>
        <button onClick={() => { setOpen(false); setTyped('') }} disabled={busy} className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700">
          {t('취소', 'Cancel')}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-red-700">{t('삭제하지 못했어요. 잠시 후 다시 시도하거나 uscollegeroadmap@gmail.com으로 알려 주세요.', 'Couldn’t delete. Try again shortly or email uscollegeroadmap@gmail.com.')}</p>}
    </div>
  )
}
