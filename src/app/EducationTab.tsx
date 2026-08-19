import { useEffect, useRef, useState } from 'react'
import AppShell from './AppShell'
import { t } from '../i18n'
import { saveProfile, profileGrade, type ProfileRow } from '../lib/profile'
import { gpaBandLabels, mathCourseLabels } from '../onboarding/labels'
import { insertRow, deleteRow, loadAppRecords, courseLevelKo, type Course, type CourseLevel } from './appData'

interface EducationTabProps {
  userId: string
  profile: ProfileRow
  onProfileChange: (p: ProfileRow) => void
}

const GRADES = [9, 10, 11, 12]

// F5 학업 — 프로필의 GPA·수학·AP 수강 편집 + 학년별 수강 과목 목록 (참고 표시, 점수 반영은 v2)
export default function EducationTab({ userId, profile, onProfileChange }: EducationTabProps) {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [newCourse, setNewCourse] = useState<{ grade: number; name: string; level: CourseLevel }>({
    grade: Math.min(12, Math.max(9, profileGrade(profile))), name: '', level: 'regular',
  })
  const busyRef = useRef(false) // Enter 연타·더블탭 중복 추가 방지

  useEffect(() => {
    loadAppRecords(userId).then((r) => setCourses(r.courses))
  }, [userId])

  const patchProfile = async (patch: Partial<ProfileRow>) => {
    const next = { ...profile, ...patch }
    try {
      await saveProfile(userId, next)
      onProfileChange(next)
    } catch (e) {
      alert(t(`저장에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.\n(${(e as Error).message})`, `Save failed. Check your connection and try again.\n(${(e as Error).message})`))
    }
  }

  const addCourse = async () => {
    const name = newCourse.name.trim()
    if (!name || !courses || busyRef.current) return
    busyRef.current = true
    try {
      const row = await insertRow<Course>('courses', userId, { ...newCourse, name })
      if (row) setCourses([...courses, row])
      setNewCourse({ ...newCourse, name: '' })
    } catch { /* insertRow가 이미 alert — 입력값 유지 */ } finally { busyRef.current = false }
  }
  const removeCourse = async (id: number) => {
    try {
      await deleteRow('courses', id)
      setCourses((courses ?? []).filter((c) => c.id !== id))
    } catch { /* deleteRow가 이미 alert */ }
  }

  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'text-xs font-medium text-gray-500'
  const apCount = (courses ?? []).filter((c) => c.level === 'ap').length

  return (
    <AppShell tab="education" title={t('학업', 'Education')}>
      <p className="mt-3 text-sm text-gray-500">{t('리포트의 교과 난이도(rigor) 축이 여기 값으로 계산돼요. 바뀌면 바로 갱신해 두세요.', 'The rigor axis in your report is calculated from these values. Update them as soon as anything changes.')}</p>

      <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <label className={label}>{t('GPA (unweighted 4.0 기준)', 'GPA (unweighted, 4.0 scale)')}</label>
        <select value={profile.gpa_band ?? ''} onChange={(e) => patchProfile({ gpa_band: e.target.value || null })} className={field}>
          <option value="">—</option>
          {Object.entries(gpaBandLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <label className={`${label} mt-3 block`}>{t('현재 수학 과목', 'Current math course')}</label>
        <select value={profile.math_course ?? ''} onChange={(e) => patchProfile({ math_course: e.target.value || null })} className={field}>
          <option value="">—</option>
          {Object.entries(mathCourseLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className={label}>{t('이수 완료 AP', 'APs completed')}</label>
            <select value={profile.ap_completed ?? 0} onChange={(e) => patchProfile({ ap_completed: Number(e.target.value) })} className={field}>
              {[0,1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}{n === 10 ? '+' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>{t('수강 중 AP', 'APs in progress')}</label>
            <select value={profile.ap_current ?? 0} onChange={(e) => patchProfile({ ap_current: Number(e.target.value) })} className={field}>
              {[0,1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}{n === 10 ? '+' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 수강 과목 */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">{t('수강 과목', 'Courses')}</h2>
        <span className="text-xs text-gray-400">{courses ? t(`${courses.length}개 · AP ${apCount}`, `${courses.length} · AP ${apCount}`) : ''}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{t('학년별로 적어두면 12학년에 성적표 확인·리거 점검이 쉬워요.', 'Listing courses by grade makes transcript and rigor checks easy in 12th grade.')}</p>

      <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <div className="grid grid-cols-[64px_1fr_88px] gap-2">
          <select value={newCourse.grade} onChange={(e) => setNewCourse({ ...newCourse, grade: Number(e.target.value) })} className={field}>
            {GRADES.map((g) => <option key={g} value={g}>{t(`${g}학년`, `Grade ${g}`)}</option>)}
          </select>
          <input value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addCourse() }} placeholder={t('과목명 (예: Chemistry)', 'Course name (e.g. Chemistry)')} className={field} />
          <select value={newCourse.level} onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value as CourseLevel })} className={field}>
            {(Object.keys(courseLevelKo) as CourseLevel[]).map((l) => <option key={l} value={l}>{courseLevelKo[l]}</option>)}
          </select>
        </div>
        <button onClick={addCourse} disabled={!newCourse.name.trim()} className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
          {t('추가', 'Add')}
        </button>
      </div>

      {courses && GRADES.map((g) => {
        const list = courses.filter((c) => c.grade === g)
        if (list.length === 0) return null
        return (
          <div key={g} className="mt-4">
            <p className="text-xs font-semibold text-gray-500">{t(`${g}학년`, `Grade ${g}`)}</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {list.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 break-words text-gray-900">
                    {c.name}
                    {c.level !== 'regular' && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{courseLevelKo[c.level]}</span>}
                  </span>
                  <button onClick={() => removeCourse(c.id)} aria-label={t('삭제', 'Delete')} className="ml-2 shrink-0 text-gray-300 active:text-red-500">✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </AppShell>
  )
}
