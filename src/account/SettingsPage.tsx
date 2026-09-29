import { useState } from 'react'
import { ChevronRight, LogOut, MessageCircle, Settings } from 'lucide-react'
import { saveProfile, type ProfileRow } from '../lib/profile'
import { researchAllowed } from '../lib/role'
import { logout } from '../lib/logout'
import { navigate } from '../lib/router'
import { t } from '../i18n'
import LangToggle from '../i18n/LangToggle'
import { setTheme, useDark } from '../nav/ThemeToggle'
import FeedbackModal from '../nav/FeedbackModal'
import ShareLinkCard from '../share/ShareLinkCard'
import DeleteAccount from './DeleteAccount'

interface SettingsPageProps {
  userId: string
  email: string | null
  profile: ProfileRow
  onProfileChange: (p: ProfileRow) => void
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Row({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {sub && <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h2 className="mb-2 px-1 text-xs font-semibold text-gray-500">{title}</h2>
    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border-2 border-gray-200 bg-white">{children}</div>
  </section>
)

// 설정 — 계정·알림·화면·공유·개인정보·로그아웃·계정 삭제를 한곳에 (로그인 전용)
export default function SettingsPage({ userId, email, profile, onProfileChange }: SettingsPageProps) {
  const dark = useDark()
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const role = profile.user_role ?? 'student'
  const canResearch = researchAllowed({ role, status: profile.applicant_status })

  const save = async (next: ProfileRow) => {
    setError(false)
    try {
      await saveProfile(userId, next)
      onProfileChange(next)
      return true
    } catch {
      setError(true)
      return false
    }
  }
  const saveNickname = async () => {
    const v = nickname.trim()
    if (!v || v === profile.nickname) return
    setSaving(true)
    const ok = await save({ ...profile, nickname: v })
    setSaving(false)
    if (ok) { setSaved(true); window.setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-8">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><Settings size={22} strokeWidth={2} />{t('설정', 'Settings')}</h1>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('저장하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.', 'Couldn’t save. Check your connection and try again.')}</p>}

        <Section title={t('계정', 'Account')}>
          <Row title={t('로그인 이메일', 'Login email')}>
            <span className="min-w-0 truncate text-sm text-gray-500">{email ?? '—'}</span>
          </Row>
          <div className="px-4 py-3.5">
            <label htmlFor="nickname" className="text-sm font-semibold text-gray-900">{t('닉네임', 'Nickname')}</label>
            <div className="mt-2 flex gap-2">
              <input id="nickname" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} className="min-w-0 flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
              <button onClick={saveNickname} disabled={saving || !nickname.trim() || nickname.trim() === profile.nickname} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {saved ? t('저장됨', 'Saved') : saving ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
              </button>
            </div>
          </div>
          <Row title={t('사용하는 사람', 'Who’s using this')} sub={t('부모님으로 바꾸면 문구만 "자녀" 기준으로 바뀌고 기록은 그대로예요', 'Switching to parent only changes wording to “your child”; records stay the same')}>
            <span className="inline-flex shrink-0 rounded-full border border-gray-200 p-0.5">
              {(['student', 'parent'] as const).map((r) => (
                <button key={r} onClick={() => role !== r && void save({ ...profile, user_role: r })} aria-pressed={role === r} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${role === r ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>
                  {r === 'student' ? t('학생', 'Student') : t('부모', 'Parent')}
                </button>
              ))}
            </span>
          </Row>
        </Section>

        <Section title={t('알림', 'Notifications')}>
          <Row title={t('알림 이메일', 'Reminder emails')} sub={t('8월·1월·6월 시즌이 열릴 때 한 통, 그리고 지원 학교 탭에 입력한 마감일 이틀 전에 한 통', 'One email when the Aug/Jan/Jun season opens, and one two days before each deadline you enter in your college list')}>
            <Switch on={!profile.reminder_opt_out} label={t('알림 이메일', 'Reminder emails')} onClick={() => void save({ ...profile, reminder_opt_out: !profile.reminder_opt_out })} />
          </Row>
        </Section>

        <Section title={t('화면', 'Display')}>
          <Row title={t('언어', 'Language')} sub={t('알림 이메일도 이 언어로 보내요', 'Reminder emails use this language too')}>
            <LangToggle className="shrink-0" />
          </Row>
          <Row title={t('다크 모드', 'Dark mode')}>
            <Switch on={dark} label={t('다크 모드', 'Dark mode')} onClick={() => setTheme(!dark)} />
          </Row>
        </Section>

        <section className="mt-6">
          <h2 className="mb-2 px-1 text-xs font-semibold text-gray-500">{t('공유', 'Sharing')}</h2>
          <ShareLinkCard userId={userId} />
        </section>

        {canResearch && (
          <Section title={t('개인정보', 'Privacy')}>
            <Row title={t('익명 통계 연구 활용 동의 (선택)', 'Anonymized research use (optional)')} sub={t('이름·이메일은 쓰지 않아요. 끄더라도 모든 기능을 똑같이 쓸 수 있어요.', 'Names and emails are never used. Every feature works the same when off.')}>
              <Switch on={!!profile.research_consent} label={t('연구 활용 동의', 'Research consent')} onClick={() => void save({ ...profile, research_consent: !profile.research_consent })} />
            </Row>
          </Section>
        )}

        <Section title={t('도움말·정책', 'Help & policies')}>
          {[
            { to: '/about', label: t('서비스 소개', 'About') },
            { to: '/privacy', label: t('개인정보처리방침', 'Privacy policy') },
            { to: '/terms', label: t('이용약관', 'Terms of service') },
          ].map((l) => (
            <button key={l.to} onClick={() => navigate(l.to)} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-gray-900 active:bg-gray-50">
              {l.label}<ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
          <button onClick={() => setFeedbackOpen(true)} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-gray-900 active:bg-gray-50">
            <span className="flex items-center gap-1.5"><MessageCircle size={15} strokeWidth={2} />{t('의견 보내기', 'Send feedback')}</span><ChevronRight size={16} className="text-gray-400" />
          </button>
        </Section>

        <button onClick={async () => { await logout(); navigate('/') }} className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">
          <LogOut size={15} strokeWidth={2} />{t('로그아웃', 'Log out')}
        </button>

        <DeleteAccount userId={userId} />
      </div>
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}
