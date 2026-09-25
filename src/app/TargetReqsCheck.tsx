import { useEffect, useState } from 'react'
import { BookOpenCheck, ChevronDown } from 'lucide-react'
import { t, getLang } from '../i18n'
import { navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import { loadSchools } from '../lib/schoolsCache'
import { tierSchoolsFrom } from '../lib/tierSchools'
import type { School } from '../lib/types'
import type { CourseInput } from '../lib/courseRecs'
import SchoolLogo from '../browse/SchoolLogo'
import { loadSchoolReqs, checkReqs, REQ_SUBJECTS, type SchoolReq } from '../lib/schoolReqs'
import { STATUS_UI, COURSE_KO, forLabel } from '../browse/RequirementsBlock'

// 목표 학교 과목 요건 체크 — 학교마다 공식 필수·권장 연수 대비 내 기록 (학업 탭)
export default function TargetReqsCheck({ courses, grade, profile }: { courses: CourseInput[]; grade: number; profile: ProfileRow }) {
  const [schools, setSchools] = useState<School[]>([])
  const [reqs, setReqs] = useState<Map<number, SchoolReq> | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    void loadSchoolReqs().then(setReqs)
    loadSchools().then((all) => setSchools(
      profile.target_mode === 'schools' ? all.filter((s) => profile.target_school_ids.includes(s.id))
        : profile.target_mode === 'tier' ? tierSchoolsFrom(all, profile.target_tier) : [],
    ))
  }, [profile.target_mode, profile.target_tier, profile.target_school_ids.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!reqs) return null
  const rows = schools.map((s) => ({ s, r: reqs.get(s.id)?.courses ?? null })).filter((x) => x.r && REQ_SUBJECTS.some((k) => x.r![k.key]))
  if (schools.length === 0) {
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><BookOpenCheck size={15} strokeWidth={2} />{t('목표 학교 과목 요건 체크', 'Target-school course requirements')}</p>
        <p className="mt-1 text-xs text-gray-600">{t('목표 학교를 정하면 학교마다 필수·권장 과목을 채우고 있는지 보여드려요.', 'Set target schools to check their required/recommended courses against your record.')} <button onClick={() => navigate('/schools')} className="font-medium text-blue-600 underline">{t('학교 고르기 →', 'Pick schools →')}</button></p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><BookOpenCheck size={15} strokeWidth={2} />{t('목표 학교 과목 요건 체크', 'Target-school course requirements')}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{t('각 학교 공식 입학처의 필수·권장 연수와 내 기록(과목이 있는 학년 수)을 비교해요.', 'Compares each school’s official required/recommended years with your record (grades with a course in that subject).')}</p>
      <ul className="mt-2 flex flex-col divide-y divide-gray-100">
        {rows.map(({ s, r }) => {
          const chk = checkReqs(r!, courses, grade)
          const short = chk.subjects.filter((x) => x.status === 'short')
          const track = chk.subjects.filter((x) => x.status === 'on_track')
          const missReq = chk.specific.filter((x) => !x.done && x.rule.level === 'required' && x.rule.for === 'all')
          const isOpen = open === s.id
          const summary = short.length > 0 || missReq.length > 0
            ? { cls: 'text-rose-700', ko: `부족 위험 ${short.length + missReq.length}`, en: `${short.length + missReq.length} at risk` }
            : track.length > 0 ? { cls: 'text-blue-700', ko: `매년 들으면 충족 ${track.length}`, en: `${track.length} on track` }
            : { cls: 'text-emerald-700', ko: '모두 충족', en: 'All met' }
          return (
            <li key={s.id} className="py-2">
              <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-2 text-left">
                <SchoolLogo schoolId={s.id} name={s.name} size={22} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-900">{getLang() === 'en' ? s.name : s.name_ko || s.name}</span>
                <span className={`shrink-0 text-[11.5px] font-semibold ${summary.cls}`}>{t(summary.ko, summary.en)}</span>
                <ChevronDown size={14} className={`shrink-0 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-[12px]">
                  {chk.subjects.map((x) => {
                    const S = STATUS_UI[x.status]
                    const sub = REQ_SUBJECTS.find((k) => k.key === x.key)!
                    return (
                      <p key={x.key} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-gray-700">{t(sub.ko, sub.en)} · {x.kind === 'required' ? t(`필수 ${x.target}년`, `${x.target} yr required`) : t(`권장 ${x.target}년`, `${x.target} yr rec.`)}</span>
                        <span className={`inline-flex items-center gap-0.5 font-semibold ${S.cls}`}><S.icon size={12} strokeWidth={2.5} />{t(`${x.have}년 · ${S.ko}`, `${x.have} yr · ${S.en}`)}</span>
                      </p>
                    )
                  })}
                  {chk.specific.map((x, i) => (
                    <p key={i} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-gray-700">{t(`${COURSE_KO[x.rule.course]} ${x.rule.level === 'required' ? '필수' : '권장'} (${forLabel(x.rule.for)})`, `${x.rule.course} ${x.rule.level} (${forLabel(x.rule.for)})`)}</span>
                      <span className={`font-semibold ${x.done ? 'text-emerald-700' : 'text-gray-400'}`}>{x.done ? t('✓ 들음', '✓ taken') : t('아직', 'not yet')}</span>
                    </p>
                  ))}
                  <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="mt-1 text-[11px] font-medium text-blue-600 underline">{t('학교 상세·공식 출처 →', 'School details & source →')}</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {rows.length < schools.length && <p className="mt-1 text-[11px] text-gray-400">{t(`나머지 ${schools.length - rows.length}곳은 공식 페이지에 과목별 연수가 없어요.`, `${schools.length - rows.length} other schools don’t list years by subject.`)}</p>}
    </div>
  )
}
