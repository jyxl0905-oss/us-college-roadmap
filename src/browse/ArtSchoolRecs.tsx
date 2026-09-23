import { t } from '../i18n'
import { navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import { artSchoolsForMajors } from '../data/artSchools'
import { majorLabel } from '../data/majors'
import SchoolLogo from './SchoolLogo'

// 창작 계열 전공(1·2순위) 학생에게 그 전공을 공식 개설한 미술·디자인 전문학교를 자동 추천.
// 이미 목표에 담은 학교는 빼고, 남은 게 없으면 아무것도 표시하지 않음.
export default function ArtSchoolRecs({ profile, className = '' }: { profile: ProfileRow; className?: string }) {
  const majors = [profile.major_primary, profile.major_secondary]
  const targeted = new Set(profile.target_mode === 'schools' ? profile.target_school_ids : [])
  const all = artSchoolsForMajors(majors)
  const list = all.filter((s) => !targeted.has(s.id))
  if (list.length === 0) return null
  const major = majors.find((m) => all.some((s) => (s.art_programs ?? []).includes(m ?? ''))) ?? null
  return (
    <div className={`no-print rounded-xl border-2 border-pink-200 bg-pink-50 px-4 py-3.5 ${className}`}>
      <p className="text-sm font-semibold text-gray-900">🎨 {t(`${majorLabel(major)} 전공 특화 학교 추천`, `Specialized schools for ${majorLabel(major)}`)}</p>
      <p className="mt-0.5 text-xs text-pink-900">
        {t('이 전공을 공식 개설한 미술·디자인 전문학교와 종합대 예술대학이에요. 포트폴리오 심사가 중심이라 종합대와 준비 방식이 달라요 — 눌러서 요구사항을 확인하고 목표에 담을 수 있어요.', 'Art & design schools and university arts schools that officially offer this major. Admissions center on a portfolio review — tap to check requirements and add to your targets.')}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/schools/${slugify(s.name)}`)}
            className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 active:bg-gray-50"
          >
            <SchoolLogo schoolId={s.id} name={s.name} size={16} />
            {t(s.name_ko, s.name)}
          </button>
        ))}
      </div>
    </div>
  )
}
