import { useState } from 'react'
import { t } from '../i18n'

// 친구 초대 — 초대 코드(f-내ID 앞 8자리)가 붙은 링크를 공유. 가입 통계에 유입 경로로 잡힘
export default function ShareInvite({ userId, className = '' }: { userId: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const link = `https://us-college-roadmap.vercel.app/?ref=f-${userId.replace(/-/g, '').slice(0, 8)}`
  const text = t(
    '나 이걸로 미국 입시 준비 관리 중 — 학년·전공 맞춤 체크리스트 무료로 받아봐',
    "I'm using this to manage my US college prep — get a free checklist tailored to your grade and major",
  )

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: t('미국 대입 로드맵', 'US College Roadmap'), text, url: link }); return } catch { /* 취소 */ }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { window.prompt(t('링크를 복사하세요', 'Copy this link'), link) }
  }

  return (
    <button onClick={share} className={className}>
      {copied ? t('✅ 링크 복사됨!', '✅ Link copied!') : t('📣 친구에게 공유하기', '📣 Share with a friend')}
    </button>
  )
}
