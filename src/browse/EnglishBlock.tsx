import { useEffect, useState } from 'react'
import { Languages, ChevronDown, CheckCircle2, Send, FileSignature, XCircle, HelpCircle } from 'lucide-react'
import { t } from '../i18n'
import { navigate } from '../lib/router'

// 국제학생 영어 시험 기준 (TOEFL·IELTS·Duolingo 최소/권장 점수, 면제 조건, 면제 받는 방법) — 각 대학 공식 페이지 기준, 사용자 승인
export interface EnglishReq {
  id: number
  requirement: 'required' | 'required_unless_waived' | 'optional' | 'not_required' | null
  toefl_min: number | null; toefl_scale: 'old' | 'new' | null; toefl_recommended: string | null
  sat_ebrw_waiver: number | null; act_english_waiver: number | null; score_waiver_note_ko: string | null; score_waiver_note_en: string | null
  ielts_min: number | null; ielts_recommended: string | null
  duolingo_min: number | null; duolingo_recommended: string | null
  other_tests: string | null
  waiver_conditions_ko: string | null; waiver_conditions_en: string | null
  waiver_process: 'automatic' | 'office_review' | 'request_required' | 'counselor_confirmation' | 'no_waiver' | 'not_applicable' | 'unclear'
  waiver_process_ko: string | null; waiver_process_en: string | null
  quote_en: string | null
  source_url: string | null
}

export const PROCESS: Record<EnglishReq['waiver_process'], { icon: typeof CheckCircle2; cls: string; ko: string; en: string }> = {
  automatic: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', ko: '자동 판단 — 따로 신청 안 해도 돼요', en: 'Automatic — no request needed' },
  office_review: { icon: CheckCircle2, cls: 'bg-sky-50 text-sky-700 ring-sky-200', ko: '입학처가 서류로 판단 (재량)', en: 'Admissions decides from your file (discretionary)' },
  request_required: { icon: Send, cls: 'bg-amber-50 text-amber-800 ring-amber-200', ko: '직접 면제 요청을 해야 해요', en: 'You must request the waiver' },
  counselor_confirmation: { icon: FileSignature, cls: 'bg-amber-50 text-amber-800 ring-amber-200', ko: '카운슬러·학교 확인서가 필요해요', en: 'Needs counselor/school confirmation' },
  no_waiver: { icon: XCircle, cls: 'bg-rose-50 text-rose-700 ring-rose-200', ko: '면제 없음 — 시험 점수 필요', en: 'No waiver — scores required' },
  not_applicable: { icon: CheckCircle2, cls: 'bg-gray-50 text-gray-600 ring-gray-200', ko: '영어 시험을 요구하지 않아요', en: 'No English test required' },
  unclear: { icon: HelpCircle, cls: 'bg-gray-50 text-gray-600 ring-gray-200', ko: '면제 방법 미공개 — 입학처에 문의', en: 'Process not stated — ask admissions' },
}

const REQ_LABEL: Record<NonNullable<EnglishReq['requirement']>, [string, string]> = {
  required: ['필수', 'Required'],
  required_unless_waived: ['필수 (면제 조건 충족 시 제외)', 'Required unless waived'],
  optional: ['선택 (제출 권장)', 'Optional / recommended'],
  not_required: ['요구하지 않음', 'Not required'],
}

let cache: Promise<Map<number, EnglishReq>> | null = null
export function loadEnglish(): Promise<Map<number, EnglishReq>> {
  cache ??= import('../data/english.json').then((m) => new Map((m.default as { schools: EnglishReq[] }).schools.map((r) => [r.id, r])))
  return cache
}

export default function EnglishBlock({ schoolId }: { schoolId: number }) {
  const [r, setR] = useState<EnglishReq | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let alive = true
    void loadEnglish().then((m) => { if (alive) setR(m.get(schoolId) ?? null) })
    return () => { alive = false }
  }, [schoolId])
  if (!r || (!r.requirement && !r.toefl_min && !r.toefl_recommended && r.waiver_process === 'unclear' && !r.waiver_conditions_ko)) return null

  const tests: [string, number | null, string | null][] = [
    ['TOEFL iBT', r.toefl_min, r.toefl_recommended],
    ['IELTS', r.ielts_min, r.ielts_recommended],
    ['Duolingo', r.duolingo_min, r.duolingo_recommended],
  ]
  const P = PROCESS[r.waiver_process]
  const PIcon = P.icon

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <Languages size={18} strokeWidth={2} className="text-blue-600" />
        {t('영어 시험 기준', 'English test requirements')}
        <span className="ml-1 text-xs font-normal text-gray-400">{t('국제학생', 'international applicants')}</span>
      </p>
      {r.requirement && <p className="mt-1 text-sm text-gray-700">{t('제출: ', 'Status: ')}<span className="font-semibold">{t(...REQ_LABEL[r.requirement])}</span></p>}

      {r.requirement !== 'not_required' && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {tests.map(([name, min, rec]) => (
            <div key={name} className="rounded-lg bg-gray-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-gray-500">{name}</p>
              {min != null ? (
                <p className="text-lg font-extrabold tabular-nums text-gray-900">{min}<span className="ml-0.5 text-[11px] font-medium text-gray-500">{t('+ 최소', '+ min')}</span>{name === 'TOEFL iBT' && r.toefl_scale === 'new' && <span className="block text-[10px] font-medium text-gray-400">{t('새 1–6점 척도', 'new 1–6 scale')}</span>}</p>
              ) : (
                <p className="text-sm font-semibold text-gray-400">{t('최소 없음', 'No minimum')}</p>
              )}
              {rec && <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{t('권장', 'Rec.')} {rec}</p>}
            </div>
          ))}
        </div>
      )}

      {(r.sat_ebrw_waiver || r.act_english_waiver) && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500">{t('이 점수면 영어 시험 대신 인정', 'These scores can replace an English test')}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {r.sat_ebrw_waiver && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-800 ring-1 ring-blue-200">SAT EBRW {r.sat_ebrw_waiver}+</span>}
            {r.act_english_waiver && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-800 ring-1 ring-blue-200">ACT English {r.act_english_waiver}+</span>}
          </div>
          {r.score_waiver_note_ko && <p className="mt-1 text-[11px] text-gray-500">{t(r.score_waiver_note_ko, r.score_waiver_note_en ?? r.score_waiver_note_ko)}</p>}
        </div>
      )}

      {r.waiver_process !== 'not_applicable' && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500">{t('면제받는 방법', 'Getting a waiver')}</p>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ${P.cls}`}><PIcon size={13} strokeWidth={2.2} />{t(P.ko, P.en)}</span>
          {(r.waiver_process_ko || r.waiver_conditions_ko) && (
            <button onClick={() => setOpen((v) => !v)} className="ml-2 inline-flex items-center gap-0.5 text-xs font-medium text-gray-500">
              {t('자세히', 'Details')} <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
            </button>
          )}
          {open && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] leading-relaxed text-gray-700">
              {r.waiver_conditions_ko && <p><span className="font-semibold text-gray-900">{t('면제 조건', 'Waiver conditions')}: </span>{t(r.waiver_conditions_ko, r.waiver_conditions_en ?? r.waiver_conditions_ko)}</p>}
              {r.waiver_process_ko && <p><span className="font-semibold text-gray-900">{t('방법', 'How')}: </span>{t(r.waiver_process_ko, r.waiver_process_en ?? r.waiver_process_ko)}</p>}
              {r.quote_en && <p className="border-l-2 border-blue-200 pl-2 text-[12px] italic text-gray-500">“{r.quote_en}”</p>}
              {r.other_tests && <p className="text-[12px] text-gray-500">{t('그 외 인정 시험', 'Other accepted tests')}: {r.other_tests}</p>}
            </div>
          )}
        </div>
      )}

      <p className="mt-2.5 text-[11px] text-gray-400">
        {t('4년 넘게 영어로 수업하는 학교에 다녀도 자동 면제가 아닌 학교가 있어요. 조건과 방법은 해마다 바뀌니 지원 전 공식 페이지에서 꼭 확인하세요.', 'Even after 4+ years at an English-medium school, some colleges don’t waive automatically. Rules change yearly — confirm on the official page before applying.')}
        {' '}<button onClick={() => navigate('/guide/english')} className="text-blue-600 underline">{t('다른 학교와 비교 →', 'Compare schools →')}</button>
        {r.source_url && <> <a href={r.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a></>}
      </p>
    </div>
  )
}
