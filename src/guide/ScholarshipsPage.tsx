import { useEffect, useMemo, useState } from 'react'
import { Award, Check, ExternalLink } from 'lucide-react'
import { t, getLang } from '../i18n'
import { goBack, navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { loadSchools } from '../lib/schoolsCache'
import SchoolLogo from '../browse/SchoolLogo'
import RankTag from '../browse/RankTag'
import VerifiedBadge from '../ui/VerifiedBadge'
import schData from '../data/scholarships.json'

// 국제학생 장학금 찾기 — 각 대학 공식 장학금 페이지를 요약한 설명(merit_note)에서 뽑은 구조화 값으로 필터 (사용자 승인)
// e: 국제학생 merit 대상 yes/no/unclear · p: 심사 방식 · lo/hi: 연간 금액 · full: 전액 학비 이상 가능 · test: SAT/ACT 필요 여부 · dl: 장학금 마감 · need: 국제학생 need 기반 지원
interface Row { id: number; e: 'yes' | 'no' | 'unclear'; p: 'automatic' | 'application' | 'both' | null; lo: number | null; hi: number | null; full: boolean | null; test: 'required' | 'optional' | null; dl: string | null; need: 'yes' | 'limited' | 'no' | null }
const data = schData as { verified_at: string; schools: Row[] }
const byId = new Map(data.schools.map((r) => [r.id, r]))

type Proc = 'all' | 'automatic' | 'application'
type Amt = 0 | 10000 | 20000 | 30000
type Sort = 'amount' | 'rank' | 'deadline'
const money = (n: number) => `$${n.toLocaleString('en-US')}`
// 입시 사이클 순서(9월 → 8월)로 마감 정렬
const dlOrder = (dl: string | null) => {
  const m = dl?.match(/(\d{1,2})월 (초|중순|말)/)
  if (!m) return 999
  const mo = Number(m[1])
  return ((mo + 3) % 12) * 3 + ({ 초: 0, 중순: 1, 말: 2 } as Record<string, number>)[m[2]]
}
const dlLabel = (dl: string) => {
  if (getLang() === 'ko') return dl
  const m = dl.match(/(\d{1,2})월 (초|중순|말)/)
  if (!m) return dl
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[1]) - 1]
  return `${({ 초: 'early', 중순: 'mid', 말: 'late' } as Record<string, string>)[m[2]]} ${mon}`
}

export default function ScholarshipsPage({ profile }: { profile: ProfileRow | null }) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const [proc, setProc] = useState<Proc>('all')
  const [amt, setAmt] = useState<Amt>(0)
  const [full, setFull] = useState(false)
  const [noTest, setNoTest] = useState(false)
  const [need, setNeed] = useState(false)
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState<Sort>('amount')
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [showNo, setShowNo] = useState(false)

  useEffect(() => {
    document.title = t('국제학생 장학금 찾기 — 미국 대학 merit 장학금 비교 | 미국 대입 로드맵', 'Scholarships for international students at U.S. colleges | US College Roadmap')
    void loadSchools().then(setSchools)
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const targetIds = useMemo(() => new Set(profile?.target_mode === 'schools' ? profile.target_school_ids : []), [profile])
  const all = useMemo(() => (schools ?? []).filter((s) => byId.has(s.id)), [schools])
  const eligible = all.filter((s) => byId.get(s.id)!.e === 'yes')
  const noMerit = all.filter((s) => byId.get(s.id)!.e === 'no')

  const list = eligible
    .filter((s) => {
      const r = byId.get(s.id)!
      if (proc !== 'all' && r.p !== proc && r.p !== 'both') return false
      if (amt && !((r.hi ?? 0) >= amt || r.full)) return false
      if (full && !r.full) return false
      if (noTest && r.test === 'required') return false
      if (need && !(r.need === 'yes' || r.need === 'limited' || s.meets_full_need_intl)) return false
      if (mine && !targetIds.has(s.id)) return false
      return true
    })
    .sort((a, b) => {
      const ra = byId.get(a.id)!, rb = byId.get(b.id)!
      const rank = (s: School) => (s.kind === 'lac' ? s.lac_rank : s.usnews_rank) ?? 999
      if (sort === 'rank') return rank(a) - rank(b)
      if (sort === 'deadline') return dlOrder(ra.dl) - dlOrder(rb.dl) || rank(a) - rank(b)
      const top = (r: Row) => (r.full ? 1e7 : r.hi ?? -1)
      return top(rb) - top(ra) || rank(a) - rank(b)
    })
    .sort((a, b) => Number(targetIds.has(b.id)) - Number(targetIds.has(a.id))) // 내 목표 학교를 위로

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} onClick={onClick} aria-pressed={on} className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-semibold ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
      {on && <Check size={12} strokeWidth={2.5} />}{label}
    </button>
  )
  const name = (s: School) => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name)

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><Award size={21} strokeWidth={2} />{t('국제학생 장학금 찾기', 'Scholarships for international students')}</h1>
        </div>
        <VerifiedBadge className="mt-3" date={data.verified_at} sources={t('각 대학 공식 장학금·국제학생 페이지 · CDS', 'College scholarship & international pages · CDS')} />
        <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
          {t(`국제학생이 받을 수 있는 학교 자체 장학금(merit)을 공식 페이지 기준으로 정리했어요. ${eligible.length}곳이 국제학생에게 장학금을 준다고 밝혔어요. 금액·조건은 해마다 바뀌니 지원 전에 학교 페이지에서 꼭 확인하세요.`, `College-funded merit scholarships open to international students, from each school's official pages. ${eligible.length} schools say internationals can receive them. Amounts and rules change every year — confirm on the school's page before applying.`)}
        </p>

        <div className="mt-4 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <p className="text-xs font-semibold text-gray-500">{t('심사 방식', 'How you are considered')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chip(proc === 'all', t('전체', 'All'), () => setProc('all'))}
            {chip(proc === 'automatic', t('자동 심사 (신청서 없음)', 'Automatic (no extra form)'), () => setProc('automatic'))}
            {chip(proc === 'application', t('별도 신청', 'Separate application'), () => setProc('application'))}
          </div>
          <p className="mt-3 text-xs font-semibold text-gray-500">{t('연간 최대 금액', 'Max per year')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {([0, 10000, 20000, 30000] as Amt[]).map((a) => chip(amt === a, a === 0 ? t('전체', 'Any') : `${money(a)}+`, () => setAmt(a)))}
            {chip(full, t('전액 학비 이상 가능', 'Up to full tuition+'), () => setFull((v) => !v))}
          </div>
          <p className="mt-3 text-xs font-semibold text-gray-500">{t('조건', 'Conditions')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chip(noTest, t('SAT·ACT 없이도 심사', 'No SAT/ACT needed'), () => setNoTest((v) => !v))}
            {chip(need, t('국제학생 need 기반 지원도 있음', 'Need-based aid for internationals too'), () => setNeed((v) => !v))}
            {targetIds.size > 0 && chip(mine, t('내 목표 학교만', 'My targets only'), () => setMine((v) => !v))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{t(`${list.length}곳`, `${list.length} school${list.length === 1 ? '' : 's'}`)}</p>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border-2 border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700">
            <option value="amount">{t('금액 높은 순', 'Highest amount')}</option>
            <option value="rank">{t('US News 순위순', 'US News rank')}</option>
            <option value="deadline">{t('장학금 마감 빠른 순', 'Earliest deadline')}</option>
          </select>
        </div>

        {schools === null ? (
          <p className="mt-6 text-center text-sm text-gray-400">{t('불러오는 중…', 'Loading…')}</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2.5">
            {list.map((s) => {
              const r = byId.get(s.id)!
              const isOpen = !!open[s.id]
              return (
                <div key={s.id} className={`rounded-xl border-2 bg-white px-4 py-3 ${targetIds.has(s.id) ? 'border-blue-300' : 'border-gray-200'}`}>
                  <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="flex w-full items-center gap-2.5 text-left">
                    <SchoolLogo schoolId={s.id} name={s.name} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{name(s)}</span>
                      {targetIds.has(s.id) && <span className="text-[11px] font-semibold text-blue-700">{t('내 목표 학교', 'My target')}</span>}
                    </span>
                    <RankTag s={s} className="shrink-0 text-[11px]" />
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    {(r.lo !== null || r.hi !== null) && <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-800">{t('연', '')} {r.lo !== null && r.hi !== null && r.lo !== r.hi ? `${money(r.lo)}–${money(r.hi)}` : r.hi !== null ? t(`최대 ${money(r.hi)}`, `up to ${money(r.hi)}`) : money(r.lo!)}{t('', '/yr')}</span>}
                    {r.full && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900">{t('전액 학비 이상 가능', 'Up to full tuition+')}</span>}
                    {r.p === 'automatic' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">{t('자동 심사', 'Automatic')}</span>}
                    {r.p === 'application' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{t('별도 신청', 'Apply separately')}</span>}
                    {r.p === 'both' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">{t('자동 + 별도 신청', 'Automatic + application')}</span>}
                    {r.test === 'required' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{t('SAT·ACT 필요', 'SAT/ACT needed')}</span>}
                    {r.dl && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{t(`마감 ${dlLabel(r.dl)}`, `Deadline ${dlLabel(r.dl)}`)}</span>}
                    {(r.need === 'yes' || r.need === 'limited') && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-800">{r.need === 'limited' ? t('need 지원 일부', 'Limited need aid') : t('need 지원 있음', 'Need aid too')}</span>}
                  </div>
                  {s.merit_intl && <p className="mt-2 text-[12px] font-semibold text-gray-700">{s.merit_intl}</p>}
                  {s.merit_note && (
                    <button onClick={() => setOpen((o) => ({ ...o, [s.id]: !isOpen }))} className="mt-1 w-full text-left">
                      <p className={`text-[13px] leading-relaxed text-gray-600 ${isOpen ? '' : 'line-clamp-2'}`}>{s.merit_note}</p>
                      <span className="text-[12px] font-semibold text-blue-600">{isOpen ? t('접기', 'Less') : t('자세히', 'More')}</span>
                    </button>
                  )}
                  {isOpen && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                      {s.intl_aid_count != null && s.intl_aid_count > 0 && (
                        <span className="text-gray-500">{t(`국제학생 ${s.intl_aid_count.toLocaleString()}명이 교내 장학금 수혜`, `${s.intl_aid_count.toLocaleString()} intl. students received college aid`)}{s.intl_aid_avg ? t(` · 평균 ${money(s.intl_aid_avg)}`, ` · avg ${money(s.intl_aid_avg)}`) : ''}{s.intl_aid_year ? ` (CDS ${s.intl_aid_year})` : ''}</span>
                      )}
                      {s.aid_source_url && <a href={s.aid_source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 underline">{t('공식 페이지', 'Official page')}<ExternalLink size={11} /></a>}
                    </div>
                  )}
                </div>
              )
            })}
            {list.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{t('조건에 맞는 학교가 없어요. 필터를 줄여 보세요.', 'No schools match. Try fewer filters.')}</p>}
          </div>
        )}

        {noMerit.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3">
            <button onClick={() => setShowNo((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-700">
              {t(`국제학생에게 merit 장학금이 없다고 밝힌 학교 ${noMerit.length}곳`, `${noMerit.length} schools that say internationals get no merit scholarships`)}
              <span className="text-gray-400">{showNo ? '▴' : '▾'}</span>
            </button>
            {showNo && (
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                {noMerit.map(name).join(', ')}
                <span className="mt-1 block text-[12px] text-gray-400">{t('이 중 일부는 need 기반 지원(재정 필요에 따른 지원)은 줘요 — 학교 상세의 재정지원 칸을 확인하세요.', 'Some of these still offer need-based aid — see the aid section on each school page.')}</span>
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
          {t('필터 값은 각 대학 공식 페이지 요약에서 뽑았어요. 금액이 공개되지 않았거나 조건이 복잡한 학교는 금액 칸이 비어 있을 수 있어요. 장학금을 받을 수 있다는 보장이 아니에요.', 'Filter values come from summaries of each college’s official pages. Schools that do not publish amounts may show no amount. This is not a guarantee of any award.')}
        </p>
      </div>
    </div>
  )
}
