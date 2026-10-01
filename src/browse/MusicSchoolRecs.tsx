import { Music } from 'lucide-react'
import { t, getLang } from '../i18n'
import { navigate } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import { musicSchools } from '../guide/MusicSchoolsPage'

// 음악 전공(1·2순위) 학생에게 음악 학교·오디션 가이드를 추천 — 목표 학교 안의 음대를 먼저
export default function MusicSchoolRecs({ profile, className = '' }: { profile: ProfileRow; className?: string }) {
  if (profile.major_primary !== 'music' && profile.major_secondary !== 'music') return null
  const targets = new Set(profile.target_mode === 'schools' ? profile.target_school_ids : [])
  const inTargets = musicSchools.filter((s) => s.school_id !== null && targets.has(s.school_id))
  const picks = (inTargets.length ? inTargets : musicSchools.filter((s) => s.type === 'conservatory')).slice(0, 6)
  return (
    <div className={`no-print rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-3.5 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Music size={16} strokeWidth={2} className="text-violet-600" />{t('음악 전공 — 오디션 준비가 핵심이에요', 'Music major — auditions are key')}</p>
      <p className="mt-0.5 text-xs text-violet-900">
        {inTargets.length
          ? t(`목표 학교 중 ${inTargets.length}곳에 음대가 있어요. 대부분 12월 초까지 프리스크린 영상을 내야 해요.`, `${inTargets.length} of your targets have a music school. Most need a prescreen video by early December.`)
          : t('음악 전문학교와 대학 안 음대의 마감·프리스크린·오디션 방식을 비교해 보세요.', 'Compare deadlines, prescreens and audition formats at conservatories and university music schools.')}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {picks.map((s) => (
          <button key={s.key} onClick={() => navigate(`/guide/music#music-${s.key}`)} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 active:bg-gray-50">
            {getLang() === 'ko' ? s.name_ko : s.program_name}
          </button>
        ))}
        <button onClick={() => navigate('/guide/music')} className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">{t('음악 학교 가이드 전체 →', 'Full music guide →')}</button>
      </div>
    </div>
  )
}
