import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { goBack, navigate } from '../lib/router'
import { COURSE_GUIDE_VERIFIED, SUBJECTS, gradeGuide, subjectLabel, majorCores, rigorSources, type Subject } from '../data/courseGuide'
import { profileGrade, type ProfileRow } from '../lib/profile'
import { Pin, BookOpen, GraduationCap } from 'lucide-react'
import VerifiedBadge from '../ui/VerifiedBadge'

const GRADES = [9, 10, 11, 12] as const
const TIERS = [
  { ko: '일반', en: 'Standard' },
  { ko: '심화', en: 'Advanced' },
  { ko: '최상위', en: 'Most rigorous' },
]

// 온보딩 수학 과목(profiles.math_course) → 현재 학년 행에서 해당하는 칸 (없으면 -1)
function mathTierNow(grade: number, mathCourse: string | null): number {
  if (!mathCourse || grade < 9 || grade > 12) return -1
  const row = gradeGuide.math[grade as 9 | 10 | 11 | 12]
  const key: Record<string, RegExp> = {
    algebra2_or_below: /algebra|geometry/i,
    precalc: /precalc/i,
    calc: /calc (ab|bc)|calc ab/i,
    post_calc: /beyond|이후/i,
  }
  const re = key[mathCourse]
  if (!re) return -1
  // 같은 행에 여러 칸이 맞으면 가장 높은 칸
  let hit = -1
  row.forEach((cell, i) => { if (re.test(cell)) hit = i })
  return hit
}

// 수업 난이도 가이드 — 학년×과목×3단계 표 + 공식 근거 (편집 가이드 라벨)
export default function CourseGuidePage({ profile }: { profile: ProfileRow | null }) {
  const [subject, setSubject] = useState<Subject>('math')
  const grade = profile ? profileGrade(profile) : 0
  const hereTier = subject === 'math' && profile ? mathTierNow(grade, profile.math_course) : -1

  useEffect(() => {
    document.title = t('미국 대학 입시 수업 난이도(rigor) 가이드 — 학년별 추천 과목 | 미국 대입 로드맵', 'Course rigor guide — recommended courses by grade | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('수업 난이도(Rigor) 가이드', 'Course rigor guide')}</h1>
        </div>
        <VerifiedBadge className="mt-3" date={COURSE_GUIDE_VERIFIED} sources={t('대학 입학처 공식 권장', 'College admissions guidance')} />

        {/* 핵심 원칙: 학교 대비 평가 */}
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3.5">
          <p className="text-sm font-semibold text-gray-900">{t('대학은 "우리 학교 안에서" 얼마나 도전했는지를 봐요', 'Colleges judge rigor relative to what your school offers')}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-700">
            {t(
              'Common App 추천서에서 카운슬러는 "우리 학교의 다른 대입 준비 학생과 비교해" 과목 선택을 5단계로 평가해요. 학교에 없는 과목을 못 들은 건 불리하지 않아요 — 개설된 과목 안에서 해마다 한 단계씩 올라가는 흐름이 중요해요.',
              'On the Common App School Report, counselors rate your course selection "in comparison with other college preparatory students at your school" on five levels. Not taking a course your school doesn’t offer is not held against you — what matters is stepping up year by year within what is available.',
            )}
          </p>
        </div>

        {/* 과목 탭 */}
        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${subject === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
            >
              {t(subjectLabel[s].ko, subjectLabel[s].en)}
            </button>
          ))}
        </div>

        {/* 학년 × 3단계 표 */}
        <div className="mt-3 overflow-x-auto rounded-xl border-2 border-gray-200 bg-white">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="px-2 py-2.5 font-medium sm:px-3">{t('학년', 'Grade')}</th>
                {TIERS.map((tier, i) => (
                  <th key={i} className="px-2 py-2.5 font-medium sm:px-3">{t(tier.ko, tier.en)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRADES.map((g) => (
                <tr key={g} className={`border-b border-gray-50 last:border-0 ${g === grade ? 'bg-amber-50/60' : ''}`}>
                  <td className="whitespace-nowrap px-2 py-2.5 text-xs font-semibold text-gray-700 sm:px-3">
                    {t(`${g}학년`, `Grade ${g}`)}{g === grade && <span className="ml-1 text-amber-600">●</span>}
                  </td>
                  {gradeGuide[subject][g].map((cell, i) => {
                    const here = g === grade && i === hereTier
                    return (
                      <td key={i} className={`px-2 py-2.5 leading-snug text-gray-800 sm:px-3 ${here ? 'font-semibold' : ''}`}>
                        {cell}
                        {here && <span className="ml-1.5 whitespace-nowrap rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">{t('지금 여기', 'You are here')}</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
          <Pin size={12} strokeWidth={2} className="mr-1 inline -mt-0.5" />{t('편집 가이드예요 — 학교마다 개설 과목과 순서가 달라요. 우리 학교 과목 안에서 비슷한 단계를 찾아보세요.', 'Editorial guide — course offerings and sequences vary by school. Find the matching step within your school’s courses.')}
          {subject === 'language' && ' ' + t('외국어 AP는 보통 4년째 배우는 학생이 들어요 (College Board).', 'World-language APs are typically taken in the 4th year of study (College Board).')}
        </p>

        <button onClick={() => navigate('/guide/ap')} className="mt-4 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-800 active:bg-blue-100">
          <BookOpen size={16} strokeWidth={2} className="mr-1.5 inline -mt-0.5" />{t('AP 과목 가이드 — 새 AP·정책 변화·과목별 점수 분포 →', 'AP course guide — new APs, policy changes, score distributions →')}
        </button>

        {/* IB 학교 */}
        <div className="mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><GraduationCap size={16} strokeWidth={2} className="text-blue-600" />{t('IB 학교라면 (11–12학년)', 'If your school runs IB (grades 11–12)')}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {t(
              'IB 디플로마는 6과목 중 3~4과목을 HL(심화), 나머지를 SL로 들어요. 수학은 AI SL → AA SL → AA HL 순으로 깊어지고, AA(Analysis & Approaches)가 미적분 중심이라 공대·수학 지망에 맞아요.',
              'The IB Diploma has 3–4 of 6 subjects at HL, the rest at SL. Math deepens from AI SL → AA SL → AA HL; AA (Analysis & Approaches) is calculus-focused and suits engineering and math.',
            )}
          </p>
        </div>

        {/* 전공별 핵심 과목 */}
        <h2 className="mt-6 font-semibold text-gray-900">{t('전공별 핵심 과목 (입학처 공식 권장)', 'Key courses by major (official admissions guidance)')}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {majorCores.map((m) => (
            <div key={m.en} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{t(m.ko, m.en)}</p>
              <p className="mt-0.5 text-sm text-gray-700">{m.needs.map((n) => n.label).join(' · ')}</p>
              <a href={m.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 underline">{t(`근거: ${m.source} ↗`, `Source: ${m.source} ↗`)}</a>
            </div>
          ))}
        </div>

        {/* 공식 근거 */}
        <h2 className="mt-6 font-semibold text-gray-900">{t('공식 근거', 'Official sources')}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {rigorSources.map((r) => (
            <div key={r.who} className="rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200">
              <p className="text-xs font-semibold text-gray-500">{r.who}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-800">{t(r.ko, r.en)}</p>
              <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 underline">{t('출처 보기 ↗', 'View source ↗')}</a>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(profile ? '/app/education' : '/')}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700"
        >
          {profile ? t('내 과목 넣고 다음 학년 추천 받기 →', 'Add my courses & get next-year suggestions →') : t('가입하고 내 과목 기준 추천 받기', 'Sign up for suggestions based on your courses')}
        </button>
      </div>
    </div>
  )
}
