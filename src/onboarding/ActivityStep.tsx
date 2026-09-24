import { t } from '../i18n'

type Level = 1 | 2 | 3
interface Props {
  spike: Level | null
  leadership: Level | null
  validation: Level | null
  onChange: (patch: { activitySpike?: Level; activityLeadership?: Level; activityValidation?: Level }) => void
  onNext: () => void
}

// Q12 활동 자가진단 — 설계서대로 한 화면에 3그룹(대표 활동·리더십·교외 인정), 각 3단계
export default function ActivityStep({ spike, leadership, validation, onChange, onNext }: Props) {
  const groups: { key: 'activitySpike' | 'activityLeadership' | 'activityValidation'; title: string; value: Level | null; options: [Level, string][] }[] = [
    {
      key: 'activitySpike', value: spike,
      title: t('나를 대표하는 활동 (Spike)', 'Signature activity (Spike)'),
      options: [[1, t('아직 없어요', 'Not yet')], [2, t('꾸준히 하는 활동은 있어요', 'I have a consistent activity')], [3, t('성과·결과물이 있는 대표 활동이 있어요', 'I have one with real results')]],
    },
    {
      key: 'activityLeadership', value: leadership,
      title: t('리더 역할 (Leadership)', 'Leadership role'),
      options: [[1, t('아직 없어요', 'Not yet')], [2, t('팀·동아리에서 맡은 역할이 있어요', 'I hold a role in a team/club')], [3, t('회장·창립 등 주도한 경험이 있어요', "I've led — president, founder, captain")]],
    },
    {
      key: 'activityValidation', value: validation,
      title: t('학교 밖에서 인정받은 경험 (External Validation)', 'Recognition outside school'),
      options: [[1, t('아직 없어요', 'Not yet')], [2, t('지역·소규모 대회 수상이 있어요', 'Regional / small competition awards')], [3, t('전국·국제 수준 수상이 있어요', 'National / international awards')]],
    },
  ]
  const done = spike != null && leadership != null && validation != null

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t('활동은 지금 어느 정도인가요?', 'Where are your activities now?')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('세 가지를 하나씩 골라주세요. 정답은 없어요 — 지금 상태 그대로요.', 'Pick one for each — there are no right answers, just where you are now.')}</p>
      <div className="mt-6 flex flex-col gap-6">
        {groups.map((g, gi) => (
          <fieldset key={g.key}>
            <legend className="text-sm font-semibold text-gray-900"><span className="mr-1.5 text-blue-600">{gi + 1}</span>{g.title}</legend>
            <div className="mt-2 flex flex-col gap-2">
              {g.options.map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => onChange({ [g.key]: v })}
                  aria-pressed={g.value === v}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-left text-[15px] font-medium text-gray-900 transition-colors ${g.value === v ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white active:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!done}
        className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
      >
        {done ? t('다음', 'Next') : t('세 가지 모두 골라주세요', 'Pick all three')}
      </button>
    </div>
  )
}
