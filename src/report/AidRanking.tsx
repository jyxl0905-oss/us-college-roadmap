import type { School } from '../lib/types'
import { navigate, slugify } from '../lib/router'
import { t } from '../i18n'
import SchoolLogo from '../browse/SchoolLogo'

// 💰 내 목표 학교 재정지원 순위 — 공표된 CDS/정책 기준으로만 정렬 (개인이 받을 금액 예측 아님)
export default function AidRanking({ schools, status }: { schools: School[]; status: 'intl' | 'domestic' }) {
  if (schools.length < 2) return null
  const money = (n: number) => `$${n.toLocaleString('en-US')}`

  if (status === 'intl') {
    const known = schools.filter((s) => s.intl_aid_count != null && s.intl_aid_count > 0 && s.intl_aid_avg != null)
    const zero = schools.filter((s) => s.intl_aid_count === 0)
    const unknown = schools.filter((s) => !known.includes(s) && !zero.includes(s))
    if (known.length === 0 && zero.length === 0) return null
    known.sort((a, b) => (b.intl_aid_avg ?? 0) - (a.intl_aid_avg ?? 0))
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
        <p className="font-semibold text-gray-900">💰 {t('내 목표 학교 재정지원 순위', 'Aid ranking of my targets')} <span className="ml-1 text-xs font-normal text-gray-400">{t('국제학생 · CDS 평균 지원액순', 'international · by CDS avg. award')}</span></p>
        <ol className="mt-2 flex flex-col gap-1.5">
          {known.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-gray-400">{i + 1}</span>
              <SchoolLogo schoolId={s.id} name={s.name} size={18} />
              <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="min-w-0 flex-1 truncate text-left text-gray-800 hover:underline">{s.name}</button>
              <span className="shrink-0 text-right">
                <span className="font-semibold tabular-nums text-gray-900">{money(s.intl_aid_avg!)}</span>
                <span className="block text-[10px] text-gray-400">{s.intl_aid_count!.toLocaleString()}{t('명', ' aided')} · {s.intl_aid_year}</span>
              </span>
              <span className="hidden shrink-0 gap-1 sm:flex">
                {s.need_blind_intl && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">need-blind</span>}
                {s.meets_full_need_intl && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">100%</span>}
              </span>
            </li>
          ))}
        </ol>
        {zero.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">{t('국제학생 need 지원 기록 없음: ', 'No need-based aid to internationals: ')}</span>
            {zero.map((s) => s.name).join(' · ')}
          </p>
        )}
        {unknown.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">{t('미확인: ', 'Not verified: ')}{unknown.map((s) => s.name).join(' · ')}</p>
        )}
        <p className="mt-2 text-[11px] text-gray-400">{t('학교가 공표한 평균(CDS H6) 기준 순서예요 — 내가 받을 금액의 예측이 아니고, 가정 소득·학교 정책에 따라 달라요.', 'Ordered by each school’s published average (CDS H6) — not a prediction of what you’d receive; it depends on family income and school policy.')}</p>
      </div>
    )
  }

  // 시민권·영주권: 정책 점수 (무대출 2 + need100% 2 + 메리트 1)
  const score = (s: School) => (s.no_loan ? 2 : 0) + (s.meets_full_need_all ? 2 : 0) + (s.merit_note ? 1 : 0)
  const withData = schools.filter((s) => s.no_loan != null || s.meets_full_need_all != null || s.merit_note)
  if (withData.length === 0) return null
  withData.sort((a, b) => score(b) - score(a))
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
      <p className="font-semibold text-gray-900">💰 {t('내 목표 학교 재정지원 순위', 'Aid ranking of my targets')} <span className="ml-1 text-xs font-normal text-gray-400">{t('시민권·영주권 · 공식 정책 기준', 'citizens/PR · by official policy')}</span></p>
      <ol className="mt-2 flex flex-col gap-1.5">
        {withData.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-gray-400">{i + 1}</span>
            <SchoolLogo schoolId={s.id} name={s.name} size={18} />
            <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="min-w-0 flex-1 truncate text-left text-gray-800 hover:underline">{s.name}</button>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              {s.no_loan && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">{t('무대출', 'no-loan')}</span>}
              {s.meets_full_need_all && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">{t('need 100%', 'need 100%')}</span>}
              {s.merit_note && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">{t('메리트', 'merit')}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-gray-400">{t('무대출·need 100% 충족·메리트 장학금 공식 정책 여부로 정렬했어요 — 실제 금액은 FAFSA/CSS 심사로 정해져요.', 'Ordered by official policies (no-loan, 100% need met, merit) — actual amounts are set by FAFSA/CSS review.')}</p>
    </div>
  )
}
