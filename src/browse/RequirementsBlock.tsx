import { useEffect, useState } from 'react'
import { BookOpenCheck, Check, Clock, AlertTriangle } from 'lucide-react'
import { t } from '../i18n'
import { navigate } from '../lib/router'
import { loadAppRecords } from '../app/appData'
import { profileGrade, type ProfileRow } from '../lib/profile'
import type { CourseInput } from '../lib/courseRecs'
import { loadSchoolReqs, checkReqs, REQ_SUBJECTS, type SchoolReq, type CheckStatus, type SpecificRule } from '../lib/schoolReqs'

// 학교 상세: 고교 과목 요건(필수·권장 연수) + 로그인 시 내 과목 기록과 대조
export const BASIS: Record<string, [string, string]> = {
  required: ['필수 요건', 'Required'],
  recommended: ['권장 (필수 아님)', 'Recommended'],
  mixed: ['일부 필수 · 일부 권장', 'Partly required'],
  none_stated: ['정해진 과목 요건 없음', 'No set pattern'],
}
export const COURSE_KO: Record<SpecificRule['course'], string> = { calculus: '미적분', precalculus: '프리캘큘러스', physics: '물리', chemistry: '화학', biology: '생물', statistics: '통계' }
export const STATUS_UI: Record<CheckStatus, { ko: string; en: string; cls: string; icon: typeof Check }> = {
  met: { ko: '충족', en: 'Met', cls: 'text-emerald-700', icon: Check },
  on_track: { ko: '매년 들으면 충족', en: 'On track if yearly', cls: 'text-blue-700', icon: Clock },
  short: { ko: '부족 위험', en: 'At risk', cls: 'text-rose-700', icon: AlertTriangle },
}
export const forLabel = (f: string) => (f === 'all' ? t('모든 지원자', 'all applicants') : f === 'engineering' ? t('공대 지원자', 'engineering applicants') : f === 'stem' ? t('이공계 지원자', 'STEM applicants') : f)

export default function RequirementsBlock({ schoolId, userId, profile }: { schoolId: number; userId: string | null; profile: ProfileRow | null }) {
  const [r, setR] = useState<SchoolReq | null>(null)
  const [courses, setCourses] = useState<CourseInput[] | null>(null)
  useEffect(() => {
    let alive = true
    void loadSchoolReqs().then((m) => { if (alive) setR(m.get(schoolId) ?? null) })
    if (userId) loadAppRecords(userId).then((rec) => { if (alive) setCourses(rec.courses) }).catch(() => {})
    return () => { alive = false }
  }, [schoolId, userId])
  const c = r?.courses
  if (!c || (!c.basis && !REQ_SUBJECTS.some((s) => c[s.key]) && !c.specific?.length)) return null

  const grade = profile ? profileGrade(profile) : 0
  const mine = courses && courses.length > 0 && grade >= 9 ? checkReqs(c, courses, grade) : null
  const rows = REQ_SUBJECTS.filter((s) => c[s.key] && (c[s.key]!.req || c[s.key]!.rec))

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <BookOpenCheck size={18} strokeWidth={2} className="text-blue-600" />
        {t('고교 과목 요건', 'High-school course requirements')}
        {c.basis && <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{t(...BASIS[c.basis])}</span>}
      </p>
      {rows.length > 0 && (
        <table className="mt-2 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] text-gray-400">
              <th className="py-1 font-medium">{t('과목', 'Subject')}</th>
              <th className="py-1 font-medium">{t('필수', 'Required')}</th>
              <th className="py-1 font-medium">{t('권장', 'Rec.')}</th>
              {mine && <th className="py-1 font-medium">{t('내 기록', 'Mine')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s) => {
              const rule = c[s.key]!
              const chk = mine?.subjects.find((x) => x.key === s.key)
              const S = chk ? STATUS_UI[chk.status] : null
              return (
                <tr key={s.key}>
                  <td className="py-1.5 text-gray-800">{t(s.ko, s.en)}</td>
                  <td className="py-1.5 font-semibold tabular-nums text-gray-900">{rule.req ? t(`${rule.req}년`, `${rule.req} yr`) : '—'}</td>
                  <td className="py-1.5 tabular-nums text-gray-600">{rule.rec ? t(`${rule.rec}년`, `${rule.rec} yr`) : '—'}</td>
                  {mine && <td className={`py-1.5 text-[12px] font-semibold ${S?.cls ?? 'text-gray-400'}`}>{chk && S ? <span className="inline-flex items-center gap-0.5"><S.icon size={12} strokeWidth={2.5} />{t(`${chk.have}년 · ${S.ko}`, `${chk.have} yr · ${S.en}`)}</span> : '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {c.specific?.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-[13px]">
          {c.specific.map((sp, i) => {
            const done = mine?.specific[i]?.done
            return (
              <li key={i} className="flex items-start gap-1.5 text-gray-800">
                <span className={`mt-0.5 shrink-0 rounded-full px-1.5 text-[10.5px] font-semibold ${sp.level === 'required' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>{sp.level === 'required' ? t('필수', 'Required') : t('권장', 'Rec.')}</span>
                <span className="min-w-0 flex-1">{t(`${COURSE_KO[sp.course]} (${forLabel(sp.for)})`, `${sp.course[0].toUpperCase()}${sp.course.slice(1)} (${forLabel(sp.for)})`)}</span>
                {mine && <span className={`shrink-0 text-[11.5px] font-semibold ${done ? 'text-emerald-700' : 'text-gray-400'}`}>{done ? t('✓ 들음', '✓ taken') : t('아직', 'not yet')}</span>}
              </li>
            )
          })}
        </ul>
      )}
      {c.extra_ko && <p className="mt-2 text-[12px] leading-relaxed text-gray-600">{t(c.extra_ko, c.extra_en ?? c.extra_ko)}</p>}
      {r?.note_ko && <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">{t(r.note_ko, r.note_en ?? r.note_ko)}</p>}
      <p className="mt-2.5 text-[11px] text-gray-400">
        {mine ? t('"내 기록"은 학업 탭에 적은 과목이 있는 학년 수예요 (같은 과목 분류, 9–12학년). ', '“Mine” counts the grades (9–12) in which you logged a course in that subject. ') : userId ? t('학업 탭에 과목을 적으면 내 기록과 비교해 드려요. ', 'Log courses in the Education tab to compare. ') : ''}
        {!mine && userId && <button onClick={() => navigate('/app/education')} className="text-blue-600 underline">{t('과목 적기 →', 'Add courses →')}</button>}
        {c.source_url && <> <a href={c.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a></>}
      </p>
    </div>
  )
}
