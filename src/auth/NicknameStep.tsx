import { useState } from 'react'
import { t } from '../i18n'

interface NicknameStepProps {
  onSubmit: (nickname: string) => Promise<void>
}

// 로그인 직후 닉네임 입력 → 프로필 저장
export default function NicknameStep({ onSubmit }: NicknameStepProps) {
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSubmit(nickname.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('저장에 실패했어요', 'Save failed'))
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('마지막이에요! 닉네임을 정해주세요', 'Last step — pick a nickname')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('리포트에 표시될 이름이에요.', 'Shown on your report.')}</p>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder={t('닉네임 (예: 지율)', 'Nickname (e.g., Jiyul)')}
        maxLength={20}
        className="mt-6 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={saving || nickname.trim().length === 0}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {saving ? t('저장 중…', 'Saving…') : t('저장하고 시작하기', 'Save and start')}
      </button>
    </div>
  )
}
