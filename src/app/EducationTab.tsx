import { useEffect, useRef, useState } from 'react'
import AppShell from './AppShell'
import { t } from '../i18n'
import { saveProfile, profileGrade, type ProfileRow } from '../lib/profile'
import { gpaBandLabels, mathCourseLabels } from '../onboarding/labels'
import { insertRow, updateRow, deleteRow, loadAppRecords, courseLevelKo, type Course, type CourseLevel } from './appData'
import { supabase } from '../lib/supabase'
import { computeGpa, courseLetter, gpaToBand, LETTERS } from './gpa'

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
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, string>>({}) // 과목별 성적 입력창 임시값
  const [convOpen, setConvOpen] = useState(false)

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
      const row = await insertRow<Course>('courses', userId, { ...newCourse, name, letter_grade: null, percent: null, credits: 1 })
      if (row) setCourses([...courses, row])
      setNewCourse({ ...newCourse, name: '' })
    } catch { /* insertRow가 이미 alert — 입력값 유지 */ } finally { busyRef.current = false }
  }
  // 성적 입력: 'A-' 같은 레터 또는 '95' 같은 % 를 한 입력창에서 받음
  const saveGrade = async (c: Course, raw: string) => {
    const v = raw.trim().toUpperCase()
    let patch: Partial<Course>
    if (v === '') patch = { letter_grade: null, percent: null }
    else if (LETTERS.includes(v)) patch = { letter_grade: v, percent: null }
    else if (/^\d{1,3}$/.test(v) && Number(v) <= 100) patch = { letter_grade: null, percent: Number(v) }
    else {
      alert(t('성적은 A+~F 레터 또는 0~100 숫자로 적어 주세요. (예: A-, 95)', 'Enter a letter grade (A+–F) or a number 0–100 (e.g. A-, 95).'))
      setGradeDrafts((d) => { const n = { ...d }; delete n[c.id]; return n })
      return
    }
    try {
      await updateRow<Course>('courses', c.id, patch)
      setCourses((list) => (list ?? []).map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
    } catch { /* updateRow가 이미 alert */ }
    setGradeDrafts((d) => { const n = { ...d }; delete n[c.id]; return n })
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

      {/* GPA 자동 계산 — 과목 성적 기반 (표준 4.0 산식, 산식 공개) */}
      {courses && (() => {
        const total = computeGpa(courses)
        if (!total) return (
          <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500">
            🧮 {t('아래 과목에 성적(A-, 95 등)을 적으면 학년별·누적 GPA를 자동 계산해 드려요.', 'Add grades to your courses below (A-, 95…) and we’ll compute your GPA by year and overall.')}
          </div>
        )
        const suggested = gpaToBand(total.unweighted)
        const bandMismatch = profile.gpa_band && profile.gpa_band !== 'none' && profile.gpa_band !== 'ninth' && profile.gpa_band !== suggested
        const noBand = !profile.gpa_band || profile.gpa_band === 'none' || profile.gpa_band === 'ninth'
        return (
          <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-4">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-gray-900">🧮 {t('내 GPA (자동 계산)', 'My GPA (auto-calculated)')}</p>
              <span className="text-[11px] text-gray-400">{t(`성적 입력 ${total.gradedCredits}과목 기준`, `Based on ${total.gradedCredits} graded courses`)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-white px-3 py-2.5">
                <p className="text-[11px] text-gray-400">Unweighted (4.0)</p>
                <p className="text-xl font-bold text-gray-900">{total.unweighted.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2.5">
                <p className="text-[11px] text-gray-400">Weighted (AP·IB +1 / Honors +0.5)</p>
                <p className="text-xl font-bold text-gray-900">{total.weighted.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {GRADES.map((g) => {
                const r = computeGpa(courses.filter((c) => c.grade === g))
                if (!r) return null
                return (
                  <p key={g} className="flex justify-between text-xs text-gray-600">
                    <span>{t(`${g}학년`, `Grade ${g}`)}</span>
                    <span>UW {r.unweighted.toFixed(2)} · W {r.weighted.toFixed(2)}</span>
                  </p>
                )
              })}
            </div>
            {(bandMismatch || noBand) && (
              <button
                onClick={() => patchProfile({ gpa_band: suggested })}
                className="mt-3 w-full rounded-lg border-2 border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 active:bg-blue-50"
              >
                {t(`프로필 GPA 밴드를 '${gpaBandLabels[suggested as keyof typeof gpaBandLabels]}'로 업데이트 (리포트에 반영)`, `Update profile GPA band to '${gpaBandLabels[suggested as keyof typeof gpaBandLabels]}' (used in your report)`)}
              </button>
            )}
            <button onClick={() => setConvOpen((v) => !v)} className="mt-2 text-[11px] text-gray-400 underline">
              {convOpen ? t('산식 접기 ▴', 'Hide formula ▴') : t('산식 보기 — 어떻게 계산하나요? ▾', 'How is this calculated? ▾')}
            </button>
            {convOpen && (
              <div className="mt-1.5 rounded-lg bg-white px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">
                <p>{t('미국 대학·College Board에서 통용되는 표준 산식이에요. 참고치이며, 대학마다 재계산 방식이 다를 수 있어요.', 'The standard scale used by US colleges and the College Board. A reference — colleges may recalculate differently.')}</p>
                <p className="mt-1">A/A+ 4.0 · A- 3.7 · B+ 3.3 · B 3.0 · B- 2.7 · C+ 2.3 · C 2.0 · C- 1.7 · D+ 1.3 · D 1.0 · F 0</p>
                <p className="mt-1">% → {t('레터', 'letter')}: 97+ A+ · 93–96 A · 90–92 A- · 87–89 B+ · 83–86 B · 80–82 B- · 77–79 C+ · 73–76 C · 70–72 C- · 67–69 D+ · 65–66 D</p>
                <p className="mt-1">Weighted: AP·IB +1.0, Honors +0.5 ({t('F는 가산 없음', 'no bonus on an F')})</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* 수강 과목 */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="font-semibold text-gray-900">{t('수강 과목', 'Courses')}</h2>
        <span className="text-xs text-gray-400">{courses ? t(`${courses.length}개 · AP ${apCount}`, `${courses.length} · AP ${apCount}`) : ''}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{t('학년별로 적어두면 12학년에 성적표 확인·리거 점검이 쉬워요.', 'Listing courses by grade makes transcript and rigor checks easy in 12th grade.')}</p>

      {/* % → 레터 기준 (College Board 표준) — 성적 입력칸 옆에서 바로 참고 */}
      <div className="mt-2 overflow-x-auto rounded-lg bg-gray-100 px-3 py-2">
        <p className="text-[11px] font-medium text-gray-500">{t('점수 → 레터 기준 (College Board 표준)', 'Score → letter scale (College Board standard)')}</p>
        <p className="mt-1 whitespace-nowrap text-[11px] leading-relaxed text-gray-500">
          97+ <b className="text-gray-700">A+</b> · 93 <b className="text-gray-700">A</b> · 90 <b className="text-gray-700">A-</b> · 87 <b className="text-gray-700">B+</b> · 83 <b className="text-gray-700">B</b> · 80 <b className="text-gray-700">B-</b> · 77 <b className="text-gray-700">C+</b> · 73 <b className="text-gray-700">C</b> · 70 <b className="text-gray-700">C-</b> · 67 <b className="text-gray-700">D+</b> · 65 <b className="text-gray-700">D</b> · &lt;65 <b className="text-gray-700">F</b>
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[11px] text-gray-400">
          {t('환산점', 'Points')}: A+/A 4.0 · A- 3.7 · B+ 3.3 · B 3.0 · B- 2.7 · C+ 2.3 · C 2.0 · C- 1.7 · D+ 1.3 · D 1.0 · F 0
        </p>
      </div>

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
        return (
          <div key={g} className="mt-4">
            <p className="text-xs font-semibold text-gray-500">{t(`${g}학년`, `Grade ${g}`)}</p>
            {list.length === 0 && <p className="mt-1 text-[11px] text-gray-300">{t('아직 과목이 없어요', 'No courses yet')}</p>}
            <div className="mt-1.5 flex flex-col gap-1.5">
              {list.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 break-words text-gray-900">
                    {c.name}
                    {c.level !== 'regular' && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{courseLevelKo[c.level]}</span>}
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-1.5">
                    <input
                      value={gradeDrafts[c.id] ?? (c.letter_grade ?? (c.percent !== null ? String(c.percent) : ''))}
                      onChange={(e) => setGradeDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                      onBlur={(e) => { if ((gradeDrafts[c.id] ?? null) !== null) void saveGrade(c, e.target.value) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      placeholder={t('성적', 'Grade')}
                      aria-label={t(`${c.name} 성적`, `${c.name} grade`)}
                      className="w-14 rounded-md border-2 border-gray-200 px-1.5 py-1 text-center text-xs focus:border-blue-600 focus:outline-none"
                    />
                    {courseLetter(c) && c.percent !== null && (
                      <span className="text-[10px] text-gray-400">={courseLetter(c)}</span>
                    )}
                    <button onClick={() => removeCourse(c.id)} aria-label={t('삭제', 'Delete')} className="text-gray-300 active:text-red-500">✕</button>
                  </span>
                </div>
              ))}
            </div>
            <RecordsVault userId={userId} grade={g} />
          </div>
        )
      })}
    </AppShell>
  )
}

// ─── 성적표 보관함 — 학년별 성적표·증빙 사진/PDF 보관 (본인만 접근, 사진은 자동 압축) ───
const VAULT_MAX_PER_GRADE = 6
const VAULT_MAX_BYTES = 5 * 1024 * 1024

async function compressImage(file: File): Promise<Blob> {
  // 긴 변 1600px JPEG로 축소 — 무료 저장소(1GB) 보호. 실패 시 원본 사용
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 700 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

function RecordsVault({ userId, grade }: { userId: string; grade: number }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<{ name: string; size: number }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const prefix = `${userId}/${grade}`

  const load = async () => {
    if (!supabase) return
    const { data } = await supabase.storage.from('records').list(prefix, { limit: 30, sortBy: { column: 'created_at', order: 'desc' } })
    setFiles((data ?? []).filter((f) => f.name && !f.name.startsWith('.')).map((f) => ({ name: f.name, size: (f.metadata as { size?: number } | null)?.size ?? 0 })))
  }
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && files === null) void load()
  }

  const upload = async (file: File) => {
    if (!supabase || busy) return
    if ((files?.length ?? 0) >= VAULT_MAX_PER_GRADE) {
      alert(t(`학년당 ${VAULT_MAX_PER_GRADE}개까지 보관할 수 있어요. 안 쓰는 파일을 지우고 올려 주세요.`, `Up to ${VAULT_MAX_PER_GRADE} files per grade. Delete one you no longer need first.`))
      return
    }
    setBusy(true)
    try {
      const isImage = file.type.startsWith('image/')
      const blob = isImage ? await compressImage(file) : file
      if (blob.size > VAULT_MAX_BYTES) {
        alert(t('파일이 5MB를 넘어요 — PDF는 페이지를 줄이거나 사진으로 찍어 올려 주세요.', 'File is over 5MB — reduce the PDF or upload a photo instead.'))
        return
      }
      const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60)
      const path = `${prefix}/${Date.now()}-${isImage ? safe.replace(/\.[^.]+$/, '') + '.jpg' : safe}`
      const { error } = await supabase.storage.from('records').upload(path, blob, { contentType: isImage ? 'image/jpeg' : file.type })
      if (error) {
        alert(t(`업로드에 실패했어요. 네트워크를 확인해 주세요.\n(${error.message})`, `Upload failed. Check your connection.\n(${error.message})`))
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  const view = async (name: string) => {
    if (!supabase) return
    const { data } = await supabase.storage.from('records').createSignedUrl(`${prefix}/${name}`, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }
  const del = async (name: string) => {
    if (!supabase) return
    if (!confirm(t('이 파일을 삭제할까요? 되돌릴 수 없어요.', 'Delete this file? This cannot be undone.'))) return
    const { error } = await supabase.storage.from('records').remove([`${prefix}/${name}`])
    if (!error) setFiles((f) => (f ?? []).filter((x) => x.name !== name))
  }

  const displayName = (name: string) => name.replace(/^\d{10,}-/, '')

  return (
    <div className="mt-2">
      <button onClick={toggle} className="text-xs text-gray-400 underline">
        📎 {t('성적표·증빙 보관함', 'Report cards & documents')} {files ? `(${files.length})` : ''} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border-2 border-dashed border-gray-200 bg-white px-3 py-2.5">
          <p className="text-[11px] text-gray-400">
            {t('이 학년의 성적표·수상장을 사진이나 PDF로 보관해 두세요 — 12학년에 원서 쓸 때 바로 꺼내 봐요. 본인만 볼 수 있어요.', 'Keep this year’s report cards and certificates as photos or PDFs — ready when you apply senior year. Only you can see them.')}
          </p>
          {files === null ? (
            <p className="mt-2 text-xs text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
          ) : (
            <>
              {files.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {files.map((f) => (
                    <div key={f.name} className="flex items-center justify-between gap-2 text-xs">
                      <button onClick={() => void view(f.name)} className="min-w-0 truncate text-left text-blue-600 underline">
                        {f.name.endsWith('.pdf') ? '📄' : '🖼️'} {displayName(f.name)}
                      </button>
                      <span className="flex shrink-0 items-center gap-2 text-gray-400">
                        {f.size > 0 && <span>{(f.size / 1024 / 1024).toFixed(1)}MB</span>}
                        <button onClick={() => void del(f.name)} aria-label={t('삭제', 'Delete')} className="text-gray-300 active:text-red-500">✕</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <label className={`mt-2 block w-full cursor-pointer rounded-lg border-2 border-gray-200 px-3 py-2 text-center text-xs font-semibold ${busy ? 'text-gray-300' : 'text-gray-600 active:bg-gray-50'}`}>
                {busy ? t('올리는 중…', 'Uploading…') : t('＋ 사진·PDF 올리기', '＋ Upload photo / PDF')}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busy}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }}
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}
