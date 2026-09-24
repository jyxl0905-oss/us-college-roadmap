import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { t, getLang } from '../i18n'
import { navigate } from '../lib/router'

interface Row { key: string; name: string; relation: 'host' | 'admissions_mention'; note_ko: string; note_en: string; url: string }

// 이 대학이 운영하거나 입학처가 공식 언급한 대회·서머 프로그램 — programs.json은 필요할 때만 불러옴
export default function SchoolPrograms({ schoolId }: { schoolId: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [more, setMore] = useState(false)
  useEffect(() => {
    let alive = true
    void import('../data/programs.json').then((m) => {
      const out: Row[] = []
      for (const p of (m.default as { programs: { key: string; name: string; official_mentions: { school_id?: number; relation: Row['relation']; note_ko: string; note_en: string; url: string }[] }[] }).programs) {
        const hit = p.official_mentions.find((x) => x.school_id === schoolId && x.relation === 'host') ?? p.official_mentions.find((x) => x.school_id === schoolId)
        if (hit) out.push({ key: p.key, name: p.name, relation: hit.relation, note_ko: hit.note_ko, note_en: hit.note_en, url: hit.url })
      }
      if (alive) setRows(out.sort((a, b) => (a.relation === 'host' ? 0 : 1) - (b.relation === 'host' ? 0 : 1)))
    })
    return () => { alive = false }
  }, [schoolId])
  if (rows.length === 0) return null
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
      <p className="flex items-center gap-1.5 font-semibold text-gray-900"><Trophy size={18} strokeWidth={2} className="text-blue-600" />{t('이 대학이 운영·공식 언급한 대회·프로그램', 'Programs this college runs or officially names')}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {(more ? rows : rows.slice(0, 5)).map((r) => (
          <li key={r.key} className="text-sm leading-relaxed">
            <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.relation === 'host' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-800'}`}>{r.relation === 'host' ? t('운영', 'Runs it') : t('입학처 언급', 'Admissions')}</span>
            <span className="font-semibold text-gray-900">{getLang() === 'en' ? r.name.replace(/\s*\([^)]*[가-힣][^)]*\)/g, '') : r.name}</span>
            <span className="block text-xs text-gray-500">{t(r.note_ko, r.note_en)} <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{t('출처', 'source')}</a></span>
          </li>
        ))}
      </ul>
      {rows.length > 5 && <button onClick={() => setMore((v) => !v)} className="mt-2 text-xs font-semibold text-gray-600">{more ? t('접기', 'Show less') : t(`${rows.length - 5}개 더 보기`, `Show ${rows.length - 5} more`)}</button>}
      <button onClick={() => navigate('/guide/programs')} className="mt-2.5 block text-xs font-medium text-blue-600 underline">{t('전공별 대회·서머 프로그램 전체 보기 →', 'All competitions & summer programs by major →')}</button>
    </div>
  )
}
