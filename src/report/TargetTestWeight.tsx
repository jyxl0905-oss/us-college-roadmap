import { useEffect, useState } from 'react'
import { t, getLang } from '../i18n'
import type { School } from '../lib/types'
import { navigate, slugify } from '../lib/router'
import { loadC7, LEVELS, LEVEL_STYLE, levelLabel, type C7Row } from '../lib/c7'
import SchoolLogo from '../browse/SchoolLogo'

// 목표 학교들이 공시한 시험 점수(SAT·ACT) 비중을 단계별로 묶어 보여줌 — 공시 사실만, 합격 판단 없음
export default function TargetTestWeight({ schools }: { schools: School[] }) {
  const [c7, setC7] = useState<Map<number, C7Row> | null>(null)
  useEffect(() => { void loadC7().then(setC7) }, [])
  if (!c7) return null

  const levelOf = (s: School) => (s.test_policy === 'test-free' ? 'free' : c7.get(s.id)?.levels.standardized_tests ?? null)
  const known = schools.filter((s) => levelOf(s) !== null)
  if (known.length === 0) return null
  const groups: { key: string; label: string; dot: string; list: School[] }[] = [
    ...LEVELS.map((lv) => ({ key: lv, label: levelLabel(lv), dot: LEVEL_STYLE[lv].dot, list: known.filter((s) => levelOf(s) === lv) })),
    { key: 'free', label: t('시험 미반영', 'Test-free'), dot: 'bg-gray-200', list: known.filter((s) => levelOf(s) === 'free') },
  ].filter((g) => g.list.length > 0)
  const vi = known.filter((s) => levelOf(s) === 'VI').length
  const name = (s: School) => (getLang() === 'ko' && s.name_ko ? s.name_ko.replace(/ ?(대학교|대학)$/, '') : s.name.replace(/^University of /, 'U ').replace(/ University$/, ''))

  return (
    <div className="mt-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="font-semibold text-gray-900">{t('목표 학교가 공시한 시험 점수 비중', 'How your targets weigh test scores')}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        {t(`${known.length}곳 중 ${vi}곳이 SAT·ACT 점수를 "매우 중요"로 공시했어요.`, `${vi} of ${known.length} list SAT/ACT scores as "very important".`)}
        {' '}{t('시험 준비에 시간을 얼마나 쓸지 정할 때 참고하세요.', 'Use it to decide how much time to put into test prep.')}
      </p>
      <div className="mt-2.5 flex flex-col gap-2">
        {groups.map((g) => (
          <div key={g.key} className="flex gap-2">
            <span className="flex w-[4.5rem] shrink-0 items-center gap-1.5 self-start pt-1 text-[12px] font-semibold text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} />{g.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {g.list.map((s) => (
                <button key={s.id} onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="inline-flex items-center gap-1 rounded-full bg-gray-50 py-0.5 pl-0.5 pr-2 text-[12px] font-medium text-gray-800 ring-1 ring-gray-200">
                  <SchoolLogo schoolId={s.id} name={s.name} size={18} />{name(s)}
                  {s.test_policy === 'test-required' && <span className="text-[10px] font-semibold text-blue-700">{t('필수', 'req.')}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">
        {t('각 대학 Common Data Set(C7) 공시 기준 · "필수"는 이번 입시에서 SAT·ACT 제출이 필수인 학교예요. 학교를 누르면 다른 요소 비중도 볼 수 있어요.', 'From each college’s Common Data Set (C7) · “req.” = SAT/ACT required this cycle. Tap a school to see the other factors.')}
      </p>
    </div>
  )
}
