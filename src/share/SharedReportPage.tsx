import { useEffect, useMemo, useState } from 'react'
import { Eye, BookOpen, ClipboardCheck, Trophy, Target, FileText, CircleCheck, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { t, getLang, localizeRows } from '../i18n'
import type { ChecklistItem, School } from '../lib/types'
import { filterChecklist, profileGrade, type ProfileRow } from '../lib/profile'
import { currentSeasonLabel, seasonLabelKo, currentSeason } from '../lib/academics'
import { majorLabel } from '../data/majors'
import { loadSchools } from '../lib/schoolsCache'
import { navigate, slugify } from '../lib/router'
import { activityCategoryKo, honorLevelKo, courseLevelKo, type Activity, type Course, type Honor, type TestScore } from '../app/appData'
import { computeGpa, courseLetter } from '../app/gpa'
import { roundLabels, statusLabels } from '../board/boardLogic'
import SchoolLogo from '../browse/SchoolLogo'

interface Shared {
  profile: Partial<ProfileRow> & { nickname: string | null }
  courses: Omit<Course, 'id' | 'credits'>[]
  tests: Omit<TestScore, 'id'>[]
  activities: Omit<Activity, 'id' | 'sort_order' | 'timing' | 'continue_in_college'>[]
  honors: Omit<Honor, 'id' | 'sort_order' | 'activity_id'>[]
  applications: { school_id: number; round: string | null; status: string; student_deadline: string | null }[]
  checks: { item_id: number; season_label: string; status: string }[]
}

const TEST_NAMES: Record<string, string> = { sat: 'SAT', act: 'ACT', toefl: 'TOEFL', ielts: 'IELTS', ap: 'AP' }

// 학생이 공유한 읽기 전용 리포트 (/s/:token) — 로그인 없이, 에세이·파일·추천인 정보 없음
export default function SharedReportPage({ token }: { token: string }) {
  const [data, setData] = useState<Shared | null | 'missing'>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [items, setItems] = useState<ChecklistItem[]>([])

  useEffect(() => {
    // 검색 노출 금지
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [])

  useEffect(() => {
    // 개발 전용: /s/demo 는 체험 학생 데이터로 화면 확인 (프로덕션 빌드에서 제거)
    if (import.meta.env.DEV && token === 'demo') {
      void Promise.all([import('../demo/demoData'), import('../demo/demoProfile')]).then(([dd, dp]) => {
        const st = dd.demoStore()
        setData({ profile: dp.demoProfile(), courses: st.courses, tests: st.tests, activities: st.activities, honors: st.honors, applications: st.applications, checks: [] } as unknown as Shared)
      })
    } else if (supabase) void supabase.rpc('get_shared_report', { p_token: token }).then(({ data: d, error }) => setData(error || !d ? 'missing' : (d as Shared)))
    if (!supabase) { setData('missing'); return }
    void loadSchools().then(setSchools)
    void supabase.from('checklist_items').select('*').then(({ data: d }) => setItems(localizeRows((d ?? []) as ChecklistItem[])))
  }, [token])

  const p = data && data !== 'missing' ? (data.profile as ProfileRow) : null
  const name = p?.nickname || t('학생', 'Student')
  useEffect(() => { document.title = t(`${name} 리포트 (읽기 전용) | 미국 대입 로드맵`, `${name}’s report (read-only) | US College Roadmap`) }, [name])

  const season = currentSeasonLabel()
  const checklist = useMemo(() => (p && items.length ? filterChecklist(items, p) : []), [p, items])
  const doneIds = useMemo(() => new Set(data && data !== 'missing' ? data.checks.filter((c) => c.season_label === season && c.status === 'done').map((c) => c.item_id) : []), [data, season])

  if (data === null) return <div className="min-h-dvh bg-gray-50" />
  if (data === 'missing' || !p) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="flex justify-center text-gray-400"><Eye size={40} strokeWidth={1.8} /></p>
        <h1 className="mt-4 text-lg font-bold text-gray-900">{t('볼 수 없는 링크예요', 'This link isn’t available')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('학생이 공유를 껐거나 주소가 잘못됐어요. 학생에게 새 링크를 받아 주세요.', 'The student turned sharing off or the address is wrong. Ask the student for a new link.')}</p>
        <button onClick={() => navigate('/')} className="mt-6 text-sm text-blue-600 underline">{t('미국 대입 로드맵 둘러보기', 'Visit US College Roadmap')}</button>
      </div>
    )
  }

  const byId = new Map(schools.map((s) => [s.id, s]))
  const grade = profileGrade(p)
  const courses = data.courses as Course[]
  const gpa = computeGpa(courses.map((c) => ({ ...c, credits: 1 })))
  const grades = [...new Set(courses.map((c) => c.grade))].sort((a, b) => a - b)
  const targets = (p.target_school_ids ?? []).map((id) => byId.get(id)).filter(Boolean) as School[]
  const schoolName = (s: School) => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name)
  const card = 'mt-4 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4'
  const h2 = 'flex items-center gap-1.5 text-[15px] font-bold text-gray-900'

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 md:max-w-2xl">
        <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
          <Eye size={12} />{t('읽기 전용 · 학생이 공유한 링크', 'Read-only · shared by the student')}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900">{name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {p.graduated ? t('졸업', 'Graduated') : t(`${grade}학년`, `Grade ${grade}`)}
          {p.grad_year ? ` · Class of ${p.grad_year}` : ''}
          {' · '}{p.applicant_status === 'domestic' ? t('미국 시민권·영주권', 'U.S. citizen / PR') : t('국제학생', 'International student')}
        </p>
        {(p.major_primary || p.major_secondary) && (
          <p className="mt-0.5 text-sm text-gray-600">{t('희망 전공: ', 'Intended major: ')}{[p.major_primary, p.major_secondary].filter(Boolean).map((m) => majorLabel(m as string)).join(' · ')}</p>
        )}

        {/* 이번 시즌 체크리스트 */}
        {checklist.length > 0 && (
          <section className={card}>
            <p className={h2}><ClipboardCheck size={17} className="text-blue-600" />{t('이번 시즌 체크리스트', 'This season’s checklist')}
              <span className="ml-auto text-sm font-semibold text-gray-500">{checklist.filter((i) => doneIds.has(i.id)).length}/{checklist.length}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">{t(`${grade}학년 ${seasonLabelKo[currentSeason()]}`, `Grade ${grade} · ${seasonLabelKo[currentSeason()]}`)}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {checklist.map((i) => (
                <li key={i.id} className="flex items-start gap-2 text-sm">
                  {doneIds.has(i.id) ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" />}
                  <span className={doneIds.has(i.id) ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-800'}>{i.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 목표·지원 학교 */}
        {(targets.length > 0 || data.applications.length > 0) && (
          <section className={card}>
            <p className={h2}><Target size={17} className="text-blue-600" />{t('목표·지원 학교', 'Target & application schools')}</p>
            <ul className="mt-2 divide-y divide-gray-100">
              {[...new Set([...data.applications.map((a) => a.school_id), ...targets.map((s) => s.id)])].map((id) => {
                const s = byId.get(id); const a = data.applications.find((x) => x.school_id === id)
                if (!s) return null
                return (
                  <li key={id} className="flex items-center gap-2 py-2">
                    <SchoolLogo schoolId={s.id} name={s.name} size={24} />
                    <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-900">{schoolName(s)}</button>
                    {a?.round && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{roundLabels[a.round as keyof typeof roundLabels] ?? a.round}</span>}
                    {a && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">{statusLabels[a.status as keyof typeof statusLabels] ?? a.status}</span>}
                    {a?.student_deadline && <span className="text-[11px] tabular-nums text-gray-500">{a.student_deadline.slice(5).replace('-', '/')}</span>}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* 과목·성적 */}
        {courses.length > 0 && (
          <section className={card}>
            <p className={h2}><BookOpen size={17} className="text-blue-600" />{t('과목·성적', 'Courses & grades')}
              {gpa && <span className="ml-auto text-xs font-semibold text-gray-600">GPA {gpa.unweighted.toFixed(2)} UW · {gpa.weighted.toFixed(2)} W</span>}
            </p>
            {grades.map((g) => (
              <div key={g} className="mt-2.5">
                <p className="text-xs font-semibold text-gray-500">{t(`${g}학년`, `Grade ${g}`)}</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {courses.filter((c) => c.grade === g).map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-gray-800">{c.name}</span>
                      {c.level !== 'regular' && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">{courseLevelKo[c.level]}</span>}
                      <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-gray-700">{courseLetter(c) ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {gpa && <p className="mt-2 text-[11px] text-gray-400">{t('GPA는 입력된 성적으로 계산한 참고치예요(학점 1 기준). 학교 공식 GPA와 다를 수 있어요.', 'GPA is an estimate from the grades entered (1 credit each) and may differ from the school’s official GPA.')}</p>}
          </section>
        )}

        {/* 시험 점수 */}
        {data.tests.length > 0 && (
          <section className={card}>
            <p className={h2}><FileText size={17} className="text-blue-600" />{t('시험 점수', 'Test scores')}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {data.tests.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-900">{TEST_NAMES[s.kind] ?? s.kind}{s.subject ? ` ${s.subject}` : ''}</span>
                  <span className="font-bold tabular-nums text-gray-900">{s.total ?? '—'}</span>
                  {s.section_scores && Object.keys(s.section_scores).length > 0 && (
                    <span className="text-[12px] text-gray-500">({Object.entries(s.section_scores).map(([k, v]) => `${k} ${v}`).join(' · ')})</span>
                  )}
                  {s.taken_on && <span className="ml-auto text-[12px] tabular-nums text-gray-400">{s.taken_on.slice(0, 7)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 활동·수상 */}
        {(data.activities.length > 0 || data.honors.length > 0) && (
          <section className={card}>
            <p className={h2}><Trophy size={17} className="text-blue-600" />{t('활동·수상', 'Activities & honors')}</p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {data.activities.map((a, i) => (
                <li key={i} className="text-sm">
                  <p className="font-semibold text-gray-900">{a.position || a.organization}{a.position && a.organization ? ` · ${a.organization}` : ''}</p>
                  <p className="text-[12px] text-gray-500">
                    {activityCategoryKo[a.category]}
                    {a.grades.length > 0 && ` · ${a.grades.join('·')}${t('학년', 'th grade')}`}
                    {a.hours_per_week ? t(` · 주 ${a.hours_per_week}시간`, ` · ${a.hours_per_week} hr/wk`) : ''}
                    {a.weeks_per_year ? t(` · 연 ${a.weeks_per_year}주`, ` · ${a.weeks_per_year} wk/yr`) : ''}
                  </p>
                  {a.description && <p className="mt-0.5 text-[13px] leading-relaxed text-gray-700">{a.description}</p>}
                </li>
              ))}
            </ul>
            {data.honors.length > 0 && (
              <>
                <p className="mt-3 text-xs font-semibold text-gray-500">{t('수상', 'Honors')}</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {data.honors.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 text-gray-800">{h.title}</span>
                      {h.level && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">{honorLevelKo[h.level]}</span>}
                      {h.grade && <span className="text-[12px] text-gray-400">{t(`${h.grade}학년`, `Gr ${h.grade}`)}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {courses.length === 0 && data.tests.length === 0 && data.activities.length === 0 && data.applications.length === 0 && targets.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-500">{t('아직 입력된 기록이 없어요.', 'No records entered yet.')}</p>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-gray-400">
          {t('학생이 앱에 입력한 기록을 그대로 보여줘요. 에세이·올린 파일·추천인 정보는 공유되지 않아요.', 'Shows the records the student entered in the app. Essays, uploaded files and recommender details are not shared.')}
          <br />
          <button onClick={() => navigate('/about')} className="mt-1 text-blue-600 underline">{t('미국 대입 로드맵이란?', 'What is US College Roadmap?')}</button>
        </p>
      </div>
    </div>
  )
}
