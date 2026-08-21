import type { School } from '../lib/types'
import { t } from '../i18n'

// 💰 재정지원·장학금 — 지원 신분(status)에 맞는 부분만 표시. 데이터 없으면 아무것도 렌더하지 않음.
// status: 'intl' | 'domestic' | null(비로그인 → 국제학생 기준 + 안내)
export default function AidBlock({ school: s, status, compact = false }: { school: School; status: 'intl' | 'domestic' | null; compact?: boolean }) {
  const showIntl = status !== 'domestic'
  const hasIntl = s.intl_aid_count != null || s.intl_aid_avg != null || s.meets_full_need_intl != null || s.merit_intl
  const hasDom = s.meets_full_need_all != null || s.no_loan != null || s.merit_note
  if (showIntl ? !hasIntl : !hasDom) return null

  const money = (n: number) => `$${n.toLocaleString('en-US')}`

  if (compact) {
    // 카드용 한 줄
    if (showIntl) {
      if (s.intl_aid_count != null && s.intl_aid_count > 0 && s.intl_aid_avg != null)
        return (
          <p className="text-xs text-gray-600">
            💰 {t(`국제학생 ${s.intl_aid_count.toLocaleString()}명 지원 · 평균 ${money(s.intl_aid_avg)}`, `${s.intl_aid_count.toLocaleString()} intl. students aided · avg ${money(s.intl_aid_avg)}`)}
            {s.intl_aid_year && <span className="text-gray-400"> (CDS {s.intl_aid_year})</span>}
          </p>
        )
      if (s.intl_aid_count === 0)
        return <p className="text-xs text-gray-400">💰 {t('국제학생 need 지원 기록 없음 (CDS)', 'No need-based aid to intl. students (CDS)')}</p>
      return null
    }
    if (s.no_loan) return <p className="text-xs text-gray-600">💰 {t('무대출(no-loan) 지원 정책', 'No-loan aid policy')}</p>
    if (s.meets_full_need_all) return <p className="text-xs text-gray-600">💰 {t('need 100% 충족 공식 명시', 'Officially meets 100% of need')}</p>
    return null
  }

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="font-semibold text-gray-900">💰 {t('재정지원·장학금', 'Financial aid & scholarships')} <span className="ml-1 text-xs font-normal text-gray-400">{showIntl ? t('국제학생 기준', 'for international students') : t('시민권·영주권 기준', 'for citizens & permanent residents')}</span></p>

      {showIntl ? (
        <div className="mt-2 flex flex-col gap-1.5 text-sm text-gray-700">
          {s.intl_aid_count != null && s.intl_aid_avg != null && s.intl_aid_count > 0 && (
            <p>
              {t('작년 국제학생 ', 'Last year ')}<strong>{s.intl_aid_count.toLocaleString()}{t('명이 지원받음', ' intl. students received aid')}</strong>
              {' · '}{t('평균 ', 'avg ')}<strong>{money(s.intl_aid_avg)}</strong>
              {s.intl_aid_year && <span className="text-xs text-gray-400"> (CDS {s.intl_aid_year} H6)</span>}
            </p>
          )}
          {s.intl_aid_count === 0 && (
            <p className="text-gray-500">{t('CDS 기준 국제학생 need 지원 기록이 없어요 — 학비 전액 부담을 전제로 계획하세요.', 'The CDS shows no need-based aid to internationals — plan on full cost.')}</p>
          )}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {s.need_blind_intl && <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">need-blind</span>}
            {s.meets_full_need_intl && <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">{t('need 100% 충족', 'meets 100% need')}</span>}
            {s.need_blind_intl === false && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">need-aware</span>}
          </div>
          {s.merit_intl && (
            <p className="text-xs text-gray-600">🏅 {t('국제학생 지원 가능 메리트: ', 'Merit open to internationals: ')}<span className="text-gray-800">{s.merit_intl}</span></p>
          )}
          {status === null && (
            <p className="text-[11px] text-gray-400">{t('시민권·영주권자 기준 정보는 가입 시 신분에 맞게 표시돼요.', 'Citizen/PR info is shown after sign-up based on your status.')}</p>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5 text-sm text-gray-700">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {s.meets_full_need_all && <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">{t('need 100% 충족', 'meets 100% need')}</span>}
            {s.no_loan && <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">{t('무대출(no-loan)', 'no-loan')}</span>}
          </div>
          <p className="text-xs text-gray-500">{t('시민권·영주권자는 FAFSA로 연방·주정부 지원도 받을 수 있어요.', 'Citizens/PRs can also access federal and state aid via FAFSA.')}</p>
          {s.merit_note && (
            <p className="text-xs text-gray-600">🏅 {t('주요 메리트 장학금: ', 'Major merit scholarships: ')}<span className="text-gray-800">{s.merit_note}</span></p>
          )}
        </div>
      )}

      <p className="mt-2 text-[11px] text-gray-400">
        {t('금액은 학교가 공표한 CDS 기준이고 매년 달라져요 — 지원 전 공식 페이지에서 확인하세요.', 'Figures come from the school’s published CDS and change yearly — confirm on the official page before applying.')}
        {s.aid_source_url && <> <a href={s.aid_source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 페이지 ↗', 'Official page ↗')}</a></>}
      </p>
    </div>
  )
}
