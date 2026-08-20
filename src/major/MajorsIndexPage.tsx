import { useState } from 'react'
import { navigate } from '../lib/router'
import { t, getLang } from '../i18n'
import { majorsByTrack, majorDisplay, majorClusters, majorCategories, type MajorCategory } from '../data/majors'
import careersData from '../data/major-careers.json'

// 검색 대상: 라벨(한·영) + 소개문 — '약대'처럼 소개에만 있는 말도 걸리게
const CAREERS = careersData as Record<string, { desc_ko: string | null; desc_en: string | null }>

// 라벨·소개에 없는 흔한 검색어 보강 (예: '약'→프리메드, '로켓'→항공우주)
const KEYWORDS: Record<string, string> = {
  cs: '코딩 개발 프로그래밍 인공지능 ai 소프트웨어 게임',
  engineering: '기계 전기 전자 토목 로봇 공대',
  industrial_eng: '물류 최적화 공정',
  biomedical_eng: '의공학 의료기기 바이오',
  chemical_eng: '화공 배터리 반도체 에너지',
  aerospace_eng: '로켓 우주 비행기 항공 위성 드론',
  math_data: '수학 통계',
  data_science: '데이터 분석 머신러닝 빅데이터',
  applied_math: '수학 모델링',
  actuarial: '보험 계리 리스크',
  natural_sci: '과학 연구',
  biology: '생물 유전 바이오',
  chemistry: '화학 신약',
  physics: '물리 천문 양자',
  neuroscience: '뇌 신경',
  environmental: '환경 기후 지속가능 에너지',
  premed: '의대 의사 약대 약사 수의대 수의사 치대 병원 메디컬',
  nursing: '간호사 병원',
  public_health: '보건 방역 역학 위생',
  kinesiology: '운동 스포츠 재활 물리치료 트레이너 체육',
  architecture: '건축 설계 도시',
  business: '경영 마케팅 창업 비즈니스',
  finance: '금융 투자 주식 은행 퀀트',
  economics: '경제',
  accounting: '회계 세무 cpa',
  sport_management: '스포츠 구단 이벤트 체육',
  social_sci: '정치 사회 국제 외교',
  prelaw: '법 변호사 로스쿨',
  psychology: '심리 상담 마음',
  sport_psychology: '스포츠 멘탈 심리 체육',
  cognitive_science: '뇌 인지 ai',
  humanities: '문학 역사 철학 영문',
  linguistics: '언어 번역 통역',
  arts: '미술 디자인 예술',
  media: '언론 기자 방송 커뮤니케이션',
  film: '영화 영상 감독 촬영',
  education: '교육 교사 선생님',
  music: '음악 악기 연주 작곡',
}

// 전공 알아보기 — 전체 전공 카드 인덱스 (로그인 불필요). 각 카드는 전공 가이드 맵으로
export default function MajorsIndexPage() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (m: MajorCategory) => {
    if (!q) return true
    const c = CAREERS[m.value]
    return (
      m.label.toLowerCase().includes(q) ||
      (c?.desc_ko ?? '').toLowerCase().includes(q) ||
      (c?.desc_en ?? '').toLowerCase().includes(q) ||
      (KEYWORDS[m.value] ?? '').includes(q)
    )
  }

  const byValue = new Map(majorCategories.map((m) => [m.value, m]))
  const section = (title: string, track: 'stem' | 'liberal') => {
    const clusters = majorClusters
      .filter((c) => c.track === track)
      .map((c) => ({ c, list: c.values.map((v) => byValue.get(v)!).filter(Boolean).filter(matches) }))
      .filter(({ list }) => list.length > 0)
    if (clusters.length === 0) return null
    return (
      <div className="mt-5">
        <h2 className="text-sm font-semibold text-gray-500">{title}</h2>
        {clusters.map(({ c, list }) => (
          <div key={c.ko} className="mt-3">
            <p className="text-xs font-medium text-gray-400">{t(c.ko, c.en)}</p>
            <div className={q ? 'mt-1.5 flex flex-col gap-2' : 'mt-1.5 flex flex-wrap gap-1.5'}>
              {list.map((m) =>
                q ? (
                  <button
                    key={m.value}
                    onClick={() => navigate(`/major/${m.value}`)}
                    className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-left text-sm font-medium text-gray-900 active:bg-gray-50"
                  >
                    {majorDisplay(m)}
                    <span className="mt-0.5 line-clamp-2 block text-xs font-normal leading-relaxed text-gray-400">
                      {(getLang() === 'en' ? CAREERS[m.value]?.desc_en : CAREERS[m.value]?.desc_ko) ?? ''}
                    </span>
                  </button>
                ) : (
                  <button
                    key={m.value}
                    onClick={() => navigate(`/major/${m.value}`)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 active:bg-gray-50"
                  >
                    {majorDisplay(m)}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6 lg:max-w-4xl">
        <h1 className="text-xl font-bold text-gray-900">🗺️ {t('전공 알아보기', 'Explore majors')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('전공마다 추천 AP, 활동 방향, 4년 로드맵을 정리했어요. 편집 가이드 — 정답이 아니라 출발점이에요.', 'Recommended APs, activity directions and a 4-year roadmap for each major. An editorial guide — a starting point, not the answer.')}
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('전공 검색 (예: 심리, data, 로켓, 약)', 'Search majors (e.g., psych, data, rockets)')}
          className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-blue-600 focus:outline-none"
        />
        {q !== '' && majorsByTrack('stem').filter(matches).length + majorsByTrack('liberal').filter(matches).length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-400">
            {t('검색 결과가 없어요 — 다른 말로 찾아보거나, 비슷한 상위 계열(공학·자연과학·사회과학 등)을 눌러보세요.', 'No results — try another word, or open a nearby broader category (engineering, natural sciences, social sciences...).')}
          </p>
        )}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          {section(t('이과 계열 (STEM)', 'STEM'), 'stem')}
          {section(t('문과 계열 (Humanities & Social)', 'Humanities & Social'), 'liberal')}
        </div>
      </div>
    </div>
  )
}
