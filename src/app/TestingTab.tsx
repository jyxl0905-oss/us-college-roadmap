import { useEffect, useRef, useState } from 'react'
import AppShell from './AppShell'
import { t } from '../i18n'
import { saveProfile, type ProfileRow } from '../lib/profile'
import {
  insertRow, deleteRow, loadAppRecords, bestSat, satBandFromScore,
  type TestScore, type TestKind,
} from './appData'

interface TestingTabProps {
  userId: string
  profile: ProfileRow
  onProfileChange: (p: ProfileRow) => void
}

const kindKo: Record<TestKind, string> = { sat: 'SAT', act: 'ACT', toefl: 'TOEFL', ielts: 'IELTS', ap: 'AP' }

// ACT 영역 표기 (컴포지트는 4영역 평균이라 합계 검증은 하지 않음)
const ACT_SECTIONS = [
  { key: 'english', ko: '영어', en: 'English' },
  { key: 'math', ko: '수학', en: 'Math' },
  { key: 'reading', ko: '독해', en: 'Reading' },
  { key: 'science', ko: '과학', en: 'Science' },
] as const

// F5 시험 — SAT·TOEFL/IELTS·AP 실제 점수 기록. 기록이 생기면 프로필 밴드·상태를 자동 파생
export default function TestingTab({ userId, profile, onProfileChange }: TestingTabProps) {
  const [tests, setTests] = useState<TestScore[] | null>(null)
  const [adding, setAdding] = useState<TestKind | null>(null)
  const busyRef = useRef(false) // 저장·삭제 중복 요청 방지 (더블탭)

  useEffect(() => {
    loadAppRecords(userId).then((r) => setTests(r.tests))
  }, [userId])

  // 기록 → 프로필 파생 (sat_status/sat_band, toefl_status, ap_completed)
  const syncProfile = async (list: TestScore[]) => {
    const best = bestSat(list)
    const hasToefl = list.some((t) => (t.kind === 'toefl' || t.kind === 'ielts') && t.total !== null)
    const apCount = list.filter((t) => t.kind === 'ap' && t.total !== null).length
    const next: ProfileRow = {
      ...profile,
      sat_status: best ? 'taken' : profile.sat_status,
      sat_band: best && best.total !== null ? satBandFromScore(Number(best.total)) : profile.sat_band,
      toefl_status: hasToefl ? 'scored' : profile.toefl_status,
      ap_completed: apCount > 0 ? Math.max(apCount, profile.ap_completed ?? 0) : profile.ap_completed,
    }
    if (JSON.stringify(next) !== JSON.stringify(profile)) {
      try {
        await saveProfile(userId, next)
        onProfileChange(next)
      } catch (e) {
        // 점수 기록은 저장됐고 프로필 파생만 실패 — 다음 저장 때 다시 시도됨
        alert(t(`프로필 반영에 실패했어요. 네트워크를 확인해 주세요.\n(${(e as Error).message})`, `Failed to update your profile. Check your connection.\n(${(e as Error).message})`))
      }
    }
  }

  if (!tests) return <AppShell tab="testing" title={t('시험', 'Testing')}><p className="mt-10 text-center text-gray-400">{t('불러오는 중…', 'Loading…')}</p></AppShell>

  // 응시일 내림차순 (loadAppRecords와 같은 순서, 미입력은 뒤로)
  const sortTests = (list: TestScore[]) =>
    [...list].sort((a, b) => (b.taken_on ?? '').localeCompare(a.taken_on ?? '') || b.id - a.id)

  const add = async (row: Omit<TestScore, 'id'>) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const saved = await insertRow<TestScore>('test_scores', userId, row)
      if (saved) {
        const list = sortTests([saved, ...tests])
        setTests(list)
        setAdding(null)
        await syncProfile(list)
      } else {
        setAdding(null)
      }
    } catch { /* insertRow가 이미 alert — 폼 유지 */ } finally { busyRef.current = false }
  }
  const remove = async (id: number) => {
    if (busyRef.current) return
    if (!confirm(t('이 기록을 삭제할까요?', 'Delete this score?'))) return
    busyRef.current = true
    try {
      await deleteRow('test_scores', id)
      const list = tests.filter((t) => t.id !== id)
      setTests(list)
      await syncProfile(list) // 남은 기록 기준으로 밴드 다시 파생 (기록 없으면 기존 값 유지)
    } catch { /* deleteRow가 이미 alert */ } finally { busyRef.current = false }
  }

  const best = bestSat(tests)
  const groups: TestKind[] = ['sat', 'act', 'toefl', 'ielts', 'ap']

  return (
    <AppShell tab="testing" title={t('시험', 'Testing')}>
      <p className="mt-3 text-sm text-gray-500">
        {t('실제 점수와 응시일을 기록해요. 기록이 생기면 리포트의 SAT 위치·밴드가 자동으로 바뀌어요.', 'Record your actual scores and test dates. Once recorded, the SAT position and band in your report update automatically.')}
      </p>

      {best && best.total !== null && (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium text-blue-600">{t('SAT 최고 총점 (회차 기준)', 'Best SAT total (single sitting)')}</p>
          <p className="text-2xl font-bold text-blue-900">{best.total}</p>
          <p className="text-xs text-blue-700">{t('리포트 밴드: ', 'Report band: ')}{satBandFromScore(Number(best.total))}{t(' · 학교별 제출 여부는 시험 정책 확인', ' · check each school’s test policy before submitting')}</p>
        </div>
      )}

      {groups.map((k) => {
        const rows = tests.filter((t) => t.kind === k)
        return (
          <div key={k} className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-gray-900">{kindKo[k]}</h2>
              <button onClick={() => setAdding(k)} className="text-sm text-blue-600">{t('＋ 기록 추가', '＋ Add score')}</button>
            </div>
            {adding === k && <ScoreForm kind={k} onSave={add} onCancel={() => setAdding(null)} />}
            <div className="mt-2 flex flex-col gap-2">
              {rows.length === 0 && adding !== k && <p className="text-xs text-gray-400">{t('아직 없음', 'None yet')}</p>}
              {rows.map((ts) => (
                <div key={ts.id} className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {ts.kind === 'ap' ? t(`${ts.subject ?? 'AP'} · ${ts.total ?? '-'}점`, `${ts.subject ?? 'AP'} · ${ts.total ?? '-'}`) : `${ts.total ?? '-'}`}
                      {ts.kind === 'sat' && ts.section_scores && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {t('영어', 'EBRW')} {ts.section_scores.ebrw ?? '-'} · {t('수학', 'Math')} {ts.section_scores.math ?? '-'}
                        </span>
                      )}
                      {ts.kind === 'act' && ts.section_scores && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          {ACT_SECTIONS.filter((s) => ts.section_scores?.[s.key] != null)
                            .map((s) => `${t(s.ko, s.en)} ${ts.section_scores?.[s.key]}`)
                            .join(' · ')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{ts.taken_on ?? t('응시일 미입력', 'No test date')}</p>
                  </div>
                  <button onClick={() => remove(ts.id)} aria-label={t('삭제', 'Delete')} className="text-gray-300 active:text-red-500">✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </AppShell>
  )
}

function ScoreForm({ kind, onSave, onCancel }: { kind: TestKind; onSave: (r: Omit<TestScore, 'id'>) => Promise<void>; onCancel: () => void }) {
  const [date, setDate] = useState('')
  const [total, setTotal] = useState('')
  const [ebrw, setEbrw] = useState('')
  const [math, setMath] = useState('')
  const [subject, setSubject] = useState('')
  const [act, setAct] = useState<Record<string, string>>({ english: '', math: '', reading: '', science: '' })
  const [saving, setSaving] = useState(false)
  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'text-xs font-medium text-gray-500'
  const totalNum = total === '' ? null : Number(total)
  const ebrwNum = ebrw === '' ? null : Number(ebrw)
  const mathNum = math === '' ? null : Number(math)
  const sectionOk =
    (ebrwNum === null || (Number.isInteger(ebrwNum) && ebrwNum >= 200 && ebrwNum <= 800)) &&
    (mathNum === null || (Number.isInteger(mathNum) && mathNum >= 200 && mathNum <= 800)) &&
    // 영역 점수를 둘 다 적었으면 합계가 총점과 같아야 함
    (ebrwNum === null || mathNum === null || totalNum === null || ebrwNum + mathNum === totalNum)
  const actNums = Object.fromEntries(Object.entries(act).map(([k, v]) => [k, v === '' ? null : Number(v)])) as Record<string, number | null>
  const actSectionsOk = Object.values(actNums).every((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 36))
  const valid =
    kind === 'sat' ? totalNum !== null && Number.isInteger(totalNum) && totalNum >= 400 && totalNum <= 1600 && sectionOk
    : kind === 'act' ? totalNum !== null && Number.isInteger(totalNum) && totalNum >= 1 && totalNum <= 36 && actSectionsOk
    : kind === 'toefl' ? totalNum !== null && Number.isInteger(totalNum) && totalNum >= 0 && totalNum <= 120
    : kind === 'ielts' ? totalNum !== null && totalNum >= 0 && totalNum <= 9 && Number.isInteger(totalNum * 2) // 0.5 단위
    : totalNum !== null && Number.isInteger(totalNum) && totalNum >= 1 && totalNum <= 5 && subject.trim() !== ''

  return (
    <div className="mt-2 rounded-xl border-2 border-blue-600 bg-white px-4 py-3">
      {kind === 'ap' && (
        <>
          <label className={label}>{t('과목', 'Subject')}</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('예: AP Calculus BC', 'e.g. AP Calculus BC')} className={field} />
        </>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className={label}>{kind === 'ap' ? t('점수 (1~5)', 'Score (1–5)') : kind === 'act' ? t('컴포지트 (1~36)', 'Composite (1–36)') : t('총점', 'Total')}</label>
          <input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={field}
            placeholder={kind === 'sat' ? '400~1600' : kind === 'act' ? '1~36' : kind === 'toefl' ? '0~120' : kind === 'ielts' ? '0~9' : '1~5'} />
        </div>
        <div>
          <label className={label}>{t('응시일', 'Test date')}</label>
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
      </div>
      {kind === 'sat' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div><label className={label}>{t('영어 (EBRW)', 'EBRW')}</label><input type="number" inputMode="numeric" min={200} max={800} step={10} value={ebrw} onChange={(e) => setEbrw(e.target.value)} className={field} /></div>
          <div><label className={label}>{t('수학', 'Math')}</label><input type="number" inputMode="numeric" min={200} max={800} step={10} value={math} onChange={(e) => setMath(e.target.value)} className={field} /></div>
        </div>
      )}
      {kind === 'act' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ACT_SECTIONS.map((s) => (
            <div key={s.key}>
              <label className={label}>{t(s.ko, s.en)} <span className="font-normal text-gray-400">{t('(선택)', '(optional)')}</span></label>
              <input type="number" inputMode="numeric" min={1} max={36} value={act[s.key]}
                onChange={(e) => setAct((prev) => ({ ...prev, [s.key]: e.target.value }))} className={field} placeholder="1~36" />
            </div>
          ))}
        </div>
      )}
      {kind === 'act' && !actSectionsOk && (
        <p className="mt-1 text-xs text-red-600">{t('ACT 영역 점수는 1~36 정수예요.', 'ACT section scores must be whole numbers from 1 to 36.')}</p>
      )}
      {kind === 'sat' && total !== '' && !sectionOk && (
        <p className="mt-1 text-xs text-red-600">{t('영역 점수는 200~800, 두 영역 합이 총점과 같아야 해요.', 'Section scores must be 200–800 and add up to the total.')}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          disabled={!valid || saving}
          onClick={async () => {
            if (saving) return
            setSaving(true)
            try {
              await onSave({
                kind, taken_on: date || null, total: totalNum,
                section_scores:
                  kind === 'sat' && (ebrwNum !== null || mathNum !== null)
                    ? { ...(ebrwNum !== null ? { ebrw: ebrwNum } : {}), ...(mathNum !== null ? { math: mathNum } : {}) }
                    : kind === 'act' && Object.values(actNums).some((v) => v !== null)
                      ? Object.fromEntries(Object.entries(actNums).filter(([, v]) => v !== null)) as Record<string, number>
                      : null,
                subject: kind === 'ap' ? subject.trim() : null,
              })
            } finally { setSaving(false) }
          }}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300"
        >
          {saving ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
        </button>
        <button onClick={onCancel} className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-600">{t('취소', 'Cancel')}</button>
      </div>
    </div>
  )
}
