import { useEffect, useState } from 'react'
import type { OnboardingAnswers, School, Tier } from '../lib/types'
import { emptyAnswers } from '../lib/types'
import { readPrefillSchoolIds, clearPrefill } from '../browse/prefill'
import { majorsByTrack } from '../data/majors'
import schoolsData from '../data/schools.seed.json'
import { tierLabels } from './labels'
import ChoiceStep from './ChoiceStep'
import GradYearStep from './GradYearStep'
import TargetSchoolsStep from './TargetSchoolsStep'
import ApStep from './ApStep'
import SummaryStep from './SummaryStep'
import QuizStep from './QuizStep'
import InfoSourcesStep from './InfoSourcesStep'

const seedSchools = schoolsData as School[]
const DRAFT_KEY = 'onboarding_draft' // R1-C-6: 이탈 복구용 임시 저장

type StepId =
  | 'gradYear'
  | 'status'
  | 'counselor'
  | 'accredited'
  | 'majorTrack'
  | 'majorPrimary'
  | 'majorSecondary'
  | 'targetMode'
  | 'targetSchools'
  | 'targetTier'
  | 'teaser'
  | 'gpa'
  | 'math'
  | 'sat'
  | 'satBand'
  | 'ap'
  | 'toefl'
  | 'actSpike'
  | 'actLeadership'
  | 'actValidation'
  | 'quiz'
  | 'infoSources'
  | 'summary'

// 답변에 따라 조건부 질문(전공 상세, 목표 학교 상세, SAT 밴드, TOEFL)이 끼어드는 전체 스텝 목록
function stepList(a: OnboardingAnswers): StepId[] {
  const steps: StepId[] = ['gradYear', 'status', 'counselor', 'accredited', 'majorTrack']
  if (a.majorTrack !== 'undecided') steps.push('majorPrimary', 'majorSecondary')
  steps.push('targetMode')
  if (a.targetMode === 'schools') steps.push('targetSchools')
  if (a.targetMode === 'tier') steps.push('targetTier')
  if (a.targetMode === 'schools' || a.targetMode === 'tier') steps.push('teaser') // R1-C-5: 미리보기 티저
  steps.push('gpa', 'math', 'sat')
  if (a.satStatus === 'taken') steps.push('satBand')
  steps.push('ap')
  if (a.applicantStatus !== 'domestic') steps.push('toefl') // 모름도 국제학생 처리
  steps.push('actSpike', 'actLeadership', 'actValidation', 'quiz', 'infoSources', 'summary')
  return steps
}

// R1-C-3: 그룹 전환 브릿지 문구 (해당 스텝 위에 한 줄 표시)
const bridgeText: Partial<Record<StepId, string>> = {
  majorTrack: '기본 정보는 끝! 이제 목표를 물어볼게요 🎯',
  gpa: '이제 지금 상태를 확인할게요 📋',
  actSpike: '마지막 구간 — 활동 이야기예요 🏃',
}

interface OnboardingFlowProps {
  onComplete?: (answers: OnboardingAnswers) => void
}

function loadDraft(): { answers: OnboardingAnswers; stepIndex: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d || typeof d.stepIndex !== 'number' || d.stepIndex < 1) return null
    return { answers: { ...emptyAnswers, ...d.answers }, stepIndex: d.stepIndex }
  } catch {
    return null
  }
}

// F1·F2: 학교 상세·비교 CTA에서 넘어온 경우 Q6(목표 학교)를 미리 채워줌
function initialAnswers(): OnboardingAnswers {
  const prefillIds = readPrefillSchoolIds()
  if (prefillIds.length > 0)
    return { ...emptyAnswers, targetMode: 'schools', targetSchoolIds: prefillIds }
  return emptyAnswers
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers)
  const [stepIndex, setStepIndex] = useState(0)
  // R1-C-6: 이탈 복구 — 진행하던 초안이 있으면 이어서 하기 제안
  const [resumeDraft, setResumeDraft] = useState(loadDraft)

  const steps = stepList(answers)
  const step = steps[Math.min(stepIndex, steps.length - 1)]

  // 진행 상황 임시 저장 (완료 시 App에서 초안 제거)
  useEffect(() => {
    if (resumeDraft) return // 이어서 하기 결정 전에는 덮어쓰지 않음
    if (stepIndex > 0 && step !== 'summary') {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, stepIndex }))
    }
  }, [answers, stepIndex, resumeDraft, step])

  // 답변 저장 후 다음 스텝으로 (조건부 스텝은 항상 현재 스텝 뒤에 끼어들므로 index+1이 안전)
  const answer = (patch: Partial<OnboardingAnswers>, autoNext = true) => {
    setAnswers((prev) => ({ ...prev, ...patch }))
    if (autoNext) setStepIndex((i) => i + 1)
  }

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))
  const goNext = () => setStepIndex((i) => i + 1)
  const restart = () => {
    localStorage.removeItem(DRAFT_KEY)
    setAnswers(initialAnswers())
    setStepIndex(0)
  }
  const complete = () => {
    localStorage.removeItem(DRAFT_KEY)
    clearPrefill()
    onComplete?.(answers)
  }

  const progress = stepIndex / (steps.length - 1)

  // 이어서 하기 제안 화면
  if (resumeDraft) {
    return (
      <div className="min-h-dvh bg-gray-50">
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <p className="text-4xl">👋</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">진행하던 온보딩이 있어요</h1>
          <p className="mt-2 text-sm text-gray-500">답변은 저장돼 있으니 이어서 하면 돼요.</p>
          <button
            onClick={() => {
              setAnswers(resumeDraft.answers)
              setStepIndex(resumeDraft.stepIndex)
              setResumeDraft(null)
            }}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            이어서 하기 ({resumeDraft.stepIndex + 1}번째 질문부터)
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY)
              setResumeDraft(null)
            }}
            className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
          >
            처음부터 하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 pb-10">
        <header className="flex items-center gap-3 py-4">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            aria-label="이전 질문으로"
            className="rounded-lg p-2 text-gray-500 active:bg-gray-100 disabled:invisible"
          >
            ←
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          {/* R1-C-1: 남은 시간 안내 → 중반부터 문구 전환 */}
          <span className="shrink-0 text-xs text-gray-400">
            {progress < 0.5 ? '약 3분' : '거의 다 왔어요'}
          </span>
        </header>
        <main className="pt-2">
          {bridgeText[step] && (
            <p className="mb-3 text-sm font-medium text-blue-600">{bridgeText[step]}</p>
          )}
          {renderStep()}
        </main>
      </div>
    </div>
  )

  function renderStep() {
    switch (step) {
      case 'gradYear':
        return (
          <GradYearStep
            selected={answers.gradYear}
            onSelect={(year) => answer({ gradYear: year }, false)}
            onNext={goNext}
          />
        )
      case 'status':
        return (
          <ChoiceStep
            title="미국 대학에 어떤 신분으로 지원하나요?"
            options={[
              { value: 'intl', label: '국제학생 (International)', description: 'F-1 등 유학 비자로 지원' },
              { value: 'domestic', label: '미국 시민권·영주권', description: 'U.S. Citizen / Green Card' },
              { value: 'unknown', label: '잘 모르겠어요', description: '국제학생 기준으로 안내하고, 확인 항목을 추가해 드려요' },
            ]}
            selected={answers.applicantStatus}
            onSelect={(v) => answer({ applicantStatus: v, ...(v === 'domestic' ? { toeflStatus: null } : {}) })}
          />
        )
      case 'counselor':
        return (
          <ChoiceStep
            title="입시를 전담해 주는 카운슬러가 있나요?"
            subtitle="학교 카운슬러든 외부 컨설턴트든 정기적으로 관리해 주는 사람 기준이에요."
            options={[
              { value: 'yes', label: '예, 있어요' },
              { value: 'no', label: '아니요, 없어요' },
              { value: 'unknown', label: '잘 모르겠어요' },
            ]}
            selected={answers.hasCounselor}
            onSelect={(v) => answer({ hasCounselor: v })}
          />
        )
      case 'accredited':
        return (
          <ChoiceStep
            title="다니는 학교가 국제 인증을 받았나요?"
            subtitle="WASC, Cognia 같은 인증이요. 성적표 인정에 중요해요."
            options={[
              { value: 'yes', label: '예, 인증받았어요' },
              { value: 'no', label: '아니요' },
              { value: 'unknown', label: '잘 모르겠어요', description: '확인 방법을 체크리스트 맨 위에 넣어드려요' },
            ]}
            selected={answers.schoolAccredited}
            onSelect={(v) => answer({ schoolAccredited: v })}
          />
        )
      case 'majorTrack':
        return (
          <ChoiceStep
            title="문과·이과 중 어느 쪽인가요?"
            subtitle="관심 있는 계열을 골라주세요. 다음 질문에서 그 계열 전공만 보여드려요."
            options={[
              { value: 'stem', label: '이과 (STEM)', description: 'CS, 공학, 수학, 자연과학, 프리메드' },
              { value: 'liberal', label: '문과 (Humanities·Social)', description: '비즈니스·경제, 사회과학, 인문, 예술' },
              { value: 'undecided', label: '아직 미정이에요', description: '전공 질문은 건너뛰어요' },
            ]}
            selected={answers.majorTrack}
            onSelect={(v) =>
              answer(
                v === 'undecided'
                  ? { majorTrack: v, majorPrimary: 'undecided', majorSecondary: null }
                  : { majorTrack: v, majorPrimary: null, majorSecondary: null },
              )
            }
          />
        )
      case 'majorPrimary':
        return (
          <ChoiceStep
            title="희망 전공 1순위를 골라주세요"
            options={[
              ...majorsByTrack(answers.majorTrack === 'liberal' ? 'liberal' : 'stem').map((m) => ({
                value: m.value,
                label: m.label,
              })),
              { value: 'undecided', label: '이 중에선 아직 미정이에요' },
            ]}
            selected={answers.majorPrimary}
            onSelect={(v) => answer({ majorPrimary: v })}
          />
        )
      case 'majorSecondary':
        return (
          <ChoiceStep
            title="2순위 전공도 있나요? (선택)"
            options={[
              { value: '', label: '없어요 / 건너뛰기' },
              ...majorsByTrack(answers.majorTrack === 'liberal' ? 'liberal' : 'stem')
                .filter((m) => m.value !== answers.majorPrimary)
                .map((m) => ({ value: m.value, label: m.label })),
            ]}
            selected={answers.majorSecondary ?? ''}
            onSelect={(v) => answer({ majorSecondary: v === '' ? null : v })}
          />
        )
      case 'targetMode':
        return (
          <ChoiceStep
            title="목표 학교가 정해져 있나요?"
            options={[
              { value: 'schools', label: '구체적인 학교가 있어요', description: '톱60에서 검색해서 골라요' },
              { value: 'tier', label: '대략적인 순위대만 있어요', description: 'Top 20 / 21-40위 / 41-60위' },
              { value: 'undecided', label: '아직 미정이에요' },
            ]}
            selected={answers.targetMode}
            onSelect={(v) =>
              // 'schools' 선택 시 기존 선택(둘러보기 프리필 포함)은 유지
              answer({
                targetMode: v,
                targetSchoolIds: v === 'schools' ? answers.targetSchoolIds : [],
                targetTier: null,
              })
            }
          />
        )
      case 'targetSchools':
        return (
          <TargetSchoolsStep
            selectedIds={answers.targetSchoolIds}
            onChange={(ids) => answer({ targetSchoolIds: ids }, false)}
            onNext={goNext}
          />
        )
      case 'targetTier':
        return (
          <ChoiceStep
            title="목표 순위대를 골라주세요"
            options={[
              { value: 1, label: 'Top 20' },
              { value: 2, label: '21-40위' },
              { value: 3, label: '41-60위' },
            ]}
            selected={answers.targetTier}
            onSelect={(v) => answer({ targetTier: v as Tier })}
          />
        )
      case 'teaser': {
        // R1-C-5: 응답이 결과로 변하고 있다는 신호
        const teaserText =
          answers.targetMode === 'schools'
            ? (() => {
                const first = seedSchools.find((s) => s.id === answers.targetSchoolIds[0])
                const n = answers.targetSchoolIds.length
                return first
                  ? `${first.name_ko.split('(')[0].trim()} 포함 ${n}개 학교 기준으로 리포트를 만들고 있어요`
                  : `선택한 ${n}개 학교 기준으로 리포트를 만들고 있어요`
              })()
            : `${answers.targetTier ? tierLabels[answers.targetTier] : '목표'} 기준으로 리포트를 만들고 있어요`
        return <TeaserInterstitial text={teaserText} onNext={goNext} />
      }
      case 'quiz':
        return <QuizStep onDone={(qa) => answer({ quizAnswers: qa })} />
      case 'infoSources':
        return <InfoSourcesStep onDone={(s) => answer({ infoSources: s })} />
      case 'gpa':
        return (
          <ChoiceStep
            title="지금 GPA는 어느 정도인가요?"
            subtitle="4.0 만점(unweighted) 기준이에요."
            options={[
              { value: '3.9+', label: '3.9 이상' },
              { value: '3.7-3.9', label: '3.7 ~ 3.9' },
              { value: '3.5-3.7', label: '3.5 ~ 3.7' },
              { value: 'below3.5', label: '3.5 미만' },
              { value: 'none', label: 'GPA가 없는 학교예요', description: 'IB 점수제 등' },
              { value: 'ninth', label: '9학년이라 아직 없어요' },
            ]}
            selected={answers.gpaBand}
            onSelect={(v) => answer({ gpaBand: v })}
          />
        )
      case 'math':
        return (
          <ChoiceStep
            title="지금 듣고 있는 수학 과목은요?"
            options={[
              { value: 'algebra2_or_below', label: 'Algebra 2 이하' },
              { value: 'precalc', label: 'Precalculus' },
              { value: 'calc', label: 'Calculus (AB·BC)' },
              { value: 'post_calc', label: 'Calculus 이후 과정', description: 'Multivariable, Linear Algebra 등' },
            ]}
            selected={answers.mathCourse}
            onSelect={(v) => answer({ mathCourse: v })}
          />
        )
      case 'sat':
        return (
          <ChoiceStep
            title="SAT는 어떤 상태인가요?"
            options={[
              { value: 'none', label: '아직 계획 없어요' },
              { value: 'studying', label: '공부 중이에요' },
              { value: 'taken', label: '응시했어요', description: '점수대를 이어서 물어볼게요' },
            ]}
            selected={answers.satStatus}
            onSelect={(v) => answer({ satStatus: v, ...(v !== 'taken' ? { satBand: null } : {}) })}
          />
        )
      case 'satBand':
        return (
          <ChoiceStep
            title="SAT 점수대를 골라주세요"
            options={[
              { value: '1500+', label: '1500 이상' },
              { value: '1400-1490', label: '1400 ~ 1490' },
              { value: '1300-1390', label: '1300 ~ 1390' },
              { value: 'below1300', label: '1300 미만' },
            ]}
            selected={answers.satBand}
            onSelect={(v) => answer({ satBand: v })}
          />
        )
      case 'ap':
        return (
          <ApStep
            completed={answers.apCompleted}
            current={answers.apCurrent}
            onChange={(patch) => answer(patch, false)}
            onNext={goNext}
          />
        )
      case 'toefl':
        return (
          <ChoiceStep
            title="TOEFL/IELTS는 어떤 상태인가요?"
            subtitle="국제학생은 대부분 영어 공인 점수가 필요해요."
            options={[
              { value: 'none', label: '아직 안 봤어요' },
              { value: 'studying', label: '공부 중이에요' },
              { value: 'scored', label: '점수가 있어요' },
            ]}
            selected={answers.toeflStatus}
            onSelect={(v) => answer({ toeflStatus: v })}
          />
        )
      case 'actSpike':
        return (
          <ChoiceStep
            title="나를 대표하는 활동이 있나요?"
            subtitle="활동 자가진단 1/3 — 대표 활동 (Spike)"
            options={[
              { value: 1, label: '아직 없어요' },
              { value: 2, label: '꾸준히 하는 활동은 있어요' },
              { value: 3, label: '성과·결과물이 있는 대표 활동이 있어요' },
            ]}
            selected={answers.activitySpike}
            onSelect={(v) => answer({ activitySpike: v as 1 | 2 | 3 })}
          />
        )
      case 'actLeadership':
        return (
          <ChoiceStep
            title="리더 역할을 해본 적 있나요?"
            subtitle="활동 자가진단 2/3 — 리더십 (Leadership)"
            options={[
              { value: 1, label: '아직 없어요' },
              { value: 2, label: '팀·동아리에서 맡은 역할이 있어요' },
              { value: 3, label: '회장·창립 등 주도한 경험이 있어요' },
            ]}
            selected={answers.activityLeadership}
            onSelect={(v) => answer({ activityLeadership: v as 1 | 2 | 3 })}
          />
        )
      case 'actValidation':
        return (
          <ChoiceStep
            title="학교 밖에서 인정받은 적 있나요?"
            subtitle="활동 자가진단 3/3 — 교외 인정 (External Validation)"
            options={[
              { value: 1, label: '아직 없어요' },
              { value: 2, label: '지역·소규모 대회 수상이 있어요' },
              { value: 3, label: '전국·국제 수준 수상이 있어요' },
            ]}
            selected={answers.activityValidation}
            onSelect={(v) => answer({ activityValidation: v as 1 | 2 | 3 })}
          />
        )
      case 'summary':
        return (
          <SummaryStep
            answers={answers}
            onRestart={restart}
            onComplete={onComplete ? complete : undefined}
          />
        )
    }
  }
}

// R1-C-5: 티저 인터스티셜 — 자동 진행(2초) + 탭으로 즉시
function TeaserInterstitial({ text, onNext }: { text: string; onNext: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onNext, 2000)
    return () => window.clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button onClick={onNext} className="mt-16 w-full text-center">
      <p className="text-4xl">✨</p>
      <p className="mt-4 text-lg font-semibold leading-relaxed text-gray-900">{text}</p>
      <p className="mt-3 text-xs text-gray-400">잠시 후 계속 — 탭하면 바로 넘어가요</p>
    </button>
  )
}
