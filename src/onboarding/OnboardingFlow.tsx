import { useEffect, useState } from 'react'
import type { OnboardingAnswers, School, Tier } from '../lib/types'
import { emptyAnswers } from '../lib/types'
import { readPrefillSchoolIds, clearPrefill } from '../browse/prefill'
import { majorsByTrack, majorDisplay } from '../data/majors'
import SchoolNameStep from './SchoolNameStep'
import schoolsData from '../data/schools.index.json' // 경량 인덱스(id·이름·티어) — 전체 시드는 schoolsCache에서만
import { tierLabels } from './labels'
import { t } from '../i18n'
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
  | 'schoolName'
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
  const steps: StepId[] = ['gradYear', 'status', 'counselor', 'accredited', 'schoolName', 'majorTrack']
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
const bridgeText = (): Partial<Record<StepId, string>> => ({
  majorTrack: t('기본 정보는 끝! 이제 목표를 물어볼게요 🎯', 'Basics done! Now your goals 🎯'),
  gpa: t('이제 지금 상태를 확인할게요 📋', "Now let's check where you are 📋"),
  actSpike: t('마지막 구간 — 활동 이야기예요 🏃', 'Last stretch — activities 🏃'),
})

interface OnboardingFlowProps {
  onComplete?: (answers: OnboardingAnswers) => void
  onExit?: () => void // 첫 질문에서 ← → 홈으로 (게스트)
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

export default function OnboardingFlow({ onComplete, onExit }: OnboardingFlowProps) {
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

  // 티저(자동 진행 화면)로는 되돌아가지 않음 — 뒤로 갔다가 2초 뒤 다시 앞으로 튕기는 문제 방지
  const goBack = () =>
    setStepIndex((i) => {
      let n = Math.max(0, i - 1)
      if (steps[n] === 'teaser') n = Math.max(0, n - 1)
      return n
    })
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
          <h1 className="mt-4 text-xl font-bold text-gray-900">{t('진행하던 온보딩이 있어요', 'You have an onboarding in progress')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('답변은 저장돼 있으니 이어서 하면 돼요.', 'Your answers are saved — pick up where you left off.')}</p>
          <button
            onClick={() => {
              setAnswers(resumeDraft.answers)
              setStepIndex(resumeDraft.stepIndex)
              setResumeDraft(null)
            }}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {t(`이어서 하기 (${resumeDraft.stepIndex + 1}번째 질문부터)`, `Continue (from question ${resumeDraft.stepIndex + 1})`)}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY)
              setResumeDraft(null)
            }}
            className="mt-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-700 active:bg-gray-50"
          >
            {t('처음부터 하기', 'Start over')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 pb-10">
        <header className="flex items-center gap-3 py-4">
          {stepIndex === 0 && onExit ? (
            <button
              onClick={onExit}
              aria-label={t('홈으로', 'Home')}
              className="rounded-lg p-2 text-gray-500 active:bg-gray-100"
            >
              ←
            </button>
          ) : (
            <button
              onClick={goBack}
              disabled={stepIndex === 0}
              aria-label={t('이전 질문으로', 'Previous question')}
              className="rounded-lg p-2 text-gray-500 active:bg-gray-100 disabled:invisible"
            >
              ←
            </button>
          )}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          {/* R1-C-1: 남은 시간 안내 → 중반부터 문구 전환 */}
          <span className="shrink-0 text-xs text-gray-400">
            {progress < 0.5 ? t('약 3분', '~3 min') : t('거의 다 왔어요', 'Almost there')}
          </span>
        </header>
        <main className="pt-2">
          {bridgeText()[step] && (
            <p className="mb-3 text-sm font-medium text-blue-600">{bridgeText()[step]}</p>
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
            title={t('미국 대학에 어떤 신분으로 지원하나요?', 'What is your applicant status?')}
            options={[
              { value: 'intl', label: t('국제학생 (International)', 'International student'), description: t('F-1 등 유학 비자로 지원', 'Applying on an F-1 or other student visa') },
              { value: 'domestic', label: t('미국 시민권·영주권', 'U.S. citizen / permanent resident'), description: 'U.S. Citizen / Green Card' },
              { value: 'unknown', label: t('잘 모르겠어요', 'Not sure'), description: t('국제학생 기준으로 안내하고, 확인 항목을 추가해 드려요', "We'll treat you as international and add a check item") },
            ]}
            selected={answers.applicantStatus}
            onSelect={(v) => answer({ applicantStatus: v, ...(v === 'domestic' ? { toeflStatus: null } : {}) })}
          />
        )
      case 'counselor':
        return (
          <ChoiceStep
            title={t('입시를 전담해 주는 카운슬러가 있나요?', 'Do you have a dedicated college counselor?')}
            subtitle={t('학교 카운슬러든 외부 컨설턴트든 정기적으로 관리해 주는 사람 기준이에요.', 'School counselor or private consultant — someone who checks in regularly.')}
            options={[
              { value: 'yes', label: t('예, 있어요', 'Yes') },
              { value: 'no', label: t('아니요, 없어요', 'No') },
              { value: 'unknown', label: t('잘 모르겠어요', 'Not sure') },
            ]}
            selected={answers.hasCounselor}
            onSelect={(v) => answer({ hasCounselor: v })}
          />
        )
      case 'accredited':
        return (
          <ChoiceStep
            title={t('다니는 학교가 국제 인증을 받았나요?', 'Is your school internationally accredited?')}
            subtitle={t('WASC, Cognia 같은 인증이요. 성적표 인정에 중요해요.', 'e.g., WASC or Cognia — it matters for how your transcript is read.')}
            options={[
              { value: 'yes', label: t('예, 인증받았어요', 'Yes, accredited') },
              { value: 'no', label: t('아니요', 'No') },
              { value: 'unknown', label: t('잘 모르겠어요', 'Not sure'), description: t('확인 방법을 체크리스트 맨 위에 넣어드려요', "We'll put a how-to-check item at the top of your list") },
              { value: 'us', label: t('미국 현지 학교에 다녀요', 'I attend a school in the U.S.'), description: t('미국 내 고등학교(공립·사립·보딩)면 국제 인증은 해당 없어요', 'Public, private or boarding school in the U.S. — this question does not apply') },
            ]}
            selected={answers.schoolInUs ? 'us' : answers.schoolAccredited}
            onSelect={(v) =>
              v === 'us'
                ? answer({ schoolAccredited: 'yes', schoolInUs: true })
                : answer({ schoolAccredited: v as 'yes' | 'no' | 'unknown', schoolInUs: false })
            }
          />
        )
      case 'schoolName':
        return <SchoolNameStep value={answers.schoolName} onSelect={(name) => answer({ schoolName: name })} />
      case 'majorTrack':
        return (
          <ChoiceStep
            title={t('문과·이과 중 어느 쪽인가요?', 'STEM or humanities/social?')}
            subtitle={t('관심 있는 계열을 골라주세요. 다음 질문에서 그 계열 전공만 보여드려요.', "Pick a track — we'll show only those majors next.")}
            options={[
              { value: 'stem', label: t('이과 (STEM)', 'STEM'), description: t('CS, 공학, 수학, 자연과학, 프리메드', 'CS, engineering, math, sciences, pre-med') },
              { value: 'liberal', label: t('문과 (Humanities·Social)', 'Humanities / Social'), description: t('비즈니스·경제, 사회과학, 인문, 예술', 'Business, social sciences, humanities, arts') },
              { value: 'undecided', label: t('아직 미정이에요', 'Undecided'), description: t('전공 질문은 건너뛰어요', 'Skips the major questions') },
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
            title={t('희망 전공 1순위를 골라주세요', 'Pick your first-choice major')}
            options={[
              ...majorsByTrack(answers.majorTrack === 'liberal' ? 'liberal' : 'stem').map((m) => ({
                value: m.value,
                label: majorDisplay(m),
              })),
              { value: 'undecided', label: t('이 중에선 아직 미정이에요', 'Undecided among these') },
            ]}
            selected={answers.majorPrimary}
            onSelect={(v) => answer({ majorPrimary: v })}
          />
        )
      case 'majorSecondary':
        return (
          <ChoiceStep
            title={t('2순위 전공도 있나요? (선택)', 'A second-choice major? (optional)')}
            options={[
              { value: '', label: t('없어요 / 건너뛰기', 'None / skip') },
              ...majorsByTrack(answers.majorTrack === 'liberal' ? 'liberal' : 'stem')
                .filter((m) => m.value !== answers.majorPrimary)
                .map((m) => ({ value: m.value, label: majorDisplay(m) })),
            ]}
            selected={answers.majorSecondary ?? ''}
            onSelect={(v) => answer({ majorSecondary: v === '' ? null : v })}
          />
        )
      case 'targetMode':
        return (
          <ChoiceStep
            title={t('목표 학교가 정해져 있나요?', 'Do you have target schools?')}
            options={[
              { value: 'schools', label: t('구체적인 학교가 있어요', 'Yes, specific schools'), description: t('톱60에서 검색해서 골라요', 'Search and pick from the top 60') },
              { value: 'tier', label: t('대략적인 순위대만 있어요', 'Just a rank range'), description: t('Top 20 / 21-40위 / 41-60위', 'Top 20 / 21–40 / 41–60') },
              { value: 'undecided', label: t('아직 미정이에요', 'Undecided') },
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
            title={t('목표 순위대를 골라주세요', 'Pick a target rank range')}
            options={[
              { value: 1, label: 'Top 20' },
              { value: 2, label: t('21-40위', 'Ranks 21–40') },
              { value: 3, label: t('41-60위', 'Ranks 41–60') },
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
                  ? t(`${first.name_ko.split('(')[0].trim()} 포함 ${n}개 학교 기준으로 리포트를 만들고 있어요`, `Building your report around ${n} school${n > 1 ? 's' : ''} including ${first.name}`)
                  : t(`선택한 ${n}개 학교 기준으로 리포트를 만들고 있어요`, `Building your report around your ${n} school${n > 1 ? 's' : ''}`)
              })()
            : t(`${answers.targetTier ? tierLabels[answers.targetTier] : '목표'} 기준으로 리포트를 만들고 있어요`, 'Building your report around your target range')
        return <TeaserInterstitial text={teaserText} onNext={goNext} />
      }
      case 'quiz':
        return <QuizStep onDone={(qa) => answer({ quizAnswers: qa })} />
      case 'infoSources':
        return <InfoSourcesStep onDone={(s) => answer({ infoSources: s })} />
      case 'gpa':
        return (
          <ChoiceStep
            title={t('지금 GPA는 어느 정도인가요?', 'What is your GPA right now?')}
            subtitle={t('4.0 만점(unweighted) 기준이에요.', 'Unweighted, 4.0 scale.')}
            options={[
              { value: '3.9+', label: t('3.9 이상', '3.9 or above') },
              { value: '3.7-3.9', label: '3.7 ~ 3.9' },
              { value: '3.5-3.7', label: '3.5 ~ 3.7' },
              { value: 'below3.5', label: t('3.5 미만', 'Below 3.5') },
              { value: 'none', label: t('GPA가 없는 학교예요', 'My school has no GPA'), description: t('IB 점수제 등', 'e.g., IB points') },
              { value: 'ninth', label: t('9학년이라 아직 없어요', 'Not yet — 9th grade') },
            ]}
            selected={answers.gpaBand}
            onSelect={(v) => answer({ gpaBand: v })}
          />
        )
      case 'math':
        return (
          <ChoiceStep
            title={t('지금 듣고 있는 수학 과목은요?', 'Which math course are you in?')}
            options={[
              { value: 'algebra2_or_below', label: t('Algebra 2 이하', 'Algebra 2 or below') },
              { value: 'precalc', label: 'Precalculus' },
              { value: 'calc', label: 'Calculus (AB·BC)' },
              { value: 'post_calc', label: t('Calculus 이후 과정', 'Beyond Calculus'), description: t('Multivariable, Linear Algebra 등', 'Multivariable, Linear Algebra, etc.') },
            ]}
            selected={answers.mathCourse}
            onSelect={(v) => answer({ mathCourse: v })}
          />
        )
      case 'sat':
        return (
          <ChoiceStep
            title={t('SAT는 어떤 상태인가요?', 'Where are you with the SAT?')}
            options={[
              { value: 'none', label: t('아직 계획 없어요', 'No plans yet') },
              { value: 'studying', label: t('공부 중이에요', 'Studying') },
              { value: 'taken', label: t('응시했어요', 'Taken it'), description: t('점수대를 이어서 물어볼게요', "We'll ask your score range next") },
            ]}
            selected={answers.satStatus}
            onSelect={(v) => answer({ satStatus: v, ...(v !== 'taken' ? { satBand: null } : {}) })}
          />
        )
      case 'satBand':
        return (
          <ChoiceStep
            title={t('SAT 점수대를 골라주세요', 'Pick your SAT score range')}
            options={[
              { value: '1500+', label: t('1500 이상', '1500 or above') },
              { value: '1400-1490', label: '1400 ~ 1490' },
              { value: '1300-1390', label: '1300 ~ 1390' },
              { value: 'below1300', label: t('1300 미만', 'Below 1300') },
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
            title={t('TOEFL/IELTS는 어떤 상태인가요?', 'Where are you with TOEFL/IELTS?')}
            subtitle={answers.schoolInUs ? t('미국 학교를 여러 해 다녔으면 면제해 주는 대학이 많아요 — 학교별 기준 확인', 'Many colleges waive it after several years at a U.S. school — check each school') : t('국제학생은 대부분 영어 공인 점수가 필요하지만, 면제해 주는 학교도 있어요.', 'Most international applicants need it, but some schools waive it.')}
            options={[
              { value: 'none', label: t('아직 안 봤어요', 'Not yet') },
              { value: 'studying', label: t('공부 중이에요', 'Studying') },
              { value: 'scored', label: t('점수가 있어요', 'Have a score') },
              {
                value: 'exempt',
                label: t('면제 대상일 수 있어요', 'I may be exempt'),
                description: t('영어로 수업하는 학교를 여러 해 다녔거나 SAT 영어 점수가 높으면 면제해 주는 학교가 있어요 — 기준은 학교마다 달라 확인이 필요해요', 'Some schools waive it after years at an English-medium school or with a high SAT EBRW — rules vary, verify per school'),
              },
            ]}
            selected={answers.toeflStatus}
            onSelect={(v) => answer({ toeflStatus: v })}
          />
        )
      case 'actSpike':
        return (
          <ChoiceStep
            title={t('나를 대표하는 활동이 있나요?', 'Do you have a signature activity?')}
            subtitle={t('활동 자가진단 1/3 — 대표 활동 (Spike)', 'Self-check 1/3 — Spike')}
            options={[
              { value: 1, label: t('아직 없어요', 'Not yet') },
              { value: 2, label: t('꾸준히 하는 활동은 있어요', 'I have a consistent activity') },
              { value: 3, label: t('성과·결과물이 있는 대표 활동이 있어요', 'I have one with real results') },
            ]}
            selected={answers.activitySpike}
            onSelect={(v) => answer({ activitySpike: v as 1 | 2 | 3 })}
          />
        )
      case 'actLeadership':
        return (
          <ChoiceStep
            title={t('리더 역할을 해본 적 있나요?', 'Have you held a leadership role?')}
            subtitle={t('활동 자가진단 2/3 — 리더십 (Leadership)', 'Self-check 2/3 — Leadership')}
            options={[
              { value: 1, label: t('아직 없어요', 'Not yet') },
              { value: 2, label: t('팀·동아리에서 맡은 역할이 있어요', 'I hold a role in a team/club') },
              { value: 3, label: t('회장·창립 등 주도한 경험이 있어요', "I've led — president, founder, captain") },
            ]}
            selected={answers.activityLeadership}
            onSelect={(v) => answer({ activityLeadership: v as 1 | 2 | 3 })}
          />
        )
      case 'actValidation':
        return (
          <ChoiceStep
            title={t('학교 밖에서 인정받은 적 있나요?', 'Any recognition outside school?')}
            subtitle={t('활동 자가진단 3/3 — 교외 인정 (External Validation)', 'Self-check 3/3 — External validation')}
            options={[
              { value: 1, label: t('아직 없어요', 'Not yet') },
              { value: 2, label: t('지역·소규모 대회 수상이 있어요', 'Regional / small competition awards') },
              { value: 3, label: t('전국·국제 수준 수상이 있어요', 'National / international awards') },
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
      <p className="mt-3 text-xs text-gray-400">{t('잠시 후 계속 — 탭하면 바로 넘어가요', 'Continuing shortly — tap to skip ahead')}</p>
    </button>
  )
}
