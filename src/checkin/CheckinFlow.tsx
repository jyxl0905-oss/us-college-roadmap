import { useEffect, useState } from 'react'
import type { ChecklistItem, ClarityItem, Tier } from '../lib/types'
import { supabase } from '../lib/supabase'
import { filterChecklist, saveProfile, type ProfileRow } from '../lib/profile'
import { gradeFromGradYear, currentSeasonLabel, seasonLabelKo, currentSeason } from '../lib/academics'
import { majorsByTrack, majorDisplay } from '../data/majors'
import ChoiceStep from '../onboarding/ChoiceStep'
import TargetSchoolsStep from '../onboarding/TargetSchoolsStep'
import { axisShort, type Plan } from '../app/plans'
import { t, localizeRows } from '../i18n'

// 시즌 라벨('2026-spring')의 학년 계산용 대표 날짜
function seasonDate(label: string): Date {
  const [year, season] = label.split('-')
  const month = season === 'spring' ? 2 : season === 'summer' ? 5 : 9
  return new Date(Number(year), month, 1)
}

const seasonKoFromLabel = (label: string) => {
  const s = label.split('-')[1] as 'fall' | 'spring' | 'summer'
  return seasonLabelKo[s]
}

interface CheckinFlowProps {
  userId: string
  profile: ProfileRow
  prevSeasonLabel: string
  onDone: (updated: ProfileRow) => void
}

type Screen = 'carryover' | 'plans' | 'changes' | 'targets' | 'clarity'
type ChangeForm = 'scores' | 'activities' | 'gpa' | null

const CLARITY_EMOJIS = ['😟', '😕', '😐', '🙂', '😄'] // 1~5점

// 시즌 체크인 — ① 지난 시즌 미완료 이월/건너뛰기 ② 변경사항 ③ 전공·목표 확인
export default function CheckinFlow({ userId, profile, prevSeasonLabel, onDone }: CheckinFlowProps) {
  const [screen, setScreen] = useState<Screen>('carryover')
  const [incomplete, setIncomplete] = useState<ChecklistItem[]>([])
  const [openPlans, setOpenPlans] = useState<Plan[]>([]) // 지난 시즌 미완료 계획 (F6)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<ProfileRow>(profile)
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const [changeForm, setChangeForm] = useState<ChangeForm>(null)
  const [formStep, setFormStep] = useState(0)
  const [editTargets, setEditTargets] = useState(false)
  const [saving, setSaving] = useState(false)
  // R1-B: 진로 명확성 단축 척도 — 새 리포트 발급 직전
  const [clarityItems, setClarityItems] = useState<ClarityItem[]>([])
  const [clarityScores, setClarityScores] = useState<Record<number, number>>({})
  const [finalDraft, setFinalDraft] = useState<ProfileRow | null>(null)

  const currentLabel = currentSeasonLabel()

  // 지난 시즌 미완료 항목 로드
  useEffect(() => {
    if (!supabase) return
    const prevGrade = profile.grad_year
      ? Math.min(12, Math.max(9, gradeFromGradYear(profile.grad_year, seasonDate(prevSeasonLabel))))
      : 9
    const prevSeason = prevSeasonLabel.split('-')[1]
    Promise.all([
      supabase.from('checklist_items').select('*'),
      supabase.from('user_checks').select('item_id').eq('user_id', userId).eq('season_label', prevSeasonLabel),
      supabase.from('user_checks').select('item_id').eq('user_id', userId).eq('season_label', currentLabel).eq('status', 'carried'),
      supabase.from('clarity_items').select('*').order('sort_order'),
      supabase.from('plans').select('id,title,axis,season_label,status,notes').eq('user_id', userId).eq('season_label', prevSeasonLabel).neq('status', 'done'),
    ]).then(([itemsRes, prevChecks, carriedChecks, clarityRes, plansRes]) => {
      if (clarityRes.data) setClarityItems(localizeRows(clarityRes.data as ClarityItem[]))
      const openP = (plansRes.data ?? []) as Plan[]
      setOpenPlans(openP)
      const decided = new Set([
        ...(prevChecks.data ?? []).map((c) => c.item_id),
        ...(carriedChecks.data ?? []).map((c) => c.item_id),
      ])
      const prevItems = filterChecklist(localizeRows((itemsRes.data ?? []) as ChecklistItem[]), profile, {
        grade: prevGrade,
        season: prevSeason,
      })
      const pending = prevItems.filter((i) => !decided.has(i.id))
      setIncomplete(pending)
      setLoading(false)
      if (pending.length === 0) setScreen(openP.length > 0 ? 'plans' : 'changes')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (item: ChecklistItem, carry: boolean) => {
    if (!supabase) return
    setIncomplete((prev) => {
      const next = prev.filter((i) => i.id !== item.id)
      if (next.length === 0) setScreen(openPlans.length > 0 ? 'plans' : 'changes')
      return next
    })
    await supabase.from('user_checks').upsert(
      carry
        ? { user_id: userId, item_id: item.id, season_label: currentLabel, status: 'carried' }
        : { user_id: userId, item_id: item.id, season_label: prevSeasonLabel, status: 'skipped' },
    )
  }

  const patch = (fields: Partial<ProfileRow>) => setDraft((d) => ({ ...d, ...fields }))

  const saveAndDone = async (d: ProfileRow) => {
    setSaving(true)
    await saveProfile(userId, d)
    onDone(d)
  }

  // ③ 목표 확인 완료 → 명확성 척도(R1-B)를 거쳐 새 리포트 발급
  const finish = (d: ProfileRow) => {
    if (clarityItems.length === 0) {
      void saveAndDone(d)
      return
    }
    setFinalDraft(d)
    setScreen('clarity')
  }

  const submitClarity = async () => {
    const d = finalDraft ?? draft
    if (supabase && clarityItems.length > 0) {
      // 전원에게 표시하되 연구 동의 여부를 플래그로 분리 저장
      await supabase.from('clarity_responses').insert(
        clarityItems.map((item) => ({
          user_id: userId,
          item_id: item.id,
          season_label: currentLabel,
          score: clarityScores[item.id],
          research_ok: profile.research_consent ?? false,
        })),
      )
    }
    await saveAndDone(d)
  }

  const wrap = (content: React.ReactNode) => (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-8">{content}</div>
    </div>
  )

  if (loading || saving)
    return wrap(<p className="mt-20 text-center text-gray-400">{saving ? t('저장 중…', 'Saving…') : t('불러오는 중…', 'Loading…')}</p>)

  // ① 지난 시즌 미완료 항목
  if (screen === 'carryover') {
    return wrap(
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('오랜만이에요! 👋', 'Welcome back! 👋')}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t(
            `지난 ${seasonKoFromLabel(prevSeasonLabel)} 시즌에 완료하지 못한 항목이 있어요. 이번 시즌으로 가져갈까요?`,
            `You have items left unfinished from last ${seasonKoFromLabel(prevSeasonLabel)}. Carry them into this season?`,
          )}
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {incomplete.map((item) => (
            <div key={item.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
              <p className="font-medium text-gray-900">{item.title}</p>
              {item.why_how && <p className="mt-0.5 text-sm text-gray-500">{item.why_how}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => decide(item, true)}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white active:bg-blue-700"
                >
                  {t('이번 시즌으로 이월', 'Carry over')}
                </button>
                <button
                  onClick={() => decide(item, false)}
                  className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 active:bg-gray-50"
                >
                  {t('건너뛰기', 'Skip')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>,
    )
  }

  // ①-b 지난 시즌 계획 정리 (F6) — 완료 / 이번 시즌으로 / 삭제
  const decidePlan = async (p: Plan, action: 'done' | 'carry' | 'delete') => {
    if (!supabase) return
    setOpenPlans((prev) => {
      const next = prev.filter((x) => x.id !== p.id)
      if (next.length === 0) setScreen('changes')
      return next
    })
    if (action === 'delete') await supabase.from('plans').delete().eq('id', p.id)
    else if (action === 'done') await supabase.from('plans').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', p.id)
    else await supabase.from('plans').update({ season_label: currentLabel, updated_at: new Date().toISOString() }).eq('id', p.id)
  }
  if (screen === 'plans') {
    return wrap(
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('지난 시즌 계획은 어떻게 됐어요?', 'How did last season’s plans go?')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('완료한 건 6축 실선에 반영돼요.', 'Completed plans count toward your 6-axis score.')}</p>
        <div className="mt-5 flex flex-col gap-3">
          {openPlans.map((p) => (
            <div key={p.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
              <p className="font-medium text-gray-900">{p.title}</p>
              <p className="text-xs text-gray-400">{axisShort[p.axis]}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => decidePlan(p, 'done')} className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white active:bg-green-700">{t('완료했어요', 'Done')}</button>
                <button onClick={() => decidePlan(p, 'carry')} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white active:bg-blue-700">{t('이번 시즌으로', 'Move to this season')}</button>
                <button onClick={() => decidePlan(p, 'delete')} className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 active:bg-gray-50">{t('삭제', 'Delete')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>,
    )
  }

  // ② 변경사항
  if (screen === 'changes') {
    if (changeForm === 'gpa') {
      return wrap(
        <ChoiceStep
          title={t('바뀐 GPA 밴드를 골라주세요', 'Pick your new GPA band')}
          options={[
            { value: '3.9+', label: t('3.9 이상', '3.9 or higher') },
            { value: '3.7-3.9', label: '3.7 ~ 3.9' },
            { value: '3.5-3.7', label: '3.5 ~ 3.7' },
            { value: 'below3.5', label: t('3.5 미만', 'Below 3.5') },
            { value: 'none', label: t('GPA가 없는 학교예요', 'My school doesn’t give GPAs') },
          ]}
          selected={draft.gpa_band}
          onSelect={(v) => {
            patch({ gpa_band: v })
            setChanged((c) => new Set(c).add('gpa'))
            setChangeForm(null)
          }}
        />,
      )
    }
    if (changeForm === 'scores') {
      if (formStep === 0)
        return wrap(
          <ChoiceStep
            title={t('SAT는 지금 어떤 상태인가요?', 'Where are you with the SAT?')}
            options={[
              { value: 'none', label: t('아직 계획 없어요', 'No plans yet') },
              { value: 'studying', label: t('공부 중이에요', 'Studying') },
              { value: 'taken', label: t('응시했어요', 'Taken it') },
            ]}
            selected={draft.sat_status}
            onSelect={(v) => {
              patch({ sat_status: v, ...(v !== 'taken' ? { sat_band: null } : {}) })
              if (v === 'taken') setFormStep(1)
              else if (draft.applicant_status !== 'domestic') setFormStep(2)
              else {
                setChanged((c) => new Set(c).add('scores'))
                setChangeForm(null)
              }
            }}
          />,
        )
      if (formStep === 1)
        return wrap(
          <ChoiceStep
            title={t('SAT 점수대를 골라주세요', 'Pick your SAT score range')}
            options={[
              { value: '1500+', label: t('1500 이상', '1500 or higher') },
              { value: '1400-1490', label: '1400 ~ 1490' },
              { value: '1300-1390', label: '1300 ~ 1390' },
              { value: 'below1300', label: t('1300 미만', 'Below 1300') },
            ]}
            selected={draft.sat_band}
            onSelect={(v) => {
              patch({ sat_band: v })
              if (draft.applicant_status !== 'domestic') setFormStep(2)
              else {
                setChanged((c) => new Set(c).add('scores'))
                setChangeForm(null)
              }
            }}
          />,
        )
      return wrap(
        <ChoiceStep
          title={t('TOEFL/IELTS는 어떤 상태인가요?', 'Where are you with TOEFL/IELTS?')}
          options={[
            { value: 'none', label: t('아직 안 봤어요', 'Not taken yet') },
            { value: 'studying', label: t('공부 중이에요', 'Studying') },
            { value: 'scored', label: t('점수가 있어요', 'I have a score') },
            { value: 'exempt', label: t('면제 대상일 수 있어요', 'I may be exempt'), description: t('학교별 면제 기준 확인 필요', 'Check each school’s waiver policy') },
          ]}
          selected={draft.toefl_status}
          onSelect={(v) => {
            patch({ toefl_status: v })
            setChanged((c) => new Set(c).add('scores'))
            setChangeForm(null)
          }}
        />,
      )
    }
    if (changeForm === 'activities') {
      const steps = [
        {
          title: t('나를 대표하는 활동이 있나요?', 'Do you have a signature activity?'),
          field: 'activity_spike' as const,
          options: [
            { value: 1, label: t('아직 없어요', 'Not yet') },
            { value: 2, label: t('꾸준히 하는 활동은 있어요', 'I have activities I do consistently') },
            { value: 3, label: t('성과·결과물이 있는 대표 활동이 있어요', 'I have a signature activity with results') },
          ],
        },
        {
          title: t('리더 역할을 해본 적 있나요?', 'Have you held a leadership role?'),
          field: 'activity_leadership' as const,
          options: [
            { value: 1, label: t('아직 없어요', 'Not yet') },
            { value: 2, label: t('팀·동아리에서 맡은 역할이 있어요', 'I have a role in a team or club') },
            { value: 3, label: t('회장·창립 등 주도한 경험이 있어요', 'I have led something (president, founder, etc.)') },
          ],
        },
        {
          title: t('학교 밖에서 인정받은 적 있나요?', 'Any recognition outside school?'),
          field: 'activity_validation' as const,
          options: [
            { value: 1, label: t('아직 없어요', 'Not yet') },
            { value: 2, label: t('지역·소규모 대회 수상이 있어요', 'Regional or small competition awards') },
            { value: 3, label: t('전국·국제 수준 수상이 있어요', 'National or international awards') },
          ],
        },
      ]
      const s = steps[formStep] ?? steps[0]
      return wrap(
        <ChoiceStep
          title={s.title}
          subtitle={`${t('활동 업데이트', 'Activity update')} ${formStep + 1}/3`}
          options={s.options}
          selected={draft[s.field]}
          onSelect={(v) => {
            patch({ [s.field]: v })
            if (formStep < 2) setFormStep(formStep + 1)
            else {
              setChanged((c) => new Set(c).add('activities'))
              setChangeForm(null)
            }
          }}
        />,
      )
    }

    const mark = (key: string) => (changed.has(key) ? ' ✓' : '')
    return wrap(
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('그동안 달라진 게 있나요?', 'Anything changed since last time?')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('해당하는 것을 눌러 업데이트해 주세요.', 'Tap whatever applies to update it.')}</p>
        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={() => {
              setChangeForm('scores')
              setFormStep(0)
            }}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50"
          >
            {t('새 시험 점수가 있어요 (SAT/TOEFL)', 'New test scores (SAT/TOEFL)')}{mark('scores')}
          </button>
          <button
            onClick={() => {
              setChangeForm('activities')
              setFormStep(0)
            }}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50"
          >
            {t('새 수상·활동이 생겼어요', 'New awards or activities')}{mark('activities')}
          </button>
          <button
            onClick={() => setChangeForm('gpa')}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50"
          >
            {t('GPA가 바뀌었어요', 'My GPA changed')}{mark('gpa')}
          </button>
        </div>
        <button
          onClick={() => setScreen('targets')}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          {changed.size > 0 ? t('업데이트 끝, 다음', 'Done updating, next') : t('변동 없어요, 다음', 'Nothing changed, next')}
        </button>
      </div>,
    )
  }

  // R1-B: 진로 명확성 단축 척도 (새 리포트 발급 직전, 10초)
  if (screen === 'clarity') {
    const allAnswered = clarityItems.every((item) => clarityScores[item.id] !== undefined)
    return wrap(
      <div>
        <p className="text-xs text-gray-400">{t('10초면 끝 — 연구 동의자의 응답만 익명 통계로 사용', 'Takes 10 seconds — only research-consenting responses are used, anonymously')}</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">{t('요즘 진로에 대한 느낌은 어때요?', 'How are you feeling about your path these days?')}</h1>
        <div className="mt-5 flex flex-col gap-4">
          {clarityItems.map((item) => (
            <div key={item.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
              <p className="text-sm font-medium text-gray-900">{item.question}</p>
              <div className="mt-3 flex justify-between">
                {CLARITY_EMOJIS.map((emoji, i) => {
                  const score = i + 1
                  const on = clarityScores[item.id] === score
                  return (
                    <button
                      key={score}
                      onClick={() => setClarityScores((prev) => ({ ...prev, [item.id]: score }))}
                      aria-label={t(`${score}점`, `${score} of 5`)}
                      className={`h-12 w-12 rounded-full text-2xl transition-transform ${
                        on ? 'scale-110 bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={submitClarity}
          disabled={!allAnswered}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {t('완료 — 새 리포트 받기', 'Done — get my new report')}
        </button>
      </div>,
    )
  }

  // ③ 전공·목표 학교 유지 여부
  if (editTargets) {
    if (formStep === 0)
      return wrap(
        <ChoiceStep
          title={t('희망 전공 1순위를 골라주세요', 'Pick your first-choice major')}
          options={[
            ...majorsByTrack('stem').map((m) => ({ value: m.value, label: majorDisplay(m) })),
            ...majorsByTrack('liberal').map((m) => ({ value: m.value, label: majorDisplay(m) })),
            { value: 'undecided', label: t('미정 (Undecided)', 'Undecided') },
          ]}
          selected={draft.major_primary}
          onSelect={(v) => {
            patch({ major_primary: v, major_secondary: null })
            setFormStep(1)
          }}
        />,
      )
    if (formStep === 1)
      return wrap(
        <ChoiceStep
          title={t('목표 학교는 어떻게 할까요?', 'How do you want to set target schools?')}
          options={[
            { value: 'schools', label: t('구체적인 학교를 고를래요', 'Pick specific schools') },
            { value: 'tier', label: t('순위대만 정할래요', 'Just a ranking tier') },
            { value: 'undecided', label: t('아직 미정이에요', 'Undecided for now') },
          ]}
          selected={draft.target_mode}
          onSelect={(v) => {
            patch({ target_mode: v, target_school_ids: [], target_tier: null })
            if (v === 'schools') setFormStep(2)
            else if (v === 'tier') setFormStep(3)
            else finish({ ...draft, target_mode: v, target_school_ids: [], target_tier: null })
          }}
        />,
      )
    if (formStep === 2)
      return wrap(
        <TargetSchoolsStep
          selectedIds={draft.target_school_ids}
          onChange={(ids) => patch({ target_school_ids: ids })}
          onNext={() => finish(draft)}
        />,
      )
    return wrap(
      <ChoiceStep
        title={t('목표 순위대를 골라주세요', 'Pick your target tier')}
        options={[
          { value: 1, label: 'Top 20' },
          { value: 2, label: t('21-40위', 'Ranked 21-40') },
          { value: 3, label: t('41-60위', 'Ranked 41-60') },
        ]}
        selected={draft.target_tier}
        onSelect={(v) => finish({ ...draft, target_tier: v as Tier })}
      />,
    )
  }

  return wrap(
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('전공과 목표 학교는 그대로인가요?', 'Same major and target schools?')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {t(`확인하면 ${seasonLabelKo[currentSeason()]} 시즌 새 리포트를 만들어 드려요.`, `Confirm and we’ll build your new ${seasonLabelKo[currentSeason()]} report.`)}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={() => finish(draft)}
          className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          {t('네, 그대로예요 — 새 리포트 받기', 'Yes, same — get my new report')}
        </button>
        <button
          onClick={() => {
            setEditTargets(true)
            setFormStep(0)
          }}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
        >
          {t('바꾸고 싶어요', 'I want to change them')}
        </button>
      </div>
    </div>,
  )
}
