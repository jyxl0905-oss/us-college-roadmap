import { useEffect, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { t } from '../i18n'
import { loadSchoolReqs, type InterviewPolicy, type SchoolReq } from '../lib/schoolReqs'

// 학교 상세: 인터뷰 제공 여부·방식·국제학생 가능 여부 (공식 입학처 기준)
export const OFFERED: Record<NonNullable<InterviewPolicy['offered']>, { ko: string; en: string; cls: string }> = {
  required: { ko: '필수', en: 'Required', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  recommended: { ko: '권장', en: 'Recommended', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  optional: { ko: '선택', en: 'Optional', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  by_invitation: { ko: '학교가 초대', en: 'By invitation', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  informational_only: { ko: '정보 제공용만', en: 'Informational only', cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
  not_offered: { ko: '인터뷰 없음', en: 'Not offered', cls: 'bg-gray-50 text-gray-500 ring-gray-200' },
}
export const INTL: Record<NonNullable<InterviewPolicy['intl']>, [string, string]> = {
  available: ['해외 지원자도 가능', 'Available to applicants abroad'],
  limited: ['해외는 제한적', 'Limited abroad'],
  not_available: ['해외 지원자는 불가', 'Not available abroad'],
  not_stated: ['해외 지원자 안내 없음', 'Not stated for applicants abroad'],
}
const WHO: Record<NonNullable<InterviewPolicy['who']>, [string, string]> = {
  alumni: ['졸업생(동문)', 'Alumni'], admissions_staff: ['입학처 직원', 'Admissions staff'], students: ['재학생', 'Current students'], mixed: ['동문·직원 등', 'Alumni / staff'],
}

export default function InterviewBlock({ schoolId }: { schoolId: number }) {
  const [iv, setIv] = useState<InterviewPolicy | null>(null)
  const [req, setReq] = useState<SchoolReq | null>(null)
  useEffect(() => {
    let alive = true
    void loadSchoolReqs().then((m) => { if (alive) { setIv(m.get(schoolId)?.interview ?? null); setReq(m.get(schoolId) ?? null) } })
    return () => { alive = false }
  }, [schoolId])
  if (!iv || !iv.offered) return null
  const O = OFFERED[iv.offered]
  const off = iv.offered === 'not_offered'
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
        <MessagesSquare size={18} strokeWidth={2} className="text-blue-600" />
        {t('인터뷰', 'Interview')}
        <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${O.cls}`}>{t(O.ko, O.en)}</span>
        {!off && iv.evaluative != null && <span className="text-[11px] font-normal text-gray-500">{iv.evaluative ? t('· 평가에 반영', '· evaluative') : t('· 평가 반영 안 함', '· not evaluative')}</span>}
      </p>
      {(!off || iv.third_party) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11.5px]">
          {!off && iv.who && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{t('면접관: ', 'With: ')}{t(...WHO[iv.who])}</span>}
          {!off && iv.intl && <span className={`rounded-full px-2 py-0.5 ${iv.intl === 'available' ? 'bg-emerald-50 text-emerald-700' : iv.intl === 'not_available' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>{t(...INTL[iv.intl])}</span>}
          {iv.third_party && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{t(iv.third_party_ko ?? iv.third_party, iv.third_party)}</span>}
        </div>
      )}
      {iv.how_ko && <p className="mt-1.5 text-[13px] leading-relaxed text-gray-700">{t(iv.how_ko, iv.how_en ?? iv.how_ko)}</p>}
      {/* 과목 요건 박스가 없는 학교는 참고 메모를 여기서 보여줌 */}
      {!req?.courses && req?.note_ko && <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">{t(req.note_ko, req.note_en ?? req.note_ko)}</p>}
      {iv.source_url && <p className="mt-2 text-[11px] text-gray-400"><a href={iv.source_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('공식 출처 ↗', 'Official source ↗')}</a></p>}
    </div>
  )
}
