import { useEffect, useState } from 'react'
import { Landmark, ExternalLink, BadgeCheck } from 'lucide-react'
import { t, getLang } from '../i18n'
import type { ProfileRow } from '../lib/profile'

// 미국 학생(시민권·영주권) 기준 비용·성과 — College Scorecard(미 교육부), CSS Profile 목록(College Board), 주립대 자동 합격(각 대학·UC 공식)
export interface UsSchool {
  id: number; unitid: number; state: string; public: boolean
  tuition_in: number | null; tuition_out: number | null; coa: number | null
  net_price: number | null; net_by_income: (number | null)[]; npc_url: string | null
  pell_pct: number | null; grad_rate: number | null; median_debt: number | null; earnings_10yr: number | null
  css_domestic: boolean; css_intl: boolean; css_listed: boolean
}
export interface AutoAdmit { school_ids: number[]; state: string; rule_ko: string; rule_en: string; detail_ko: string; detail_en: string; source_url: string }
interface UsData { scorecard_url: string; css_year: string; css_url: string; schools: UsSchool[]; auto_admit: AutoAdmit[] }

let cache: Promise<UsData> | null = null
export const loadUsData = () => (cache ??= import('../data/usData.json').then((m) => m.default as unknown as UsData))

const usd = (n: number | null) => (n == null ? '—' : n <= 0 ? t('$0 이하', '$0 or less') : `$${n.toLocaleString('en-US')}`)
const BRACKETS = ['$0–30K', '$30–48K', '$48–75K', '$75–110K', '$110K+']

export default function UsStudentBlock({ schoolId, profile }: { schoolId: number; profile: ProfileRow | null }) {
  const [d, setD] = useState<{ s: UsSchool; auto: AutoAdmit | null; meta: UsData } | null>(null)
  useEffect(() => {
    let alive = true
    void loadUsData().then((m) => {
      const s = m.schools.find((x) => x.id === schoolId)
      if (alive && s) setD({ s, auto: m.auto_admit.find((a) => a.school_ids.includes(schoolId)) ?? null, meta: m })
    })
    return () => { alive = false }
  }, [schoolId])
  if (!d) return null
  const { s, auto, meta } = d
  const intl = profile ? profile.applicant_status !== 'domestic' : getLang() === 'ko' // 비로그인: 한국어 방문자는 국제학생으로 가정
  const myState = profile?.us_state && profile.us_state !== 'outside' ? profile.us_state : null
  const resident = myState === s.state
  const maxNet = Math.max(1, ...s.net_by_income.map((v) => v ?? 0))

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <Landmark size={18} strokeWidth={2} className="text-blue-600" />
        {t('미국 학생 기준 비용·성과', 'Cost & outcomes for U.S. students')}
        <span className="text-xs font-normal text-gray-400">{t('시민권·영주권자', 'citizens / permanent residents')}</span>
      </p>
      {intl && <p className="mt-1 text-[12px] text-gray-500">{t('아래 학비·실제 부담액은 미국 학생 기준이라 국제학생에게는 적용되지 않아요. 졸업률·졸업 후 소득은 참고할 수 있어요.', 'The tuition and net price below apply to U.S. students, not international students. Graduation and earnings figures are still useful.')}</p>}

      {s.public && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className={`rounded-lg px-3 py-2 ${resident ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
            <p className="text-[11px] font-semibold text-gray-500">{t(`주 거주자(${s.state}) 학비`, `In-state (${s.state}) tuition`)}{resident && <span className="ml-1 text-emerald-700">{t('· 내 주', '· your state')}</span>}</p>
            <p className="text-lg font-extrabold tabular-nums text-gray-900">{usd(s.tuition_in)}</p>
          </div>
          <div className={`rounded-lg px-3 py-2 ${myState && !resident ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50'}`}>
            <p className="text-[11px] font-semibold text-gray-500">{t('타주 학생 학비', 'Out-of-state tuition')}</p>
            <p className="text-lg font-extrabold tabular-nums text-gray-900">{usd(s.tuition_out)}</p>
          </div>
        </div>
      )}
      {!s.public && s.tuition_in != null && <p className="mt-2 text-sm text-gray-700">{t('학비(사립, 거주지 무관) ', 'Tuition (private, same for everyone) ')}<span className="font-bold tabular-nums">{usd(s.tuition_in)}</span></p>}
      <p className="mt-1 text-[11px] text-gray-400">{t('1년 학비·수수료, 2024-25학년도', 'One year of tuition and fees, 2024–25')}{s.coa != null && t(` · 기숙사·식비 등 포함 총비용 평균 ${usd(s.coa)}`, ` · average total cost incl. housing and food ${usd(s.coa)}`)}</p>

      {s.net_price != null && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500">{t('실제 부담액 평균 (보조금 뺀 1년 비용)', 'Average net price (yearly cost after grants)')} <span className="ml-1 text-sm font-extrabold tabular-nums text-gray-900">{usd(s.net_price)}</span></p>
          <div className="mt-1.5 flex flex-col gap-1">
            {s.net_by_income.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 shrink-0 text-gray-500">{BRACKETS[i]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(2, ((v ?? 0) / maxNet) * 100)}%` }} /></div>
                <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-gray-800">{usd(v)}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-gray-400">{t('가정 연소득 구간별 평균 — 연방 학자금을 받은 신입생 기준', 'Average by family income — first-year students receiving federal aid')}{s.public ? t(', 공립은 주 거주자 기준', '; in-state students at public schools') : ''}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
        {s.npc_url && <a href={s.npc_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 font-semibold text-white">{t('우리 집 기준으로 계산 (Net Price Calculator)', 'Estimate for your family (Net Price Calculator)')}<ExternalLink size={12} /></a>}
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
          {(intl ? s.css_intl : s.css_domestic) ? t(`재정지원 신청: FAFSA + CSS Profile (${meta.css_year})`, `Aid forms: FAFSA + CSS Profile (${meta.css_year})`) : intl ? t(`CSS Profile 국제학생 요구 목록에 없음 (${meta.css_year})`, `Not on the CSS Profile list for international students (${meta.css_year})`) : t(`재정지원 신청: FAFSA (CSS Profile 목록에 없음, ${meta.css_year})`, `Aid forms: FAFSA (not on the CSS Profile list, ${meta.css_year})`)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [s.grad_rate != null ? `${s.grad_rate}%` : '—', t('6년 내 졸업률', 'Graduate within 6 yrs')],
          [usd(s.median_debt), t('졸업생 중간 부채', 'Median debt at graduation')],
          [usd(s.earnings_10yr), t('입학 10년 후 중간 소득', 'Median earnings 10 yrs after entry')],
          [s.pell_pct != null ? `${s.pell_pct}%` : '—', t('Pell 장학금 받는 학생', 'Students with Pell Grants')],
        ].map(([n, l]) => (
          <div key={l} className="rounded-lg bg-gray-50 px-2.5 py-2">
            <p className="text-[15px] font-extrabold tabular-nums text-gray-900">{n}</p>
            <p className="text-[10.5px] leading-tight text-gray-500">{l}</p>
          </div>
        ))}
      </div>

      {auto && (
        <div className={`mt-3 rounded-lg px-3 py-2.5 ${myState === auto.state ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
          <p className="flex items-center gap-1 text-[13px] font-semibold text-gray-900"><BadgeCheck size={15} className="text-emerald-600" />{t(auto.rule_ko, auto.rule_en)}{myState === auto.state && <span className="ml-1 text-[11px] text-emerald-700">{t('· 내 주', '· your state')}</span>}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-gray-600">{t(auto.detail_ko, auto.detail_en)} <a href={auto.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a></p>
        </div>
      )}

      <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">
        {t('출처: ', 'Sources: ')}<a href={meta.scorecard_url} target="_blank" rel="noreferrer" className="underline">{t('미국 교육부 College Scorecard (2026년 6월 발표)', 'U.S. Dept. of Education College Scorecard (June 2026 release)')}</a>
        {' · '}<a href={meta.css_url} target="_blank" rel="noreferrer" className="underline">{t(`College Board CSS Profile ${meta.css_year} 참여 학교 목록`, `College Board CSS Profile ${meta.css_year} participating institutions`)}</a>
        {s.id === 138 && t(' · Parsons 수치는 The New School 전체 기준이에요.', ' · Parsons figures are for The New School as a whole.')}
      </p>
    </div>
  )
}
