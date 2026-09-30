import { useEffect, useMemo, useState } from 'react'
import { PenLine, ExternalLink, Check, Lightbulb } from 'lucide-react'
import { t } from '../i18n'
import { goBack } from '../lib/router'
import data from '../data/essays-that-worked.json'

// 대학이 자기 공식 사이트에 공개한 합격 에세이 분석 — 원문은 옮기지 않고 요약·분석 + 공식 원문 링크 (사용자 승인 2026-09-29)
interface Essay {
  i: number; school: string; y: number | null; url: string; title: string | null; type: string; len: string
  topic: string; st: string; tech: string[]; sum: [string, string]; ao: [string, string] | null; take: [string, string]; intl: boolean; kr: boolean
}
const essays = (data as unknown as { essays: Essay[] }).essays

const TOPIC: Record<string, [string, string]> = {
  family: ['가족', 'Family'], culture_identity: ['문화·정체성', 'Culture & identity'], language: ['언어', 'Language'], hobby: ['취미', 'Hobby'], object: ['물건', 'An object'], place: ['장소', 'A place'], food: ['음식', 'Food'], work_job: ['일·아르바이트', 'Work'], learning_curiosity: ['배움·호기심', 'Learning & curiosity'], failure_setback: ['실패·좌절', 'Failure & setback'], community_service: ['봉사·공동체', 'Service & community'], sports: ['운동', 'Sports'], arts_music: ['예술·음악', 'Arts & music'], science_tech: ['과학·기술', 'Science & tech'], humor_everyday: ['일상·유머', 'Everyday & humor'], other: ['기타', 'Other'],
}
const STRUCT: Record<string, [string, string]> = {
  single_moment: ['한 장면에 집중', 'One moment'], extended_metaphor: ['하나의 비유로 끝까지', 'Extended metaphor'], list_montage: ['여러 장면 나열', 'Montage'], chronological_arc: ['시간 순서', 'Chronological'], letter_or_unusual_format: ['편지·특이한 형식', 'Unusual format'], dialogue_scene: ['대화 장면', 'Dialogue scene'], reflection_essay: ['생각 정리형', 'Reflective'],
}
const TECH: Record<string, [string, string]> = {
  small_specific_moment: ['작고 구체적인 순간', 'Small, specific moment'], unusual_object_or_hobby: ['의외의 물건·취미', 'Unexpected object/hobby'], humor: ['유머', 'Humor'], vulnerability: ['약한 모습 드러내기', 'Vulnerability'], clear_growth_or_insight: ['분명한 성장·깨달음', 'Clear growth/insight'], strong_distinct_voice: ['자기만의 목소리', 'Distinct voice'], vivid_sensory_detail: ['생생한 감각 묘사', 'Sensory detail'], connects_to_future_or_college: ['미래·대학과 연결', 'Links to future/college'], turns_common_topic_fresh: ['흔한 소재를 새롭게', 'Fresh take on a common topic'], shows_intellectual_curiosity: ['지적 호기심', 'Intellectual curiosity'], cultural_perspective: ['문화적 시각', 'Cultural perspective'], community_impact: ['공동체에 준 영향', 'Community impact'],
}
const TYPE: Record<string, [string, string]> = {
  personal: ['메인 에세이', 'Personal essay'], why_us: ['Why us 보충', 'Why us'], community: ['공동체 보충', 'Community'], activity: ['활동 보충', 'Activity'], short_answer: ['짧은 답변', 'Short answer'], other: ['기타 보충', 'Other supplement'],
}
const SCHOOL_KO: Record<string, string> = {
  'Johns Hopkins University': '존스홉킨스', 'Hamilton College': '해밀턴 칼리지', 'Olin College of Engineering': '올린 공대', 'Connecticut College': '코네티컷 칼리지', 'Massachusetts Institute of Technology': 'MIT', 'University of Georgia': '조지아대',
}
const L = (p: [string, string] | undefined) => (p ? t(p[0], p[1]) : '')

const INSIGHTS: [string, string, string, string][] = [
  ['소재보다 "배운 것을 다른 데 쓰는 모습"', '비행 경험을 저널리즘에, 스쿼시에서 배운 걸 다른 영역에 옮긴 것처럼 — 입학처 코멘트가 가장 자주 짚은 점이에요.', 'What you do with the lesson matters more than the topic', 'Flying applied to journalism, squash lessons carried elsewhere — the point admissions comments raised most often.'],
  ['평범한 소재로 충분해요', '팬케이크, 옷장 정리, 짐 싸기, 종이학, 교내 방송. "인상적인 건 종이학 1,000마리가 아니라 그 일화가 보여준 것"이라는 코멘트도 있어요.', 'Ordinary topics are enough', 'Pancakes, a closet clean-out, packing, paper cranes, the school intercom. One comment: what impressed was not the 1,000 cranes but what the story revealed.'],
  ['흔한 소재는 각도를 바꿔요', '부상 회복을 정원 가꾸기 비유로 풀거나, 봉사 경험은 읽는 사람이 그 순간을 느끼게 썼어요.', 'Give common topics a new angle', 'An injury recovery told through a gardening metaphor; a service trip written so the reader can feel the moment.'],
  ['끝까지 "나"의 이야기로', '중요한 사람에 대한 에세이는 그 사람 이야기가 되기 쉬워요. 좋은 예시는 끝까지 글쓴이가 배운 것에 초점이 있었어요.', 'Keep the focus on you', 'Essays about an important person often drift into being about them; the strong ones stayed on what the writer learned.'],
  ['원서 다른 곳에 없는 걸 더해요', '성적표·활동 목록에 없는 관심사, 또는 이미 적은 활동이 "왜" 중요했는지를 보여줬어요.', 'Add what the rest of the application can’t', 'Interests missing from the transcript and activity list — or why a listed activity really mattered.'],
  ['특이한 형식은 내용이 받쳐줄 때만', '입학처는 특이한 형식의 에세이에 대해 "모두에게 통하진 않는다, 내용이 탄탄해서 통했다"고 했어요.', 'Unusual formats only work with strong content', 'Admissions noted an unusual format "won’t work for everyone" and worked because the content was strong.'],
  ['메인 에세이 ≠ 전공 소개서, Why us = 구체적 연결', '메인 에세이는 전공을 결론으로 삼지 않아도 되고, Why us는 학교의 구체적인 수업·프로그램과 이어야 해요.', 'Personal essay ≠ major statement; Why us = specifics', 'The personal essay needn’t argue for a major; Why-us essays connected to specific courses and programs.'],
  ['완벽한 문장보다 자기 목소리', '조지아대는 "모든 지원자에게 이 수준을 기대하지 않는다"며 예시와 감정으로 자신을 표현하는 게 핵심이라고 했어요.', 'Your voice over polish', 'UGA said it doesn’t expect every applicant to write at this level — what matters is expressing yourself through examples and feelings.'],
]

export default function EssaysThatWorkedPage() {
  const [type, setType] = useState('all')
  const [topic, setTopic] = useState('all')
  const [st, setSt] = useState('all')
  const [tech, setTech] = useState('all')
  const [intl, setIntl] = useState(false)
  const [aoOnly, setAoOnly] = useState(false)
  const [shown, setShown] = useState(20)

  useEffect(() => {
    document.title = t('대학이 공개한 합격 에세이 분석 | 미국 대입 로드맵', 'College essays that worked — analyzed | US College Roadmap')
    return () => { document.title = t('미국 대입 로드맵 — 미국 대학 입시 무료 관리 툴', 'US College Roadmap — free US college admissions planner') }
  }, [])
  useEffect(() => { setShown(20) }, [type, topic, st, tech, intl, aoOnly])

  const list = useMemo(() => essays.filter((e) =>
    (type === 'all' || (type === 'supplement' ? e.type !== 'personal' : e.type === type)) &&
    (topic === 'all' || e.topic === topic) && (st === 'all' || e.st === st) && (tech === 'all' || e.tech.includes(tech)) &&
    (!intl || e.intl) && (!aoOnly || !!e.ao)), [type, topic, st, tech, intl, aoOnly])

  const count = (k: string, v: string) => essays.filter((e) => (k === 'topic' ? e.topic === v : k === 'st' ? e.st === v : e.tech.includes(v))).length
  const select = (value: string, onChange: (v: string) => void, map: Record<string, [string, string]>, k: string, allLabel: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 rounded-lg border-2 border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700">
      <option value="all">{allLabel}</option>
      {Object.keys(map).filter((v) => count(k, v) > 0).sort((a, b) => count(k, b) - count(k, a)).map((v) => <option key={v} value={v}>{L(map[v])} ({count(k, v)})</option>)}
    </select>
  )
  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} onClick={onClick} aria-pressed={on} className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-semibold ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}>
      {on && <Check size={12} strokeWidth={2.5} />}{label}
    </button>
  )
  const schoolName = (s: string) => t(SCHOOL_KO[s] ?? s, s)

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 pb-16 lg:max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack('/')} aria-label={t('뒤로', 'Back')} className="rounded-lg p-2 text-gray-500 active:bg-gray-100">←</button>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><PenLine size={21} strokeWidth={2} />{t('합격 에세이 분석', 'Essays that worked')}</h1>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
          {t(`대학이 자기 공식 사이트에 공개한 합격생 에세이 ${essays.length}편(존스홉킨스·해밀턴·올린·코네티컷 칼리지·MIT·조지아대)을 분석했어요. 원문은 각 대학 페이지에서 읽을 수 있게 링크만 달았어요.`, `${essays.length} admitted-student essays that colleges published on their own sites (Johns Hopkins, Hamilton, Olin, Connecticut College, MIT, UGA), analyzed. Each links to the original on the college’s page.`)}
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
          {t('대학이 골라 공개한 에세이라 전체 합격생을 대표하지 않아요. 패턴은 참고용이고, "이렇게 쓰면 합격한다"는 뜻이 아니에요.', 'These essays were chosen by the colleges and don’t represent all admitted students. Use the patterns as ideas — not a formula for admission.')}
        </p>

        <h2 className="mt-5 flex items-center gap-1.5 text-sm font-bold text-gray-900"><Lightbulb size={16} strokeWidth={2} />{t('입학처 코멘트에서 반복되는 8가지', '8 things admissions comments keep saying')}</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INSIGHTS.map(([hk, bk, he, be], n) => (
            <div key={n} className="rounded-xl border-2 border-gray-200 bg-white px-3.5 py-3">
              <p className="text-[13px] font-bold text-gray-900">{n + 1}. {t(hk, he)}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{t(bk, be)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {chip(type === 'all', t('전체', 'All'), () => setType('all'))}
            {chip(type === 'personal', t('메인 에세이', 'Personal essay'), () => setType('personal'))}
            {chip(type === 'supplement', t('보충·짧은 답변', 'Supplements & short answers'), () => setType('supplement'))}
            {chip(type === 'why_us', 'Why us', () => setType('why_us'))}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {select(topic, setTopic, TOPIC, 'topic', t('소재 전체', 'Any topic'))}
            {select(st, setSt, STRUCT, 'st', t('구조 전체', 'Any structure'))}
            {select(tech, setTech, TECH, 'tech', t('기법 전체', 'Any technique'))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chip(intl, t('국제·이중문화 배경', 'International/bicultural'), () => setIntl((v) => !v))}
            {chip(aoOnly, t('입학처 코멘트 있는 것만', 'With admissions comments'), () => setAoOnly((v) => !v))}
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-gray-900">{t(`${list.length}편`, `${list.length} essay${list.length === 1 ? '' : 's'}`)}</p>
        <div className="mt-2 flex flex-col gap-2.5">
          {list.slice(0, shown).map((e) => (
            <article key={e.i} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5">
              <p className="text-[12px] font-semibold text-gray-500">{schoolName(e.school)}{e.y ? ` · Class of ${e.y}` : ''} · {L(TYPE[e.type])}</p>
              <h3 className="mt-0.5 text-[15px] font-bold text-gray-900">{e.title ?? t('(제목 없음)', '(untitled)')}{e.kr && <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-red-700">{t('한국 관련', 'Korea')}</span>}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-semibold">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{L(TOPIC[e.topic])}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{L(STRUCT[e.st])}</span>
                {e.tech.map((x) => <span key={x} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">{L(TECH[x])}</span>)}
                {e.intl && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-800">{t('국제·이중문화', 'Intl/bicultural')}</span>}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-700">{t(e.sum[0], e.sum[1])}</p>
              {e.ao && (
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-[12.5px] leading-relaxed text-green-900">
                  <span className="font-semibold">{t('입학처가 밝힌 이유', 'Why the college liked it')}</span> · {t(e.ao[0], e.ao[1])}
                </p>
              )}
              <p className="mt-2 text-[12.5px] leading-relaxed text-gray-800"><span className="font-semibold text-blue-700">{t('가져갈 점', 'Takeaway')}</span> · {t(e.take[0], e.take[1])}</p>
              <a href={e.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 underline">
                {t('대학 공식 페이지에서 원문 읽기', 'Read the original on the college’s site')}<ExternalLink size={11} />
              </a>
            </article>
          ))}
          {list.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{t('조건에 맞는 에세이가 없어요.', 'No essays match.')}</p>}
          {list.length > shown && (
            <button onClick={() => setShown((n) => n + 20)} className="rounded-xl border-2 border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50">
              {t(`더 보기 (${list.length - shown}편 남음)`, `Show more (${list.length - shown} left)`)}
            </button>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
          {t('요약·분석은 이 서비스가 작성했고, "입학처가 밝힌 이유"는 각 대학이 에세이와 함께 공개한 코멘트를 우리말로 옮긴 요지예요. 에세이 원문과 저작권은 각 대학과 글쓴이에게 있어요.', 'Summaries and analysis are ours; “why the college liked it” paraphrases the comments each college published with the essay. Essay text and copyright belong to the colleges and writers.')}
        </p>
      </div>
    </div>
  )
}
