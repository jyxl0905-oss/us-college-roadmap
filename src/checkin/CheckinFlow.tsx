import { useEffect, useState } from 'react'
import type { ChecklistItem, ClarityItem, Tier } from '../lib/types'
import { supabase } from '../lib/supabase'
import { filterChecklist, saveProfile, type ProfileRow } from '../lib/profile'
import { gradeFromGradYear, currentSeasonLabel, seasonLabelKo, currentSeason } from '../lib/academics'
import { majorsByTrack } from '../data/majors'
import ChoiceStep from '../onboarding/ChoiceStep'
import TargetSchoolsStep from '../onboarding/TargetSchoolsStep'

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

type Screen = 'carryover' | 'changes' | 'targets' | 'clarity'
type ChangeForm = 'scores' | 'activities' | 'gpa' | null

const CLARITY_EMOJIS = ['😟', '😕', '😐', '🙂', '😄'] // 1~5점

// 시즌 체크인 — ① 지난 시즌 미완료 이월/건너뛰기 ② 변경사항 ③ 전공·목표 확인
export default function CheckinFlow({ userId, profile, prevSeasonLabel, onDone }: CheckinFlowProps) {
  const [screen, setScreen] = useState<Screen>('carryover')
  const [incomplete, setIncomplete] = useState<ChecklistItem[]>([])
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
    ]).then(([itemsRes, prevChecks, carriedChecks, clarityRes]) => {
      if (clarityRes.data) setClarityItems(clarityRes.data as ClarityItem[])
      const decided = new Set([
        ...(prevChecks.data ?? []).map((c) => c.item_id),
        ...(carriedChecks.data ?? []).map((c) => c.item_id),
      ])
      const prevItems = filterChecklist((itemsRes.data ?? []) as ChecklistItem[], profile, {
        grade: prevGrade,
        season: prevSeason,
      })
      const pending = prevItems.filter((i) => !decided.has(i.id))
      setIncomplete(pending)
      setLoading(false)
      if (pending.length === 0) setScreen('changes')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (item: ChecklistItem, carry: boolean) => {
    if (!supabase) return
    setIncomplete((prev) => {
      const next = prev.filter((i) => i.id !== item.id)
      if (next.length === 0) setScreen('changes')
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
    return wrap(<p className="mt-20 text-center text-gray-400">{saving ? '저장 중…' : '불러오는 중…'}</p>)

  // ① 지난 시즌 미완료 항목
  if (screen === 'carryover') {
    return wrap(
      <div>
        <h1 className="text-xl font-bold text-gray-900">오랜만이에요! 👋</h1>
        <p className="mt-2 text-sm text-gray-500">
          지난 {seasonKoFromLabel(prevSeasonLabel)} 시즌에 완료하지 못한 항목이 있어요. 이번
          시즌으로 가져갈까요?
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
                  이번 시즌으로 이월
                </button>
                <button
                  onClick={() => decide(item, false)}
                  className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 active:bg-gray-50"
                >
                  건너뛰기
                </button>
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
          title="바뀐 GPA 밴드를 골라주세요"
          options={[
            { value: '3.9+', label: '3.9 이상' },
            { value: '3.7-3.9', label: '3.7 ~ 3.9' },
            { value: '3.5-3.7', label: '3.5 ~ 3.7' },
            { value: 'below3.5', label: '3.5 미만' },
            { value: 'none', label: 'GPA가 없는 학교예요' },
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
            title="SAT는 지금 어떤 상태인가요?"
            options={[
              { value: 'none', label: '아직 계획 없어요' },
              { value: 'studying', label: '공부 중이에요' },
              { value: 'taken', label: '응시했어요' },
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
            title="SAT 점수대를 골라주세요"
            options={[
              { value: '1500+', label: '1500 이상' },
              { value: '1400-1490', label: '1400 ~ 1490' },
              { value: '1300-1390', label: '1300 ~ 1390' },
              { value: 'below1300', label: '1300 미만' },
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
          title="TOEFL/IELTS는 어떤 상태인가요?"
          options={[
            { value: 'none', label: '아직 안 봤어요' },
            { value: 'studying', label: '공부 중이에요' },
            { value: 'scored', label: '점수가 있어요' },
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
          title: '나를 대표하는 활동이 있나요?',
          field: 'activity_spike' as const,
          options: [
            { value: 1, label: '아직 없어요' },
            { value: 2, label: '꾸준히 하는 활동은 있어요' },
            { value: 3, label: '성과·결과물이 있는 대표 활동이 있어요' },
          ],
        },
        {
          title: '리더 역할을 해본 적 있나요?',
          field: 'activity_leadership' as const,
          options: [
            { value: 1, label: '아직 없어요' },
            { value: 2, label: '팀·동아리에서 맡은 역할이 있어요' },
            { value: 3, label: '회장·창립 등 주도한 경험이 있어요' },
          ],
        },
        {
          title: '학교 밖에서 인정받은 적 있나요?',
          field: 'activity_validation' as const,
          options: [
            { value: 1, label: '아직 없어요' },
            { value: 2, label: '지역·소규모 대회 수상이 있어요' },
            { value: 3, label: '전국·국제 수준 수상이 있어요' },
          ],
        },
      ]
      const s = steps[formStep] ?? steps[0]
      return wrap(
        <ChoiceStep
          title={s.title}
          subtitle={`활동 업데이트 ${formStep + 1}/3`}
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
        <h1 className="text-xl font-bold text-gray-900">그동안 달라진 게 있나요?</h1>
        <p className="mt-2 text-sm text-gray-500">해당하는 것을 눌러 업데이트해 주세요.</p>
        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={() => {
              setChangeForm('scores')
              setFormStep(0)
            }}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50"
          >
            새 시험 점수가 있어요 (SAT/TOEFL){mark('scores')}
          </button>
          <button
            onClick={() => {
              setChangeForm('activities')
              setFormStep(0)
            }}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50"
          >
            새 수상·활동이 생겼어요{mark('activities')}
          </button>
          <button
            onClick={() => setChangeForm('gpa')}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left font-medium text-gray-900 active:bg-gray-50"
          >
            GPA가 바뀌었어요{mark('gpa')}
          </button>
        </div>
        <button
          onClick={() => setScreen('targets')}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          {changed.size > 0 ? '업데이트 끝, 다음' : '변동 없어요, 다음'}
        </button>
      </div>,
    )
  }

  // R1-B: 진로 명확성 단축 척도 (새 리포트 발급 직전, 10초)
  if (screen === 'clarity') {
    const allAnswered = clarityItems.every((item) => clarityScores[item.id] !== undefined)
    return wrap(
      <div>
        <p className="text-xs text-gray-400">10초면 끝 — 연구 동의자의 응답만 익명 통계로 사용</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">요즘 진로에 대한 느낌은 어때요?</h1>
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
                      aria-label={`${score}점`}
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
          완료 — 새 리포트 받기
        </button>
      </div>,
    )
  }

  // ③ 전공·목표 학교 유지 여부
  if (editTargets) {
    if (formStep === 0)
      return wrap(
        <ChoiceStep
          title="희망 전공 1순위를 골라주세요"
          options={[
            ...majorsByTrack('stem').map((m) => ({ value: m.value, label: m.label })),
            ...majorsByTrack('liberal').map((m) => ({ value: m.value, label: m.label })),
            { value: 'undecided', label: '미정 (Undecided)' },
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
          title="목표 학교는 어떻게 할까요?"
          options={[
            { value: 'schools', label: '구체적인 학교를 고를래요' },
            { value: 'tier', label: '순위대만 정할래요' },
            { value: 'undecided', label: '아직 미정이에요' },
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
        title="목표 순위대를 골라주세요"
        options={[
          { value: 1, label: 'Top 20' },
          { value: 2, label: '21-40위' },
          { value: 3, label: '41-60위' },
        ]}
        selected={draft.target_tier}
        onSelect={(v) => finish({ ...draft, target_tier: v as Tier })}
      />,
    )
  }

  return wrap(
    <div>
      <h1 className="text-xl font-bold text-gray-900">전공과 목표 학교는 그대로인가요?</h1>
      <p className="mt-2 text-sm text-gray-500">
        확인하면 {seasonLabelKo[currentSeason()]} 시즌 새 리포트를 만들어 드려요.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={() => finish(draft)}
          className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          네, 그대로예요 — 새 리포트 받기
        </button>
        <button
          onClick={() => {
            setEditTargets(true)
            setFormStep(0)
          }}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
        >
          바꾸고 싶어요
        </button>
      </div>
    </div>,
  )
}
