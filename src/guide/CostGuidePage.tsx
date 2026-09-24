import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Pin, Check, X, AlertTriangle, Globe, Briefcase } from 'lucide-react'
import { t } from '../i18n'
import { goBack, navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import schoolsIndex from '../data/schools.index.json'
import aidData from '../data/aidRules.json'
import SchoolLogo from '../browse/SchoolLogo'
import { costRows, money, basisLabel, CostBreakdown, type CostRow } from '../browse/CostBlock'

interface IndexRow { id: number; name: string; name_ko: string | null; usnews_rank: number | null }
interface AidRule { topic: string; statement_en: string; statement_ko: string; source_url: string; source_type: string }

const nameOf = new Map((schoolsIndex as IndexRow[]).map((s) => [s.id, s]))
const rules = (aidData as { rules: AidRule[] }).rules
const MAX = Math.max(...costRows.map((r) => r.total ?? 0))

type Tab = 'cost' | 'aid'
type Sort = 'asc' | 'desc' | 'rank'
type Kind = 'all' | 'private' | 'public'

// 국제학생 1년 총비용 비교 + 재정지원 자격 (공식 출처 기반, 2026-09-24 확인, 사용자 승인)
export default function CostGuidePage({ profile }: { profile: ProfileRow | null }) {
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(window.location.search).get('tab') === 'aid' ? 'aid' : 'cost'))

  useEffect(() => {
    document.title = t('미국 대학 1년 비용 비교·국제학생 재정지원 자격 | 미국 대입 로드맵', 'US college cost per year & aid eligibility for international students | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  const tabBtn = (k: Tab, label: string) => (
    <button onClick={() => setTab(k)} className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${tab === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>{label}</button>
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="text-xl font-bold text-gray-900">{t('비용·재정지원 가이드', 'Cost & financial aid guide')}</h1>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {tabBtn('cost', t('1년 비용 비교', 'Cost per year'))}
          {tabBtn('aid', t('재정지원 자격', 'Aid eligibility'))}
        </div>
        {tab === 'cost' ? <CostTab profile={profile} /> : <AidTab profile={profile} />}
      </div>
    </div>
  )
}

function CostTab({ profile }: { profile: ProfileRow | null }) {
  const [sort, setSort] = useState<Sort>('asc')
  const [kind, setKind] = useState<Kind>('all')
  const [mine, setMine] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const targetIds = profile?.target_school_ids
  const targets = useMemo(() => targetIds ?? [], [targetIds])

  const rows = useMemo(() => {
    let r = costRows.filter((x) => x.total != null)
    if (kind !== 'all') r = r.filter((x) => (kind === 'public') === !!x.public)
    if (mine) r = r.filter((x) => targets.includes(x.id))
    const rank = (x: CostRow) => nameOf.get(x.id)?.usnews_rank ?? 999
    return [...r].sort((a, b) => sort === 'rank' ? rank(a) - rank(b) : sort === 'asc' ? a.total! - b.total! : b.total! - a.total!)
  }, [sort, kind, mine, targets])

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button onClick={onClick} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${on ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{label}</button>
  )

  return (
    <>
      <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3.5">
        <p className="text-sm font-semibold text-gray-900">{t('국제학생이 1년에 내는 정가 (학비+기숙사+식비+교재+기타)', 'What an international student pays per year, before aid')}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-700">
          {t(
            '각 대학 공식 Cost of Attendance 기준이에요. 주립대는 타주(out-of-state) 학비 기준이고, 학교가 국제학생 예산을 따로 공개하면 그 금액을 썼어요. 항공권·보험은 학교마다 포함 여부가 달라요.',
            'Based on each school’s official Cost of Attendance. Public universities use nonresident tuition; where a school publishes a separate international budget, we used it. Airfare and insurance are included at some schools and not others.',
          )}
        </p>
      </div>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1">
        {chip(sort === 'asc', t('낮은 순', 'Lowest'), () => setSort('asc'))}
        {chip(sort === 'desc', t('높은 순', 'Highest'), () => setSort('desc'))}
        {chip(sort === 'rank', t('순위 순', 'By rank'), () => setSort('rank'))}
        <span className="mx-1 w-px shrink-0 bg-gray-200" />
        {chip(kind === 'all', t('전체', 'All'), () => setKind('all'))}
        {chip(kind === 'private', t('사립', 'Private'), () => setKind('private'))}
        {chip(kind === 'public', t('주립', 'Public'), () => setKind('public'))}
        {targets.length > 0 && (
          <>
            <span className="mx-1 w-px shrink-0 bg-gray-200" />
            {chip(mine, t('내 목표 학교만', 'My targets'), () => setMine((v) => !v))}
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">{t(`${rows.length}개 학교`, `${rows.length} schools`)}</p>
      <div className="mt-1.5 flex flex-col gap-2">
        {rows.map((r) => {
          const s = nameOf.get(r.id)
          const name = s ? t(s.name_ko ?? s.name, s.name) : ''
          const isOpen = open === r.id
          return (
            <div key={r.id} className="rounded-xl border-2 border-gray-200 bg-white">
              <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                <SchoolLogo schoolId={r.id} name={s?.name ?? ''} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{money(r.total!)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((r.total! / MAX) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">{r.public ? t('주립', 'Public') : t('사립', 'Private')} · {r.year} · {basisLabel(r.basis)}</p>
                </div>
                <ChevronDown size={16} className={`shrink-0 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-3.5 py-3">
                  <CostBreakdown r={r} />
                  {r.basis === 'after_scholarship' && <p className="mt-2 text-[11px] text-gray-500">{t('Cooper Union은 모든 학부생에게 반액 학비 장학금을 줘요 — 이를 반영한 금액이에요.', 'Cooper Union gives every undergraduate a half-tuition scholarship — this figure reflects it.')}</p>}
                  {r.basis === 'off_campus' && <p className="mt-2 text-[11px] text-gray-500">{t('SAIC는 기숙사 거주 예산을 따로 공개하지 않아 기숙사 밖 거주 기준이에요.', 'SAIC doesn’t publish an on-campus budget, so this is the off-campus figure.')}</p>}
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a>
                    {s && <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="text-blue-600 underline">{t('학교 상세 →', 'School details →')}</button>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {rows.length === 0 && <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500 ring-1 ring-gray-200">{t('조건에 맞는 학교가 없어요.', 'No schools match.')}</p>}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        <Pin size={12} strokeWidth={2} className="mr-1 inline -mt-0.5" />
        {t('표시 금액은 장학금 전 정가예요. 실제 부담액은 장학금으로 크게 달라지고, 학비는 해마다 올라요. 지원 전에 학교 공식 페이지에서 꼭 다시 확인하세요.', 'Figures are sticker prices before aid. What you actually pay can differ a lot with aid, and costs rise every year. Always re-check the school’s official page before applying.')}
      </p>
    </>
  )
}

type Mark = 'yes' | 'no' | 'maybe'
interface AidRow { ko: string; en: string; intl: [Mark, string, string]; citizen: [Mark, string, string]; src: string[] }

// 신분별 재정지원 가능 여부 — 각 칸의 근거는 aidRules.json 의 공식 출처
const AID_ROWS: AidRow[] = [
  {
    ko: '연방 지원 (Pell Grant·Federal Work-Study·Direct Loan)', en: 'Federal aid (Pell Grant, Federal Work-Study, Direct Loans)',
    intl: ['no', 'F-1·J-1 비자 학생은 대상이 아니에요', 'Not available to F-1 or J-1 visa students'],
    citizen: ['yes', 'FAFSA로 신청 · 유효한 SSN 필요', 'Apply via FAFSA · valid SSN required'],
    src: ['federal_aid_citizenship', 'federal_aid_f1_j1_ineligible', 'fafsa_purpose'],
  },
  {
    ko: '주 정부 지원 (State grant)', en: 'State aid (state grants)',
    intl: ['no', '주 거주자 요건을 채우기 어려워요', 'State residency rules make this very unlikely'],
    citizen: ['maybe', '주마다 거주 요건이 달라요 (대부분 12개월 이상 거주) — 한국에 살면 해당 안 될 수 있어요', 'Residency rules vary by state (usually 12+ months) — living in Korea may not qualify'],
    src: ['state_aid_residency', 'state_aid_source'],
  },
  {
    ko: '학교 자체 장학금·보조금 (Institutional aid)', en: 'Institutional grants & scholarships',
    intl: ['maybe', '학교마다 달라요 — 국제학생에게 주는 학교도 있지만 need-aware 심사가 많아요', 'Varies by school — some offer it, but many review international aid requests need-aware'],
    citizen: ['yes', '대부분 학교에서 신청 가능', 'Available at most schools'],
    src: ['institutional_aid', 'institutional_aid_noncitizens', 'college_example_penn'],
  },
  {
    ko: '신청 서류', en: 'Application forms',
    intl: ['maybe', 'CSS Profile(자국 통화로 입력 가능) 또는 학교에 따라 ISFAA', 'CSS Profile (can use home currency) or ISFAA at some schools'],
    citizen: ['yes', 'FAFSA + 학교가 요구하면 CSS Profile', 'FAFSA, plus CSS Profile if the school requires it'],
    src: ['css_profile_purpose', 'css_profile_international', 'isfaa'],
  },
  {
    ko: '교내 아르바이트', en: 'On-campus jobs',
    intl: ['yes', '학기 중 주 20시간까지, 방학엔 풀타임 가능 (F-1)', 'Up to 20 hrs/week in term, full-time on breaks (F-1)'],
    citizen: ['yes', '제한 없음 (Federal Work-Study 포함)', 'No restriction (incl. Federal Work-Study)'],
    src: ['f1_on_campus_work'],
  },
  {
    ko: '교외 아르바이트', en: 'Off-campus jobs',
    intl: ['no', '별도 허가 없이는 불가 — 허가 없이 일하면 비자 신분이 종료돼요', 'Not without separate authorization — unauthorized work ends your status'],
    citizen: ['yes', '제한 없음', 'No restriction'],
    src: ['f1_off_campus_work', 'f1_unauthorized_work'],
  },
]

function MarkIcon({ m }: { m: Mark }) {
  if (m === 'yes') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14} strokeWidth={2.6} /></span>
  if (m === 'no') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700"><X size={14} strokeWidth={2.6} /></span>
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle size={13} strokeWidth={2.4} /></span>
}

function AidTab({ profile }: { profile: ProfileRow | null }) {
  const [who, setWho] = useState<'intl' | 'citizen'>(profile?.applicant_status === 'domestic' ? 'citizen' : 'intl')
  const [showSrc, setShowSrc] = useState(false)

  const whoBtn = (k: 'intl' | 'citizen', label: string) => (
    <button onClick={() => setWho(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${who === k ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{label}</button>
  )
  const usedTopics = new Set(AID_ROWS.flatMap((r) => r.src))

  return (
    <>
      <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3.5">
        <p className="text-sm font-semibold text-gray-900">{t('사실이에요: 연방·주 정부 지원은 시민권자·영주권자 중심이에요', 'True: federal and state aid are mainly for citizens and permanent residents')}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-700">
          {t(
            '미국 교육부 기준으로 연방 학자금은 시민권자와 영주권자 등 "자격 있는 비시민권자"만 받을 수 있어요. F-1 학생비자로 가는 국제학생은 대상이 아니에요. 대신 국제학생은 학교가 자체 재원으로 주는 장학금에 기대야 하고, 그래서 학교마다 차이가 커요.',
            'Per the U.S. Department of Education, federal student aid is limited to citizens and “eligible noncitizens” such as permanent residents. International students on F-1 visas are not eligible, so they rely on each school’s own funds — which is why policies differ so much by school.',
          )}
        </p>
      </div>

      <p className="mt-5 text-sm font-semibold text-gray-900">{t('내 신분', 'My status')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {whoBtn('intl', t('국제학생 (F-1 비자)', 'International (F-1)'))}
        {whoBtn('citizen', t('미국 시민권·영주권자', 'U.S. citizen / permanent resident'))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {AID_ROWS.map((r) => {
          const [m, ko, en] = who === 'intl' ? r.intl : r.citizen
          return (
            <div key={r.en} className="flex items-start gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
              <MarkIcon m={m} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{t(r.ko, r.en)}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{t(ko, en)}</p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><MarkIcon m="yes" />{t('가능', 'Yes')}</span>
        <span className="inline-flex items-center gap-1"><MarkIcon m="maybe" />{t('조건부·학교마다 다름', 'Depends')}</span>
        <span className="inline-flex items-center gap-1"><MarkIcon m="no" />{t('불가', 'No')}</span>
      </p>

      {/* 한국 거주 미국 시민권자 — 국제학교에 많은 경우 */}
      <div className="mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Globe size={16} strokeWidth={2} className="text-blue-600" />{t('한국에 사는 미국 시민권·영주권자라면', 'U.S. citizen or green-card holder living in Korea?')}</p>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-gray-700">
          <li>{t('해외에 살아도 FAFSA를 낼 수 있어요 — 거주 주 항목에서 "Foreign Country"를 고르면 돼요.', 'You can file the FAFSA from abroad — choose “Foreign Country” for state of residence.')}</li>
          <li>{t('스탠퍼드·존스홉킨스처럼 해외 거주 시민권자·영주권자를 국내 지원자로 보고 need-blind로 심사하는 학교가 있어요.', 'Some schools, such as Stanford and Johns Hopkins, treat citizens and permanent residents abroad as domestic applicants and review them need-blind.')}</li>
          <li>{t('2026-27학년도부터는 해외 근로소득 공제(Foreign Earned Income Exclusion)로 뺀 금액도 Pell Grant 판정 소득에 다시 더해져요 — 해외 소득이 있는 가정은 Pell Grant를 받기 어려워질 수 있어요.', 'From 2026-27, income excluded under the Foreign Earned Income Exclusion is added back for Pell Grant eligibility — families with income abroad may find Pell harder to get.')}</li>
          <li>{t('온보딩에서 지원 신분을 "시민권·영주권"으로 골라야 학교별 재정지원 안내가 맞게 나와요.', 'Pick “Citizen / permanent resident” in onboarding so school aid info matches your status.')}</li>
        </ul>
      </div>

      {who === 'intl' && (
        <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><Briefcase size={16} strokeWidth={2} className="text-blue-600" />{t('국제학생이 알아둘 것', 'What international students should know')}</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-gray-700">
            <li>{t('재정지원을 신청하면 합격 심사에 영향을 줄 수 있는 학교(need-aware)가 많아요. 학교 상세 페이지의 need-blind 여부를 확인하세요.', 'At many schools (need-aware), applying for aid can affect admission. Check need-blind status on each school page.')}</li>
          </ul>
        </div>
      )}

      <button onClick={() => setShowSrc((v) => !v)} className="mt-5 flex items-center gap-1 text-sm font-semibold text-gray-900">
        {t('공식 근거 보기', 'Official sources')} <ChevronDown size={16} className={showSrc ? 'rotate-180' : ''} />
      </button>
      {showSrc && (
        <div className="mt-2 flex flex-col gap-2">
          {rules.filter((r) => usedTopics.has(r.topic) || r.topic.startsWith('college_example') || r.topic.startsWith('us_citizens')).map((r) => (
            <div key={r.topic} className="rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200">
              <p className="text-sm leading-relaxed text-gray-800">{t(r.statement_ko, r.statement_en)}</p>
              <a href={r.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-[11px] text-blue-600 underline">{new URL(r.source_url).hostname} ↗</a>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
        <Pin size={12} strokeWidth={2} className="mr-1 inline -mt-0.5" />
        {t('일반 안내예요 — 비자·신분 상황은 사람마다 달라요. 정책은 해마다 바뀌니 시즌마다 학교 재정지원처(Financial Aid Office)에 다시 확인하세요.', 'General information only — visa and status situations differ. Policies change yearly, so re-check with each school’s financial aid office every season.')}
      </p>
    </>
  )
}
