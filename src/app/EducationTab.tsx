import { useEffect, useState } from 'react'
import AppShell from './AppShell'
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

  useEffect(() => {
    loadAppRecords(userId).then((r) => setCourses(r.courses))
  }, [userId])

  const patchProfile = async (patch: Partial<ProfileRow>) => {
    const next = { ...profile, ...patch }
    await saveProfile(userId, next)
    onProfileChange(next)
  }

  const addCourse = async () => {
    const name = newCourse.name.trim()
    if (!name || !courses) return
    const row = await insertRow<Course>('courses', userId, { ...newCourse, name })
    if (row) setCourses([...courses, row])
    setNewCourse({ ...newCourse, name: '' })
  }
  const removeCourse = async (id: number) => {
    await deleteRow('courses', id)
    setCourses((courses ?? []).filter((c) => c.id !== id))
  }

  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'text-xs font-medium text-gray-500'
  const apCount = (courses ?? []).filter((c) => c.level === 'ap').length

  return (
    <AppShell tab="education" title="학업">
      <p className="mt-3 text-sm text-gray-500">리포트의 교과 난이도(rigor) 축이 여기 값으로 계산돼요. 바뀌면 바로 갱신해 두세요.</p>

      <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <label className={label}>GPA (unweighted 4.0 기준)</label>
        <select value={profile.gpa_band ?? ''} onChange={(e) => patchProfile({ gpa_band: e.target.value || null })} className={field}>
          <option value="">—</option>
          {Object.entries(gpaBandLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <label className={`${label} mt-3 block`}>현재 수학 과목</label>
        <select value={profile.math_course ?? ''} onChange={(e) => patchProfile({ math_course: e.target.value || null })} className={field}>
          <option value="">—</option>
          {Object.entries(mathCourseLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className={label}>이수 완료 AP</label>
            <select value={profile.ap_completed ?? 0} onChange={(e) => patchProfile({ ap_completed: Number(e.target.value) })} className={field}>
              {[0,1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}{n === 10 ? '+' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>수강 중 AP</label>
            <select value={profile.ap_current ?? 0} onChange={(e) => patchProfile({ ap_current: Number(e.target.value) })} className={field}>
              {[0,1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}{n === 10 ? '+' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 수강 과목 */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">수강 과목</h2>
        <span className="text-xs text-gray-400">{courses ? `${courses.length}개 · AP ${apCount}` : ''}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">학년별로 적어두면 12학년에 성적표 확인·리거 점검이 쉬워요.</p>

      <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
        <div className="grid grid-cols-[64px_1fr_88px] gap-2">
          <select value={newCourse.grade} onChange={(e) => setNewCourse({ ...newCourse, grade: Number(e.target.value) })} className={field}>
            {GRADES.map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
          <input value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCourse()} placeholder="과목명 (예: Chemistry)" className={field} />
          <select value={newCourse.level} onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value as CourseLevel })} className={field}>
            {(Object.keys(courseLevelKo) as CourseLevel[]).map((l) => <option key={l} value={l}>{courseLevelKo[l]}</option>)}
          </select>
        </div>
        <button onClick={addCourse} disabled={!newCourse.name.trim()} className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
          추가
        </button>
      </div>

      {courses && GRADES.map((g) => {
        const list = courses.filter((c) => c.grade === g)
        if (list.length === 0) return null
        return (
          <div key={g} className="mt-4">
            <p className="text-xs font-semibold text-gray-500">{g}학년</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {list.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm">
                  <span className="text-gray-900">
                    {c.name}
                    {c.level !== 'regular' && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{courseLevelKo[c.level]}</span>}
                  </span>
                  <button onClick={() => removeCourse(c.id)} aria-label="삭제" className="text-gray-300 active:text-red-500">✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </AppShell>
  )
}
