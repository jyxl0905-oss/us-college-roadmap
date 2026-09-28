import { useEffect, useState } from 'react'
import { Link2, Check, Copy, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { t, getLang } from '../i18n'

const shareUrl = (token: string) => `https://www.uscollegeroadmap.com${getLang() === 'en' ? '/en' : ''}/s/${token}`

// 카운슬러·부모님께 읽기 전용 링크 — 링크 하나(활성)만 유지, 끄면 기존 링크는 바로 막힘
export default function ShareLinkCard({ userId }: { userId: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!supabase) return
    void supabase.from('report_shares').select('token').eq('user_id', userId).is('revoked_at', null).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { setToken(data?.[0]?.token ?? null); setLoaded(true) })
  }, [userId])

  const create = async () => {
    if (!supabase) return
    setBusy(true); setError(false)
    const { data, error: e } = await supabase.rpc('create_report_share')
    setBusy(false)
    if (e || !data) { setError(true); return }
    setToken(data as string)
  }
  const revoke = async () => {
    if (!supabase || !window.confirm(t('링크를 끄면 지금 링크로는 더 볼 수 없어요. 끌까요?', 'Turning it off stops the current link from working. Turn it off?'))) return
    setBusy(true)
    const { error: e } = await supabase.rpc('revoke_report_shares')
    setBusy(false)
    if (e) { setError(true); return }
    setToken(null)
  }
  const copy = async () => {
    if (!token) return
    const url = shareUrl(token)
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    catch { window.prompt(t('링크를 복사하세요', 'Copy this link'), url) }
  }

  if (!loaded) return null
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex items-center gap-1.5 font-semibold text-gray-900"><Link2 size={17} strokeWidth={2} className="text-blue-600" />{t('카운슬러·부모님과 공유', 'Share with a counselor or parent')}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
        {t('로그인 없이 읽기만 가능한 링크예요. 과목·성적, 시험 점수, 활동·수상, 목표·지원 학교, 이번 시즌 체크리스트 진행이 보여요. 에세이·올린 파일·추천인 정보는 보이지 않아요.', 'A read-only link — no login needed. It shows courses and grades, test scores, activities and honors, target and application schools, and this season’s checklist progress. Essays, uploaded files and recommender details are never shown.')}
      </p>
      {token ? (
        <>
          <div className="mt-2.5 flex items-center gap-2">
            <input readOnly value={shareUrl(token)} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[12px] text-gray-700" />
            <button onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white active:bg-blue-700">
              {copied ? <><Check size={14} />{t('복사됨', 'Copied')}</> : <><Copy size={14} />{t('복사', 'Copy')}</>}
            </button>
          </div>
          <button onClick={revoke} disabled={busy} className="mt-2 inline-flex items-center gap-1 text-[12px] text-gray-500 underline disabled:opacity-50">
            <EyeOff size={13} />{t('링크 끄기', 'Turn off link')}
          </button>
        </>
      ) : (
        <button onClick={create} disabled={busy} className="mt-2.5 w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 active:bg-blue-100 disabled:opacity-50">
          {busy ? t('만드는 중…', 'Creating…') : t('읽기 전용 링크 만들기', 'Create a read-only link')}
        </button>
      )}
      {error && <p className="mt-1.5 text-[12px] text-red-600">{t('잠시 후 다시 시도해 주세요.', 'Please try again in a moment.')}</p>}
    </div>
  )
}
