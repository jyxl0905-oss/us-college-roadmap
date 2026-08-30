import { t } from '../i18n'

// 온보딩 게이트 — 리포트·체크리스트 진입 시(온보딩 미완료) 보여주는 화면.
// 규칙: 자물쇠 아이콘 금지(유료처럼 보임), 블러 처리된 샘플 미리보기 + 문구 + 버튼 하나.
export default function ReportGate({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-8">
      <h1 className="text-xl font-bold text-gray-900">📊 {t('입시 리포트 · 시즌 체크리스트', 'Admissions report · season checklist')}</h1>

      {/* 블러 샘플 — 실제 리포트 구성(진행률·6축·체크리스트)을 흉내낸 정적 미리보기 */}
      <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-gray-200 bg-white">
        <div className="pointer-events-none select-none p-4 blur-[6px]" aria-hidden="true">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-300" />
            <div className="h-4 w-16 rounded bg-blue-200" />
          </div>
          <div className="mt-3 h-2.5 w-full rounded-full bg-gray-100">
            <div className="h-2.5 w-2/3 rounded-full bg-blue-400" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-2">
                <div className="h-2.5 w-10 rounded bg-gray-200" />
                <div className="mt-1.5 h-3.5 w-7 rounded bg-gray-300" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-gray-100 p-2.5">
                <div className="h-4 w-4 rounded border-2 border-gray-300" />
                <div className="h-2.5 flex-1 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-gray-900/70 px-2.5 py-1 text-[11px] font-medium text-white">
          {t('예시 화면', 'Sample view')}
        </span>
      </div>

      <p className="mt-5 text-center font-medium leading-relaxed text-gray-800">
        {t('학년·전공을 알려주면,', 'Tell us your grade and major,')}
        <br />
        {t('너에게 맞는 것만 골라서 보여줄게 (5분)', 'and we’ll show only what fits you (5 min)')}
      </p>
      <p className="mt-2 text-center text-xs text-gray-400">
        {t('무료입니다 · 입력한 정보는 본인만 볼 수 있어요', 'It’s free · what you enter is visible only to you')}
      </p>

      <button onClick={onStart} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-4 font-semibold text-white active:bg-blue-700">
        {t('지금 알려주기', 'Tell us now')}
      </button>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        {t('중간에 나가도 답변은 저장돼요 — 이어서 할 수 있어요', 'Leave anytime — your answers are saved so you can pick up later')}
      </p>
    </div>
  )
}
