import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ExternalLink, Receipt } from 'lucide-react'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { loadEnglish, type EnglishReq } from '../browse/EnglishBlock'
import { loadUsData } from '../browse/UsStudentBlock'
import { t, getLang } from '../i18n'
import SchoolLogo from '../browse/SchoolLogo'

// 원서 총비용 계산기 — 목표 학교를 직접 고른 경우만. 원서비(학교 공식 페이지·CDS)와 점수 송부·CSS Profile 요금(각 시험 기관 공식)을
// 더해서 보여줌. 시험 응시료와 환율은 넣지 않음(값이 바뀌거나 사람마다 다름)
export interface FeeRow {
  id: number
  fee: number | null // 국제학생이 내는 원서비
  fee_dom: number | null // 국내 지원자 원서비가 다를 때만
  wv: 'yes' | 'no' | 'conditional' | null // 국제학생 원서비 면제
  wv_ko: string | null
  wv_en: string | null
  sr: boolean | null // SAT·ACT 자기 보고 허용 (공식 성적표는 등록 때만)
  eng: boolean | null // 영어 시험 공식 성적표를 지원 때 보내야 함
  src: string | null
}
interface Global {
  sat_send: number; sat_free: number; sat_free_days: number
  toefl_send: number; toefl_free: number
  css_first: number; css_add: number
  sources: { label: string; url: string }[]
}
interface FeeData { verified_at: string; global: Global; schools: FeeRow[] }
let cache: Promise<FeeData> | null = null
export const loadFees = () => (cache ??= import('../data/app-fees.json').then((m) => m.default as unknown as FeeData))

type Eng = 'toefl' | 'ielts' | 'det' | 'none'
const usd = (n: number) => `$${n.toLocaleString('en-US')}`

export default function AppFeeCalculator({ profile, schools }: { profile: ProfileRow; schools: School[] }) {
  const intl = profile.applicant_status !== 'domestic'
  const [data, setData] = useState<FeeData | null>(null)
  const [eng, setEng] = useState<Map<number, EnglishReq>>(new Map())
  const [css, setCss] = useState<Map<number, { css_intl: boolean; css_domestic: boolean }>>(new Map())
  const [off, setOff] = useState<Set<number>>(new Set()) // 계산에서 뺀 학교
  const [sendTests, setSendTests] = useState(profile.sat_status === 'taken' || schools.some((s) => s.test_policy === 'test-required'))
  const [satFree, setSatFree] = useState(false) // 시험 접수 때 무료 송부 4곳 지정
  const [engTest, setEngTest] = useState<Eng>(intl ? 'toefl' : 'none')
  const [toeflFree, setToeflFree] = useState(false)
  const [aid, setAid] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    void loadFees().then(setData)
    void loadEnglish().then(setEng)
    void loadUsData().then((u) => setCss(new Map(u.schools.map((r) => [r.id, { css_intl: r.css_intl, css_domestic: r.css_domestic }]))))
  }, [])

  const rows = useMemo(() => new Map((data?.schools ?? []).map((r) => [r.id, r])), [data])
  const sorted = useMemo(() => [...schools].sort((a, b) => (a.usnews_rank ?? 999) - (b.usnews_rank ?? 999)), [schools])

  if (!data) return <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-6 text-sm text-gray-400">{t('불러오는 중…', 'Loading…')}</div>
  const g = data.global
  const on = sorted.filter((s) => !off.has(s.id))
  const feeOf = (s: School) => {
    const r = rows.get(s.id)
    if (!r || r.fee === null) return null
    return intl ? r.fee : r.fee_dom ?? r.fee
  }

  // 1) 원서비
  const known = on.filter((s) => feeOf(s) !== null)
  const unknown = on.length - known.length
  const appTotal = known.reduce((a, s) => a + (feeOf(s) ?? 0), 0)

  // 2) SAT·ACT 공식 송부 — 자기 보고를 안 받는 학교만 지원 때 필요(확인 안 된 곳은 필요한 것으로 계산), 시험 안 보는 학교 제외
  const testSchools = sendTests ? on.filter((s) => s.test_policy !== 'test-free' && rows.get(s.id)?.sr !== true) : []
  const testUnclear = testSchools.filter((s) => (rows.get(s.id)?.sr ?? null) === null).length
  const satPaid = Math.max(0, testSchools.length - (satFree ? g.sat_free : 0))
  const satTotal = satPaid * g.sat_send
  const selfReportCount = sendTests ? on.filter((s) => s.test_policy !== 'test-free' && rows.get(s.id)?.sr === true).length : 0

  // 3) 영어 시험 송부 (국제학생) — 요구하지 않는 학교·자기 보고 받는 학교 제외
  const engSchools = intl && engTest !== 'none'
    ? on.filter((s) => eng.get(s.id)?.requirement !== 'not_required' && rows.get(s.id)?.eng !== false)
    : []
  const toeflPaid = engTest === 'toefl' ? Math.max(0, engSchools.length - (toeflFree ? g.toefl_free : 0)) : 0
  const engTotal = toeflPaid * g.toefl_send

  // 4) CSS Profile (재정지원 신청 시)
  const cssSchools = aid ? on.filter((s) => (intl ? css.get(s.id)?.css_intl : css.get(s.id)?.css_domestic)) : []
  const cssTotal = cssSchools.length ? g.css_first + g.css_add * (cssSchools.length - 1) : 0

  const total = appTotal + satTotal + engTotal + cssTotal
  const toggle = (id: number) => setOff((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ko = getLang() === 'ko'

  const line = (label: string, amount: number, sub?: string | null) => (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0"><p className="text-sm text-gray-700">{label}</p>{sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}</div>
      <p className="shrink-0 text-sm font-semibold text-gray-900">{usd(amount)}</p>
    </div>
  )
  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button key={label} onClick={onClick} className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>{label}</button>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* 합계 */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900"><Receipt size={16} strokeWidth={2} />{t('예상 원서 비용', 'Estimated application cost')}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">{usd(total)}</p>
        <p className="mt-1 text-xs text-gray-500">
          {t(`${on.length}개 학교 기준`, `For ${on.length} schools`)}
          {unknown > 0 && t(` · 원서비를 확인 못 한 ${unknown}곳은 빠져 있어요`, ` · ${unknown} school(s) with no confirmed fee are not included`)}
        </p>
        <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
          {line(t('원서비', 'Application fees'), appTotal, t(`${known.length}곳 · Common App 자체는 무료`, `${known.length} schools · the Common App itself is free`))}
          {sendTests && line(t('SAT 점수 송부', 'SAT score reports'), satTotal,
            testSchools.length === 0
              ? t('지원 때 공식 성적표가 필요한 학교가 없어요', 'No school needs an official report at application')
              : t(`공식 송부 ${testSchools.length}곳${satFree ? ` (무료 ${Math.min(g.sat_free, testSchools.length)}곳)` : ''} × $${g.sat_send}`, `${testSchools.length} official report(s)${satFree ? ` (${Math.min(g.sat_free, testSchools.length)} free)` : ''} × $${g.sat_send}`))}
          {intl && engTest !== 'none' && line(
            engTest === 'toefl' ? t('TOEFL 점수 송부', 'TOEFL score reports') : engTest === 'ielts' ? t('IELTS 점수 송부', 'IELTS score reports') : t('Duolingo 점수 송부', 'Duolingo score sharing'),
            engTotal,
            engTest === 'toefl'
              ? t(`${engSchools.length}곳${toeflFree ? ` (무료 ${Math.min(g.toefl_free, engSchools.length)}곳)` : ''} × $${g.toefl_send}`, `${engSchools.length} report(s)${toeflFree ? ` (${Math.min(g.toefl_free, engSchools.length)} free)` : ''} × $${g.toefl_send}`)
              : engTest === 'ielts'
                ? t(`${engSchools.length}곳 · 온라인(e-delivery) 송부는 무료`, `${engSchools.length} schools · e-delivery is free`)
                : t(`${engSchools.length}곳 · 점수 공유 무제한 무료`, `${engSchools.length} schools · unlimited free sharing`))}
          {aid && line(t('CSS Profile', 'CSS Profile'), cssTotal,
            cssSchools.length ? t(`${cssSchools.length}곳 · 첫 학교 $${g.css_first}, 추가 $${g.css_add}씩`, `${cssSchools.length} schools · $${g.css_first} first, $${g.css_add} each extra`) : t('목표 학교 중 CSS Profile을 받는 곳이 없어요', 'None of your schools use the CSS Profile'))}
        </div>
      </div>

      {/* 조건 */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
        <p className="text-sm font-bold text-gray-900">{t('내 상황에 맞추기', 'Adjust to your plan')}</p>
        <p className="mt-3 text-xs font-semibold text-gray-500">{t('SAT·ACT 점수를 내나요?', 'Sending SAT/ACT scores?')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chip(sendTests, t('낼 거예요', 'Yes'), () => setSendTests(true))}
          {chip(!sendTests, t('안 내요', 'No'), () => setSendTests(false))}
          {sendTests && chip(satFree, t(`시험 접수 때 무료 ${g.sat_free}곳 지정`, `Use ${g.sat_free} free reports`), () => setSatFree((v) => !v))}
        </div>
        {sendTests && (
          <p className="mt-1.5 text-xs text-gray-400">
            {t(`무료 송부는 시험일 후 ${g.sat_free_days}일 안에 고른 곳까지예요.`, `Free reports must be chosen within ${g.sat_free_days} days after the test.`)}
            {selfReportCount > 0 && t(` 자기 보고를 받는 ${selfReportCount}곳은 지원 때 공식 성적표가 필요 없어서 뺐어요(등록할 학교 1곳에만 나중에 보내요).`, ` ${selfReportCount} school(s) accept self-reported scores, so they're left out (you send an official report only to the school you enroll at).`)}
            {testUnclear > 0 && t(` 자기 보고 여부를 확인 못 한 ${testUnclear}곳은 공식 송부로 계산했어요.`, ` ${testUnclear} school(s) with an unconfirmed policy are counted as needing an official report.`)}
          </p>
        )}
        {intl && (
          <>
            <p className="mt-3 text-xs font-semibold text-gray-500">{t('영어 시험은 뭘 내나요?', 'Which English test?')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {chip(engTest === 'toefl', 'TOEFL', () => setEngTest('toefl'))}
              {chip(engTest === 'ielts', 'IELTS', () => setEngTest('ielts'))}
              {chip(engTest === 'det', 'Duolingo', () => setEngTest('det'))}
              {chip(engTest === 'none', t('안 내요·면제', 'None / waived'), () => setEngTest('none'))}
              {engTest === 'toefl' && chip(toeflFree, t(`무료 ${g.toefl_free}곳 지정`, `Use ${g.toefl_free} free reports`), () => setToeflFree((v) => !v))}
            </div>
            {engTest === 'toefl' && <p className="mt-1.5 text-xs text-gray-400">{t(`무료 ${g.toefl_free}곳은 시험 전날 밤 10시(현지 시각)까지 골라야 해요.`, `Pick the ${g.toefl_free} free recipients by 10 p.m. (local time) the day before the test.`)}</p>}
          </>
        )}
        <p className="mt-3 text-xs font-semibold text-gray-500">{t('재정지원(장학금)을 신청하나요?', 'Applying for financial aid?')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chip(aid, t('신청해요', 'Yes'), () => setAid(true))}
          {chip(!aid, t('안 해요', 'No'), () => setAid(false))}
        </div>
      </div>

      {/* 학교별 원서비 */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white">
        <p className="px-4 pt-3.5 text-sm font-bold text-gray-900">{t('학교별 원서비', 'Fee by school')}</p>
        <p className="px-4 text-xs text-gray-400">{t('체크를 풀면 합계에서 빠져요.', 'Uncheck a school to leave it out.')}</p>
        <ul className="mt-2 divide-y divide-gray-100">
          {sorted.map((s) => {
            const r = rows.get(s.id)
            const fee = feeOf(s)
            const wvNote = r ? (ko ? r.wv_ko : r.wv_en) : null
            const expanded = open === s.id
            return (
              <li key={s.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <input type="checkbox" checked={!off.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 shrink-0 accent-gray-900" aria-label={s.name} />
                  <SchoolLogo schoolId={s.id} name={s.name} size={24} />
                  <button onClick={() => setOpen(expanded ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                    <span className={`truncate text-sm ${off.has(s.id) ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{ko ? s.name_ko ?? s.name : s.name}</span>
                    {r?.wv === 'yes' && <span className="shrink-0 rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">{t('면제 가능', 'Waiver')}</span>}
                    {r?.wv === 'conditional' && <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{t('조건부 면제', 'Waiver (conditions)')}</span>}
                    <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  <span className={`shrink-0 text-sm font-semibold ${fee === null ? 'text-gray-400' : 'text-gray-900'}`}>{fee === null ? t('확인 필요', 'Check') : fee === 0 ? t('무료', 'Free') : usd(fee)}</span>
                </div>
                {expanded && (
                  <div className="mt-2 ml-[3.25rem] space-y-1 text-xs text-gray-500">
                    {intl && r?.fee_dom != null && r.fee !== null && r.fee_dom !== r.fee && <p>{t(`국제학생 원서비가 따로 있어요 (국내 지원자 ${usd(r.fee_dom)}).`, `International applicants pay a different fee (domestic ${usd(r.fee_dom)}).`)}</p>}
                    {wvNote && <p>{wvNote}</p>}
                    {r?.wv === 'no' && intl && !wvNote && <p>{t('국제학생은 원서비 면제가 안 돼요.', 'Fee waivers are not available to international applicants.')}</p>}
                    {sendTests && s.test_policy !== 'test-free' && r?.sr === true && <p>{t('SAT·ACT 자기 보고 가능 — 공식 성적표는 등록할 때만.', 'Self-reported SAT/ACT accepted — official report only if you enroll.')}</p>}
                    {sendTests && s.test_policy !== 'test-free' && r?.sr === false && <p>{t('지원할 때 SAT·ACT 공식 성적표가 필요해요.', 'Official SAT/ACT report needed at application.')}</p>}
                    {intl && r?.eng === false && <p>{t('영어 시험은 지원 때 비공식 점수로 낼 수 있어요.', 'Unofficial English test scores are accepted at application.')}</p>}
                    {r?.src && <a href={r.src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700">{t('공식 안내', 'Official info')}<ExternalLink size={11} /></a>}
                    {!r?.src && fee === null && <p>{t('공식 페이지에서 원서비를 확인하세요.', 'Check the fee on the official page.')}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="px-1 text-xs leading-relaxed text-gray-400">
        {t('시험 응시료, 송금 수수료와 환율은 넣지 않았어요. 원서비는 학교 공식 페이지 또는 Common Data Set, 송부 요금은 각 기관 공식 안내 기준이에요. 내기 전에 원서 화면에서 최종 금액을 확인하세요.', 'Test registration fees, transfer fees and exchange rates are not included. Application fees come from each school’s official page or Common Data Set; report fees from each testing organization. Confirm the final amount on the application itself.')}
        {' '}
        {t(`확인일 ${data.verified_at}.`, `Verified ${data.verified_at}.`)}
        {' '}
        {g.sources.map((s, i) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline">{s.label}{i < g.sources.length - 1 ? ', ' : ''}</a>
        ))}
      </p>
    </div>
  )
}
