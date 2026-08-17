import { useEffect, useState } from 'react'
import AppShell from './AppShell'
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

const kindKo: Record<TestKind, string> = { sat: 'SAT', toefl: 'TOEFL', ielts: 'IELTS', ap: 'AP' }

// F5 시험 — SAT·TOEFL/IELTS·AP 실제 점수 기록. 기록이 생기면 프로필 밴드·상태를 자동 파생
export default function TestingTab({ userId, profile, onProfileChange }: TestingTabProps) {
  const [tests, setTests] = useState<TestScore[] | null>(null)
  const [adding, setAdding] = useState<TestKind | null>(null)

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
      await saveProfile(userId, next)
      onProfileChange(next)
    }
  }

  if (!tests) return <AppShell tab="testing" title="시험"><p className="mt-10 text-center text-gray-400">불러오는 중…</p></AppShell>

  const add = async (row: Omit<TestScore, 'id'>) => {
    const saved = await insertRow<TestScore>('test_scores', userId, row)
    if (saved) {
      const list = [saved, ...tests]
      setTests(list)
      await syncProfile(list)
    }
    setAdding(null)
  }
  const remove = async (id: number) => {
    await deleteRow('test_scores', id)
    setTests(tests.filter((t) => t.id !== id))
  }

  const best = bestSat(tests)
  const groups: TestKind[] = ['sat', 'toefl', 'ielts', 'ap']

  return (
    <AppShell tab="testing" title="시험">
      <p className="mt-3 text-sm text-gray-500">
        실제 점수와 응시일을 기록해요. 기록이 생기면 리포트의 SAT 위치·밴드가 자동으로 바뀌어요.
      </p>

      {best && best.total !== null && (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium text-blue-600">SAT 최고 총점 (회차 기준)</p>
          <p className="text-2xl font-bold text-blue-900">{best.total}</p>
          <p className="text-xs text-blue-700">리포트 밴드: {satBandFromScore(Number(best.total))} · 학교별 제출 여부는 시험 정책 확인</p>
        </div>
      )}

      {groups.map((k) => {
        const rows = tests.filter((t) => t.kind === k)
        return (
          <div key={k} className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-gray-900">{kindKo[k]}</h2>
              <button onClick={() => setAdding(k)} className="text-sm text-blue-600">＋ 기록 추가</button>
            </div>
            {adding === k && <ScoreForm kind={k} onSave={add} onCancel={() => setAdding(null)} />}
            <div className="mt-2 flex flex-col gap-2">
              {rows.length === 0 && adding !== k && <p className="text-xs text-gray-400">아직 없음</p>}
              {rows.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {t.kind === 'ap' ? `${t.subject ?? 'AP'} · ${t.total ?? '-'}점` : `${t.total ?? '-'}`}
                      {t.kind === 'sat' && t.section_scores && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          영어 {t.section_scores.ebrw ?? '-'} · 수학 {t.section_scores.math ?? '-'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{t.taken_on ?? '응시일 미입력'}</p>
                  </div>
                  <button onClick={() => remove(t.id)} aria-label="삭제" className="text-gray-300 active:text-red-500">✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </AppShell>
  )
}

function ScoreForm({ kind, onSave, onCancel }: { kind: TestKind; onSave: (r: Omit<TestScore, 'id'>) => void; onCancel: () => void }) {
  const [date, setDate] = useState('')
  const [total, setTotal] = useState('')
  const [ebrw, setEbrw] = useState('')
  const [math, setMath] = useState('')
  const [subject, setSubject] = useState('')
  const field = 'mt-1 w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'
  const label = 'text-xs font-medium text-gray-500'
  const totalNum = total === '' ? null : Number(total)
  const valid =
    kind === 'sat' ? totalNum !== null && totalNum >= 400 && totalNum <= 1600
    : kind === 'toefl' ? totalNum !== null && totalNum >= 0 && totalNum <= 120
    : kind === 'ielts' ? totalNum !== null && totalNum >= 0 && totalNum <= 9
    : totalNum !== null && totalNum >= 1 && totalNum <= 5 && subject.trim() !== ''

  return (
    <div className="mt-2 rounded-xl border-2 border-blue-600 bg-white px-4 py-3">
      {kind === 'ap' && (
        <>
          <label className={label}>과목</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: AP Calculus BC" className={field} />
        </>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className={label}>{kind === 'ap' ? '점수 (1~5)' : '총점'}</label>
          <input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={field}
            placeholder={kind === 'sat' ? '400~1600' : kind === 'toefl' ? '0~120' : kind === 'ielts' ? '0~9' : '1~5'} />
        </div>
        <div>
          <label className={label}>응시일</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
      </div>
      {kind === 'sat' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div><label className={label}>영어 (EBRW)</label><input type="number" value={ebrw} onChange={(e) => setEbrw(e.target.value)} className={field} /></div>
          <div><label className={label}>수학</label><input type="number" value={math} onChange={(e) => setMath(e.target.value)} className={field} /></div>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          disabled={!valid}
          onClick={() => onSave({
            kind, taken_on: date || null, total: totalNum,
            section_scores: kind === 'sat' && (ebrw || math) ? { ebrw: Number(ebrw) || 0, math: Number(math) || 0 } : null,
            subject: kind === 'ap' ? subject.trim() : null,
          })}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300"
        >
          저장
        </button>
        <button onClick={onCancel} className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-600">취소</button>
      </div>
    </div>
  )
}
