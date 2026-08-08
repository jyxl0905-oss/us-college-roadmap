import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface GlossaryItem {
  id: number
  term: string
  definition_ko: string
  sort_order: number
}

interface BasicItem {
  id: number
  title_ko: string
  body_ko: string
  sort_order: number
}

// 입시 기본기 5꼭지 + 용어집 30개 (§4 콘텐츠)
export default function GuideView({ onBack }: { onBack: () => void }) {
  const [basics, setBasics] = useState<BasicItem[]>([])
  const [glossary, setGlossary] = useState<GlossaryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    Promise.all([
      supabase.from('basics').select('*').order('sort_order'),
      supabase.from('glossary').select('*').order('sort_order'),
    ]).then(([b, g]) => {
      if (b.data) setBasics(b.data as BasicItem[])
      if (g.data) setGlossary(g.data as GlossaryItem[])
      setLoading(false)
    })
  }, [])

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="리포트로 돌아가기" className="rounded-lg p-2 text-gray-500 active:bg-gray-100">
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900">입시 기본기 · 용어집</h1>
      </div>

      {loading && <p className="mt-10 text-center text-gray-400">불러오는 중…</p>}

      {basics.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {basics.map((b, i) => (
            <div key={b.id} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
              <p className="font-semibold text-gray-900">
                {i + 1}. {b.title_ko}
              </p>
              <div className="mt-2 space-y-1">
                {b.body_ko.split('\n').map((line, j) => (
                  <p key={j} className="text-sm leading-relaxed text-gray-600">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {glossary.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-900">용어집 (Glossary)</h2>
          <div className="mt-3 divide-y divide-gray-100 rounded-xl border-2 border-gray-200 bg-white">
            {glossary.map((g) => (
              <div key={g.id} className="px-4 py-3">
                <p className="font-medium text-gray-900">{g.term}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{g.definition_ko}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
