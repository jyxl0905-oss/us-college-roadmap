import { navigate } from '../lib/router'
import { t } from '../i18n'
import { majorsByTrack, majorDisplay } from '../data/majors'

// 전공 알아보기 — 전체 전공 카드 인덱스 (로그인 불필요). 각 카드는 전공 가이드 맵으로
export default function MajorsIndexPage() {
  const section = (title: string, track: 'stem' | 'liberal') => (
    <div className="mt-5">
      <h2 className="text-sm font-semibold text-gray-500">{title}</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {majorsByTrack(track).map((m) => (
          <button
            key={m.value}
            onClick={() => navigate(`/major/${m.value}`)}
            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-left text-sm font-medium text-gray-900 active:bg-gray-50"
          >
            {majorDisplay(m)}
            <span className="mt-0.5 block text-xs font-normal text-gray-400">{t('가이드 맵 →', 'Guide map →')}</span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="text-xl font-bold text-gray-900">🗺️ {t('전공 알아보기', 'Explore majors')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('전공마다 추천 AP, 활동 방향, 4년 로드맵을 정리했어요. 편집 가이드 — 정답이 아니라 출발점이에요.', 'Recommended APs, activity directions and a 4-year roadmap for each major. An editorial guide — a starting point, not the answer.')}
        </p>
        <button
          onClick={() => navigate('/major/undecided')}
          className="mt-4 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-left active:bg-blue-100"
        >
          <span className="font-semibold text-blue-800">🤔 {t('아직 못 정했어요', 'Still undecided')}</span>
          <span className="mt-0.5 block text-xs text-blue-700">{t('미정인 채로 강하게 준비하는 법부터 보세요', 'Start with how to prepare strongly while undecided')}</span>
        </button>
        {section(t('이과 계열 (STEM)', 'STEM'), 'stem')}
        {section(t('문과 계열 (Humanities & Social)', 'Humanities & Social'), 'liberal')}
      </div>
    </div>
  )
}
