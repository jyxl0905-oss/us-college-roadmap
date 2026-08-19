import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ProfileRow } from '../lib/profile'
import { t } from '../i18n'
import schoolsData from '../data/schools.index.json'
import type { School } from '../lib/types'

// 졸업 후 결과 설문 — 12학년 봄(결과 발표 후)·졸업 모드에서 리포트 상단에 1회. 제출하면 다시 안 뜸.
// 개인 식별 없이 집계에만 사용(운영 통계). 연구 활용은 별도 동의 체크.

const schools = schoolsData as School[]

type Admitted = 'first_choice' | 'target' | 'other' | 'waiting' | 'no'
const ADMITTED: { value: Admitted; ko: string; en: string }[] = [
  { value: 'first_choice', ko: '1지망 학교에 합격했어요', en: 'Admitted to my first choice' },
  { value: 'target', ko: '목표 학교 중 한 곳에 합격했어요', en: 'Admitted to one of my target schools' },
  { value: 'other', ko: '목표 밖 학교에 합격했어요', en: 'Admitted somewhere outside my target list' },
  { value: 'waiting', ko: '아직 결과를 기다리고 있어요', en: 'Still waiting for results' },
  { value: 'no', ko: '아직 합격한 곳이 없어요', en: 'No admits yet' },
]
const FEATURES: { value: string; ko: string; en: string }[] = [
  { value: 'checklist', ko: '시즌 체크리스트', en: 'Season checklist' },
  { value: 'axes', ko: '6축 밸런스·처방', en: '6-axis balance & prescriptions' },
  { value: 'schools', ko: '학교 카드·둘러보기·비교', en: 'School cards / browse / compare' },
  { value: 'app', ko: '내 원서 (활동·시험·에세이 기록)', en: 'My application (records)' },
  { value: 'board', ko: '지원 학교·라운드 보드', en: 'College list & rounds' },
  { value: 'major', ko: '전공 가이드 맵', en: 'Major guide map' },
  { value: 'deadlines', ko: '마감 캘린더·알림', en: 'Deadline calendar & reminders' },
  { value: 'guide', ko: '입시 기본기·용어집', en: 'Basics & glossary' },
]

export const surveyDismissKey = (userId: string) => `survey_dismissed_${userId}_${new Date().getFullYear()}`

export default function OutcomeSurvey({ userId, profile, onDone }: { userId: string; profile: ProfileRow; onDone?: () => void }) {
  const [state, setState] = useState<'loading' | 'form' | 'done' | 'hidden'>('loading')
  const [helpful, setHelpful] = useState<number | null>(null)
  const [admitted, setAdmitted] = useState<Admitted | null>(null)
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [researchOk, setResearchOk] = useState(profile.research_consent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    if (localStorage.getItem(surveyDismissKey(userId)) === '1') { setState('hidden'); return }
    supabase.from('outcome_surveys').select('user_id').eq('user_id', userId).maybeSingle().then(({ data }) => {
      setState(data ? 'hidden' : 'form')
    })
  }, [userId])

  if (state === 'loading' || state === 'hidden') return null
  if (state === 'done')
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
        {t('고마워요! 답변은 익명 통계로만 쓰여요. 4년 동안 수고 많았어요 🎓', 'Thank you! Your answers are used only as anonymous statistics. Well done on four years 🎓')}
      </div>
    )

  const suggestions = schoolQuery.trim().length >= 2 && !schoolId
    ? schools.filter((s) => s.name.toLowerCase().includes(schoolQuery.trim().toLowerCase()) || s.name_ko.includes(schoolQuery.trim())).slice(0, 5)
    : []

  const submit = async () => {
    if (!supabase || helpful === null || admitted === null || saving) return
    setSaving(true); setError(null)
    const { error } = await supabase.from('outcome_surveys').upsert({
      user_id: userId,
      helpful,
      admitted,
      enrolled_school_id: schoolId,
      enrolled_school_name: schoolId ? null : (schoolQuery.trim() || null),
      best_features: features.length ? features : null,
      comment: comment.trim() || null,
      research_ok: researchOk,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    setState('done')
    onDone?.()
  }

  const dismiss = () => {
    localStorage.setItem(surveyDismissKey(userId), '1')
    setState('hidden')
  }

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{t('🎓 결과가 나왔나요? 1분 설문', '🎓 Got your results? A 1-minute survey')}</p>
          <p className="mt-0.5 text-xs text-gray-500">{t('다음 학생들을 위해 익명으로만 집계돼요.', 'Collected anonymously to help the students after you.')}</p>
        </div>
        {!profile.graduated && (
          <button onClick={dismiss} className="shrink-0 text-xs text-gray-400 underline">{t('올해는 안 볼게요', 'Not this year')}</button>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-gray-800">{t('1. 이 툴이 입시 준비에 도움이 됐나요?', '1. Did this tool help you prepare?')}</p>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setHelpful(n)} className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold ${helpful === n ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{n}</button>
        ))}
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-gray-400"><span>{t('전혀', 'Not at all')}</span><span>{t('매우', 'A lot')}</span></p>

      <p className="mt-4 text-sm font-medium text-gray-800">{t('2. 원하는 학교에 합격했나요?', '2. Did you get into a school you wanted?')}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {ADMITTED.map((o) => (
          <button key={o.value} onClick={() => setAdmitted(o.value)} className={`rounded-xl border-2 px-3 py-2 text-left text-sm ${admitted === o.value ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700'}`}>{t(o.ko, o.en)}</button>
        ))}
      </div>

      {(admitted === 'first_choice' || admitted === 'target' || admitted === 'other') && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-800">{t('3. 진학할 학교 (선택)', '3. School you’ll attend (optional)')}</p>
          <input
            value={schoolQuery}
            onChange={(e) => { setSchoolQuery(e.target.value); setSchoolId(null) }}
            placeholder={t('학교 이름', 'School name')}
            className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          {suggestions.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-xl border border-gray-200">
              {suggestions.map((s) => (
                <button key={s.id} onClick={() => { setSchoolId(s.id); setSchoolQuery(s.name) }} className="block w-full px-3 py-2 text-left text-sm text-gray-700 active:bg-gray-50">{s.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-sm font-medium text-gray-800">{t('4. 가장 도움 된 기능 (복수 선택)', '4. Most helpful features (pick any)')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FEATURES.map((f) => {
          const on = features.includes(f.value)
          return (
            <button key={f.value} onClick={() => setFeatures((prev) => (on ? prev.filter((v) => v !== f.value) : [...prev, f.value]))} className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{t(f.ko, f.en)}</button>
          )
        })}
      </div>

      <p className="mt-4 text-sm font-medium text-gray-800">{t('5. 한마디 (선택)', '5. Anything else (optional)')}</p>
      <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} rows={2} placeholder={t('아쉬웠던 점, 바라는 점…', 'What was missing, what you wish it had…')} className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />

      <label className="mt-3 flex items-start gap-2 text-xs text-gray-500">
        <input type="checkbox" checked={researchOk} onChange={(e) => setResearchOk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
        <span>{t('(선택) 이 답변을 익명화된 연구 데이터로 활용하는 데 동의해요', '(Optional) I agree to the use of these answers as anonymized research data')}</span>
      </label>

      {error && <p className="mt-2 text-xs text-red-600">{t('저장 실패', 'Save failed')}: {error}</p>}
      <button
        onClick={submit}
        disabled={helpful === null || admitted === null || saving}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {saving ? t('보내는 중…', 'Sending…') : t('보내기', 'Submit')}
      </button>
    </div>
  )
}
