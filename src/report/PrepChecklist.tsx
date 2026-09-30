import { useEffect, useState } from 'react'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isDemoUser, demoId } from '../demo/demoData'
import type { ProfileRow } from '../lib/profile'
import type { School } from '../lib/types'
import { timingLabel } from '../lib/academics'
import { loadEnglish, type EnglishReq } from '../browse/EnglishBlock'
import { loadSchoolReqs, type SchoolReq } from '../lib/schoolReqs'
import { loadUsData } from '../browse/UsStudentBlock'
import { navigate, slugify } from '../lib/router'
import { t, getLang } from '../i18n'
import SchoolLogo from '../browse/SchoolLogo'
import schData from '../data/scholarships.json'

// 학교별 원서 준비물 체크리스트 — 목표 학교를 구체적으로 고른 경우만. 항목은 이미 정리된 공식 데이터에서 자동 생성,
// 체크 상태는 custom_tasks(title = 'prep:키')에 저장 (지원 학교 탭의 커스텀 항목 목록에는 안 보이게 접두어로 구분)
export const PREP_PREFIX = 'prep:'
interface Task { id: number; school_id: number; title: string; done: boolean }
interface Item { key: string; label: string; detail?: string | null; link?: { href: string; label: string; internal?: boolean } }
interface Sch { id: number; e: string; p: 'automatic' | 'application' | 'both' | null; dl: string | null }
const scholarships = new Map((schData as { schools: Sch[] }).schools.map((r) => [r.id, r]))

function roundsLine(s: School): string | null {
  const parts: string[] = []
  if (s.ed_offered) parts.push(`ED ${s.ed_timing ? timingLabel(s.ed_timing) : ''}`.trim())
  if (s.ed2_offered) parts.push(`ED II ${s.ed2_timing ? timingLabel(s.ed2_timing) : ''}`.trim())
  if (s.rea_offered) parts.push(`REA ${s.ea_timing ? timingLabel(s.ea_timing) : ''}`.trim())
  else if (s.ea_offered) parts.push(`EA ${s.ea_timing ? timingLabel(s.ea_timing) : ''}`.trim())
  if (s.rd_timing) parts.push(`RD ${timingLabel(s.rd_timing)}`)
  return parts.length ? parts.join(' · ') : null
}

function itemsFor(s: School, intl: boolean, eng: EnglishReq | undefined, req: SchoolReq | undefined, css: { css_intl: boolean; css_domestic: boolean } | undefined): Item[] {
  const items: Item[] = []
  const rounds = roundsLine(s)
  items.push({ key: 'apply', label: t('지원 라운드 정하고 원서 제출', 'Pick a round and submit the application'), detail: rounds ? t(`마감: ${rounds}`, `Deadlines: ${rounds}`) : null, link: s.deadlines_source_url ? { href: s.deadlines_source_url, label: t('공식 마감', 'Official deadlines') } : undefined })
  items.push({ key: 'essay', label: t('보충 에세이 확인·작성', 'Check and write supplemental essays'), detail: s.essay_req ?? t('공식 페이지에서 문항을 확인하세요', 'Check the prompts on the official page'), link: s.essay_source_url ? { href: s.essay_source_url, label: t('공식 문항', 'Official prompts') } : undefined })
  if (s.test_policy === 'test-required') items.push({ key: 'test', label: t('SAT·ACT 점수 제출 (필수)', 'Send SAT/ACT scores (required)') })
  else if (s.test_policy === 'test-optional') items.push({ key: 'test', label: t('SAT·ACT 제출 여부 결정 (선택 제출)', 'Decide whether to send SAT/ACT (optional)'), link: { href: '/targets', label: t('SAT 제출 판단 보기', 'See the SAT helper'), internal: true } })
  if (intl && eng && eng.requirement && eng.requirement !== 'not_required') {
    const mins = [eng.toefl_min && `TOEFL ${eng.toefl_min}`, eng.ielts_min && `IELTS ${eng.ielts_min}`, eng.duolingo_min && `Duolingo ${eng.duolingo_min}`].filter(Boolean).join(' · ')
    items.push({
      key: 'english',
      label: eng.requirement === 'optional' ? t('영어 시험 점수 제출 여부 결정 (선택)', 'Decide whether to send an English test (optional)') : t('영어 시험 점수 제출 또는 면제 확인', 'Send English test scores or confirm a waiver'),
      detail: [mins && t(`최소 ${mins}`, `Minimum ${mins}`), getLang() === 'ko' ? eng.waiver_conditions_ko : eng.waiver_conditions_en].filter(Boolean).join(' — ') || null,
      link: eng.source_url ? { href: eng.source_url, label: t('공식 기준', 'Official requirement') } : undefined,
    })
  }
  const iv = req?.interview
  if (iv && iv.offered && iv.offered !== 'not_offered' && iv.offered !== 'informational_only') {
    const label = iv.offered === 'required' ? t('인터뷰 (필수)', 'Interview (required)') : iv.offered === 'by_invitation' ? t('인터뷰 (학교가 초대하면)', 'Interview (by invitation)') : t('인터뷰 신청 여부 결정 (선택)', 'Decide on an interview (optional)')
    items.push({ key: 'interview', label, detail: getLang() === 'ko' ? iv.how_ko : iv.how_en, link: iv.source_url ? { href: iv.source_url, label: t('공식 안내', 'Official info') } : undefined })
  }
  if (s.portfolio_req) items.push({ key: 'portfolio', label: t('포트폴리오 준비·제출', 'Prepare and submit a portfolio'), detail: s.portfolio_req, link: s.portfolio_source_url ? { href: s.portfolio_source_url, label: t('공식 요건', 'Official requirements') } : undefined })
  const sc = scholarships.get(s.id)
  if (intl && sc?.e === 'yes' && (sc.p === 'application' || sc.p === 'both')) {
    items.push({ key: 'scholarship', label: t('장학금 별도 신청', 'Apply separately for scholarships'), detail: [sc.dl && t(`장학금 마감 ${sc.dl}`, `Scholarship deadline: ${sc.dl}`), s.merit_intl].filter(Boolean).join(' — ') || null, link: s.aid_source_url ? { href: s.aid_source_url, label: t('공식 장학금 안내', 'Official scholarship info') } : undefined })
  }
  if (intl ? css?.css_intl : css?.css_domestic) items.push({ key: 'css', label: t('CSS Profile 제출 (재정지원 신청 시)', 'Submit the CSS Profile (if applying for aid)') })
  if (!intl) items.push({ key: 'fafsa', label: t('FAFSA 제출 (재정지원 신청 시)', 'Submit the FAFSA (if applying for aid)') })
  return items
}

export default function PrepChecklist({ userId, profile, schools }: { userId: string; profile: ProfileRow; schools: School[] }) {
  const intl = profile.applicant_status !== 'domestic'
  const demo = isDemoUser(userId)
  const [eng, setEng] = useState<Map<number, EnglishReq> | null>(null)
  const [reqs, setReqs] = useState<Map<number, SchoolReq> | null>(null)
  const [css, setCss] = useState<Map<number, { css_intl: boolean; css_domestic: boolean }> | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState<number | null>(schools[0]?.id ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void loadEnglish().then(setEng)
    void loadSchoolReqs().then(setReqs)
    void loadUsData().then((d) => setCss(new Map(d.schools.map((r) => [r.id, r]))))
    if (demo || !supabase) { setLoaded(true); return }
    supabase.from('custom_tasks').select('id, school_id, title, done').eq('user_id', userId).like('title', `${PREP_PREFIX}%`)
      .then(({ data }) => { setTasks((data ?? []) as Task[]); setLoaded(true) }, () => setLoaded(true))
  }, [userId, demo])

  if (!eng || !reqs || !css || !loaded) return null

  const isDone = (sid: number, key: string) => tasks.some((x) => x.school_id === sid && x.title === PREP_PREFIX + key && x.done)
  const toggle = async (sid: number, key: string) => {
    if (busy) return
    const title = PREP_PREFIX + key
    const existing = tasks.find((x) => x.school_id === sid && x.title === title)
    if (demo) {
      setTasks((l) => existing ? l.map((x) => (x === existing ? { ...x, done: !x.done } : x)) : [...l, { id: demoId(), school_id: sid, title, done: true }])
      return
    }
    if (!supabase) return
    setBusy(true)
    if (existing) {
      const done = !existing.done
      setTasks((l) => l.map((x) => (x.id === existing.id ? { ...x, done } : x)))
      const { error } = await supabase.from('custom_tasks').update({ done }).eq('id', existing.id)
      if (error) setTasks((l) => l.map((x) => (x.id === existing.id ? { ...x, done: !done } : x)))
    } else {
      const { data } = await supabase.from('custom_tasks').insert({ user_id: userId, school_id: sid, title, done: true }).select('id, school_id, title, done').single()
      if (data) setTasks((l) => [...l, data as Task])
    }
    setBusy(false)
  }

  const all = schools.map((s) => ({ s, items: itemsFor(s, intl, eng.get(s.id), reqs.get(s.id), css.get(s.id)) }))
  const total = all.reduce((n, x) => n + x.items.length, 0)
  const done = all.reduce((n, x) => n + x.items.filter((i) => isDone(x.s.id, i.key)).length, 0)
  const name = (s: School) => (getLang() === 'ko' && s.name_ko ? s.name_ko : s.name)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
        <p className="font-semibold text-gray-900">{t('학교별 원서 준비물', 'What each school needs')}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
          {t('목표 학교마다 내야 할 것을 공식 자료로 모았어요. 끝낸 항목을 체크해 두세요.', 'Everything each target school asks for, gathered from official sources. Check items off as you go.')}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-green-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
          <span className="text-xs font-semibold text-gray-600">{done}/{total}</span>
        </div>
      </div>

      {all.map(({ s, items }) => {
        const d = items.filter((i) => isDone(s.id, i.key)).length
        const isOpen = open === s.id
        return (
          <div key={s.id} className="rounded-2xl border-2 border-gray-200 bg-white">
            <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
              <SchoolLogo schoolId={s.id} name={s.name} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{name(s)}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${d === items.length ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{d}/{items.length}</span>
              <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {items.map((it) => {
                  const on = isDone(s.id, it.key)
                  return (
                    <li key={it.key} className="flex gap-3 px-4 py-3">
                      <button onClick={() => void toggle(s.id, it.key)} role="checkbox" aria-checked={on} aria-label={it.label} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white'}`}>
                        {on && <Check size={13} strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13.5px] font-semibold ${on ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{it.label}</p>
                        {it.detail && <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-600">{it.detail}</p>}
                        {it.link && (it.link.internal
                          ? <button onClick={() => navigate(it.link!.href)} className="mt-1 text-[12px] font-semibold text-blue-600 underline">{it.link.label}</button>
                          : <a href={it.link.href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-semibold text-blue-600 underline">{it.link.label}<ExternalLink size={11} /></a>)}
                      </div>
                    </li>
                  )
                })}
                <li className="px-4 py-2.5 text-right">
                  <button onClick={() => navigate(`/schools/${slugify(s.name)}`)} className="text-[12px] font-semibold text-gray-500 underline">{t('학교 상세 보기', 'School details')}</button>
                </li>
              </ul>
            )}
          </div>
        )
      })}

      <p className="text-[11px] leading-relaxed text-gray-400">
        {t('각 대학 공식 입학처·CDS·College Board CSS Profile 목록 기준으로 자동 생성했어요. 성적표·추천서 같은 공통 서류는 학교마다 제출 방식이 달라 여기에는 넣지 않았어요. 요건은 바뀔 수 있으니 제출 전에 공식 페이지를 확인하세요.', 'Generated from each college’s admissions pages, CDS and the College Board CSS Profile list. Common documents like transcripts and recommendations are not listed here because submission methods vary. Requirements change — confirm on official pages before submitting.')}
      </p>
    </div>
  )
}
