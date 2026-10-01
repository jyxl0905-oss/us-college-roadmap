import { useEffect, useMemo, useState } from 'react'
import { Music, Check, ExternalLink, ChevronDown } from 'lucide-react'
import { t, getLang } from '../i18n'
import { goBack, navigate, slugify } from '../lib/router'
import type { ProfileRow } from '../lib/profile'
import VerifiedBadge from '../ui/VerifiedBadge'
import SchoolLogo from '../browse/SchoolLogo'
import { timingLabel } from '../lib/academics'
import data from '../data/music-schools.json'
import schoolsIndex from '../data/schools.index.json'

// 음악 학교·오디션 가이드 — 음악 전문학교 + 대학 안 음대, 각 학교 공식 페이지 기준 (사용자 승인 2026-10-01)
export interface MusicSchool {
  key: string; school_id: number | null; school_name: string; program_name: string; name_ko: string
  type: 'conservatory' | 'university_school'; city: string | null; state: string | null; website: string | null
  degrees: string[] | null; areas: string[] | null; platform: string | null; dual_admission: boolean | null
  app_deadline: string | null; early_option: string | null; prescreen: 'required' | 'some_areas' | 'none' | null; prescreen_deadline: string | null
  audition: 'in_person' | 'recorded_ok' | 'both' | null; audition_window: string | null
  test_policy: string | null; toefl_min: number | null; ielts_min: number | null; duolingo_min: number | null
  cost_per_year: number | null; cost_note: string | null; cost_basis: 'tuition' | 'coa' | 'net'
  audition_note: [string, string]; english_note: [string, string] | null; aid: [string, string] | null; known: [string, string]
  accept_rate: number | null; rate_scope: 'program' | 'school' | 'school_all' | null
}
export const musicSchools = (data as unknown as { verified_at: string; schools: MusicSchool[] }).schools
const schoolCount = new Set(musicSchools.map((s) => s.school_name)).size // NYU는 과정 2개라 학교 수는 따로 셈
const verifiedAt = (data as { verified_at: string }).verified_at
const slugById = new Map((schoolsIndex as { id: number; name: string }[]).map((s) => [s.id, slugify(s.name)]))

const AREA: Record<string, [string, string]> = {
  classical_performance: ['클래식 연주', 'Classical performance'], voice_opera: ['성악·오페라', 'Voice & opera'], jazz: ['재즈', 'Jazz'], composition: ['작곡', 'Composition'],
  music_production_tech: ['음악 프로덕션·테크', 'Production & tech'], music_business: ['음악 비즈니스', 'Music business'], music_education: ['음악 교육', 'Music education'],
  musical_theatre: ['뮤지컬', 'Musical theatre'], songwriting_contemporary: ['송라이팅·대중음악', 'Songwriting & contemporary'], conducting: ['지휘', 'Conducting'],
  music_therapy: ['음악 치료', 'Music therapy'], ethnomusicology_musicology: ['음악학', 'Musicology'],
}
const AUD: Record<string, [string, string]> = { in_person: ['현장 오디션만', 'In person only'], recorded_ok: ['영상 오디션 가능', 'Recorded OK'], both: ['현장·영상 중 선택', 'In person or recorded'] }
const PRE: Record<string, [string, string]> = { required: ['프리스크린 필수', 'Prescreen required'], some_areas: ['일부 전공 프리스크린', 'Prescreen for some areas'], none: ['프리스크린 없음', 'No prescreen'] }
const TP: Record<string, [string, string]> = { 'test-required': ['SAT·ACT 필수', 'SAT/ACT required'], 'test-optional': ['SAT·ACT 선택', 'SAT/ACT optional'], 'test-free': ['SAT·ACT 미반영', 'SAT/ACT not used'] }
const L = (p?: [string, string]) => (p ? t(p[0], p[1]) : '')
const money = (n: number) => `$${n.toLocaleString('en-US')}`

export function costLine(s: MusicSchool): string | null {
  if (s.cost_per_year === null) return null
  if (s.cost_per_year === 0) return t('학비 무료 (생활비 별도)', 'Tuition-free (living costs extra)')
  const basis = s.cost_basis === 'tuition' ? t('학비', 'tuition') : s.cost_basis === 'net' ? t('모든 학생 실부담', 'net price for every student') : t('총비용(생활비 포함)', 'total cost of attendance')
  return t(`연 ${money(s.cost_per_year)} · ${basis}`, `${money(s.cost_per_year)}/yr · ${basis}`)
}
export function rateLine(s: MusicSchool): string | null {
  if (s.accept_rate === null || !s.rate_scope) return null
  const scope = s.rate_scope === 'program' ? t('음악원 지원자 기준', 'music applicants') : s.rate_scope === 'school_all' ? t('학교 전체(무용·연극 포함)', 'whole school incl. dance & drama') : t('학교 전체', 'whole school')
  return t(`합격률 ${s.accept_rate}% (${scope})`, `Admit rate ${s.accept_rate}% (${scope})`)
}

export function MusicSchoolCard({ s, defaultOpen = false }: { s: MusicSchool; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const slug = s.school_id ? slugById.get(s.school_id) : undefined
  const eng = [s.toefl_min && `TOEFL ${s.toefl_min}`, s.ielts_min && `IELTS ${s.ielts_min}`, s.duolingo_min && `Duolingo ${s.duolingo_min}`].filter(Boolean).join(' · ')
  return (
    <article id={`music-${s.key}`} className="scroll-mt-20 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        {s.school_id ? <SchoolLogo schoolId={s.school_id} name={s.school_name} size={32} /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Music size={17} /></span>}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-snug text-gray-900">{getLang() === 'ko' ? s.name_ko : s.program_name}</h3>
          <p className="text-[12px] text-gray-500">{getLang() === 'ko' ? s.program_name : s.school_name}{s.city ? ` · ${s.city}, ${s.state}` : ''}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.type === 'conservatory' ? 'bg-violet-100 text-violet-800' : 'bg-blue-50 text-blue-800'}`}>{s.type === 'conservatory' ? t('전문학교', 'Conservatory') : t('대학 안 음대', 'University school')}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1 text-[11px] font-semibold">
        {s.app_deadline && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{t(`마감 ${s.app_deadline}`, `Deadline ${timingLabel(s.app_deadline)}`)}</span>}
        {s.prescreen && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{L(PRE[s.prescreen])}{s.prescreen !== 'none' && s.prescreen_deadline ? ` · ${getLang() === 'ko' ? s.prescreen_deadline : timingLabel(s.prescreen_deadline)}` : ''}</span>}
        {s.audition && <span className={`rounded-full px-2 py-0.5 ${s.audition === 'in_person' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>{L(AUD[s.audition])}</span>}
        {s.dual_admission && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">{t('대학+음대 둘 다 합격 필요', 'Admit by both university & music school')}</span>}
        {s.early_option && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{t('조기 지원 있음', 'Early option')}</span>}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-700">{t(s.known[0], s.known[1])}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(s.areas ?? []).map((a) => <span key={a} className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-800">{L(AREA[a])}</span>)}
      </div>
      <button onClick={() => setOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600">
        {open ? t('접기', 'Less') : t('오디션·영어·비용·장학금 보기', 'Audition, English, cost & aid')}<ChevronDown size={13} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <dl className="mt-2 space-y-2 border-t border-gray-100 pt-2.5 text-[13px] leading-relaxed">
          <div><dt className="font-semibold text-gray-900">{t('오디션', 'Audition')}{s.audition_window ? ` · ${s.audition_window}` : ''}</dt><dd className="text-gray-700">{t(s.audition_note[0], s.audition_note[1])}</dd></div>
          {s.platform && <div><dt className="font-semibold text-gray-900">{t('지원 방식', 'How to apply')}</dt><dd className="text-gray-700">{s.platform}{s.early_option ? ` · ${s.early_option}` : ''}{s.degrees?.length ? ` · ${s.degrees.join(', ')}` : ''}</dd></div>}
          <div><dt className="font-semibold text-gray-900">{t('시험·영어', 'Tests & English')}</dt><dd className="text-gray-700">{[s.test_policy && L(TP[s.test_policy]), eng && t(`최소 ${eng}`, `Minimum ${eng}`)].filter(Boolean).join(' · ') || '—'}{s.english_note ? ` — ${t(s.english_note[0], s.english_note[1])}` : ''}</dd></div>
          {(costLine(s) || rateLine(s)) && <div><dt className="font-semibold text-gray-900">{t('비용·합격률', 'Cost & admit rate')}</dt><dd className="text-gray-700">{[costLine(s), rateLine(s)].filter(Boolean).join(' · ')}</dd></div>}
          {s.aid && <div><dt className="font-semibold text-gray-900">{t('국제학생 장학금', 'Aid for internationals')}</dt><dd className="text-gray-700">{t(s.aid[0], s.aid[1])}</dd></div>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[12px] font-semibold">
            {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 underline">{t('공식 입학 안내', 'Official admissions')}<ExternalLink size={11} /></a>}
            {slug && <button onClick={() => navigate(`/schools/${slug}`)} className="text-gray-600 underline">{t('대학 상세 보기', 'University details')}</button>}
          </div>
        </dl>
      )}
    </article>
  )
}

type TypeF = 'all' | 'conservatory' | 'university_school'
export default function MusicSchoolsPage({ profile }: { profile: ProfileRow | null }) {
  const [type, setType] = useState<TypeF>('all')
  const [area, setArea] = useState('all')
  const [recorded, setRecorded] = useState(false)
  const [single, setSingle] = useState(false)

  useEffect(() => {
    document.title = t('미국 음대·음악원 지원 가이드 — 오디션·프리스크린·마감 | 미국 대입 로드맵', 'U.S. music schools & conservatories — auditions, prescreens, deadlines | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])

  // 추천 카드에서 /guide/music#music-키 로 오면 그 학교로 스크롤
  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (h.startsWith('music-')) window.setTimeout(() => document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [])

  const targets = new Set(profile?.target_mode === 'schools' ? profile.target_school_ids : [])
  const list = useMemo(() => musicSchools
    .filter((s) => (type === 'all' || s.type === type) && (area === 'all' || (s.areas ?? []).includes(area)) && (!recorded || s.audition === 'both' || s.audition === 'recorded_ok') && (!single || s.dual_admission !== true))
    .sort((a, b) => Number(!!(b.school_id && targets.has(b.school_id))) - Number(!!(a.school_id && targets.has(a.school_id)))),
  [type, area, recorded, single]) // eslint-disable-line react-hooks/exhaustive-deps
  const areaCount = (a: string) => musicSchools.filter((s) => (s.areas ?? []).includes(a)).length
  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} onClick={onClick} aria-pressed={on} className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-semibold ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
      {on && <Check size={12} strokeWidth={2.5} />}{label}
    </button>
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><Music size={21} strokeWidth={2} />{t('음악 학교·오디션 가이드', 'Music schools & auditions')}</h1>
        </div>
        <VerifiedBadge className="mt-3" date={verifiedAt} sources={t('각 학교 공식 입학·음악원 페이지 · College Scorecard', 'Official admissions & conservatory pages · College Scorecard')} />
        <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
          {t(`음악 전공은 원서와 별개로 프리스크린 영상과 오디션이 핵심이에요. 음악 전문학교와 대학 안 음대 ${schoolCount}곳(${musicSchools.length}개 과정)의 2027년 가을 입학 기준 마감·오디션 방식·영어 기준·비용을 정리했어요.`, `For music majors, the prescreen video and audition matter as much as the application. Deadlines, audition formats, English rules and costs for fall 2027 at ${schoolCount} conservatories and university music schools (${musicSchools.length} programs).`)}
        </p>
        <div className="mt-3 rounded-xl bg-violet-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-violet-900">
          <p className="font-semibold">{t('알아두면 좋은 점', 'Good to know')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>{t('대부분 12월 초까지 원서와 프리스크린 영상을 함께 내야 해요 — 일반 지원(RD)보다 한 달쯤 빨라요.', 'Most schools want the application and prescreen video by early December — about a month before regular decision.')}</li>
            <li>{t('대학 안 음대는 대학 입학 심사와 음대 오디션을 둘 다 통과해야 하는 곳이 많아요.', 'Many university music schools require admission by both the university and the music school.')}</li>
            <li>{t('현장 오디션만 받는 학교는 2~3월에 미국에 가야 해요. 영상·화상 오디션이 되는지 먼저 확인하세요.', 'Schools with in-person-only auditions mean a U.S. trip in February–March — check for recorded or virtual options first.')}</li>
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {chip(type === 'all', t('전체', 'All'), () => setType('all'))}
            {chip(type === 'conservatory', t('음악 전문학교', 'Conservatories'), () => setType('conservatory'))}
            {chip(type === 'university_school', t('대학 안 음대', 'University music schools'), () => setType('university_school'))}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-lg border-2 border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700">
              <option value="all">{t('전공 분야 전체', 'Any area')}</option>
              {Object.keys(AREA).filter((a) => areaCount(a) > 0).sort((a, b) => areaCount(b) - areaCount(a)).map((a) => <option key={a} value={a}>{L(AREA[a])} ({areaCount(a)})</option>)}
            </select>
            {chip(recorded, t('영상·화상 오디션 가능', 'Recorded/virtual OK'), () => setRecorded((v) => !v))}
            {chip(single, t('음대만 합격하면 되는 곳', 'Music-school admit only'), () => setSingle((v) => !v))}
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-gray-900">{t(`${list.length}개 과정`, `${list.length} program${list.length === 1 ? '' : 's'}`)}</p>
        <div className="mt-2 flex flex-col gap-2.5">
          {list.map((s) => <MusicSchoolCard key={s.key} s={s} />)}
          {list.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{t('조건에 맞는 학교가 없어요.', 'No schools match.')}</p>}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
          {t('대학 안 음대는 음대만의 합격률이 공개되지 않아 표시하지 않았어요(대학 전체 합격률과 달라요). 오디션 날짜·요구 곡목은 악기마다 다르니 지원 전에 각 학교 페이지에서 꼭 확인하세요.', 'University music schools don’t publish music-only admit rates, so none are shown (they differ from university-wide rates). Audition dates and repertoire vary by instrument — confirm on each school’s page.')}
        </p>
      </div>
    </div>
  )
}
