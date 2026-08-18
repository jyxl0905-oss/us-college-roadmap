import { getLang, t } from '../i18n'

// 학년별 "AO(입학사정관)가 지금 보는 것" — §4 승인 콘텐츠
const aoCopy: Record<number, string[]> = {
  9: [
    '미국 입시는 숫자 하나가 아니라 4년의 기록 전체를 보는 종합평가(holistic review)예요.',
    '9학년 성적도 GPA에 그대로 들어가고, 지금 만드는 공부 습관이 곧 추세의 시작점이에요.',
    'AO가 나중에 보게 될 그래프의 첫 점을 찍는 해라고 생각하면 돼요.',
  ],
  10: [
    'AO는 10학년부터 과목 선택이 한 단계씩 올라가는지(리거 상승)를 보기 시작해요.',
    '활동은 넓히는 시기가 끝나고 1~2개로 좁혀 깊이를 만들기 시작할 때예요.',
    '이번 해의 선택(11학년 AP 라인업, 남길 활동)이 11학년의 하중을 결정해요.',
  ],
  11: [
    '11학년은 원서에 들어갈 기록 대부분이 만들어지는 해예요.',
    'AO는 최고 난도 과목에서의 성적, 시험 점수, 그리고 활동이 외부에서 검증받았는지를 집중해서 봐요.',
    '이번 해의 수확이 원서의 본문이 돼요 — 다음 해는 그것을 정리하는 시간이에요.',
  ],
  12: [
    '원서를 내는 해지만, AO는 12학년 성적까지 봐요 — 추세가 꺾이면 합격 후에도 문제가 될 수 있어요.',
    '이제 새로 쌓기보다 에세이와 추천서로 4년의 기록을 하나의 이야기로 보여줄 때예요.',
    '마감 관리가 곧 실력인 해 — 남이 보내주는 서류(추천서·성적표)일수록 여유 있게 챙기세요.',
  ],
}

const aoCopyEn: Record<number, string[]> = {
  9: [
    "US admissions is holistic review — it looks at your whole 4-year record, not one number.",
    "9th-grade grades go straight into your GPA, and the study habits you build now are the starting point of your trend.",
    "Think of this as the year you plot the first point on the graph AOs will see later.",
  ],
  10: [
    "Starting in 10th grade, AOs begin looking at whether your course choices step up each year (rising rigor).",
    "The broadening phase for activities is over — it's time to narrow to 1–2 and start building depth.",
    "This year's choices (your 11th-grade AP lineup, which activities to keep) decide the load you'll carry in 11th grade.",
  ],
  11: [
    "11th grade is the year most of the record that goes into your application gets made.",
    "AOs focus on your grades in the most demanding courses, your test scores, and whether your activities were validated externally.",
    "This year's harvest becomes the body of your application — next year is the time to organize it.",
  ],
  12: [
    "It's the year you apply, but AOs look at 12th-grade grades too — if the trend dips, it can be a problem even after admission.",
    "Now it's less about building new things and more about showing 4 years of record as one story through essays and recommendations.",
    "This is the year deadline management is the skill — the more a document depends on someone else (recommendations, transcripts), the earlier you should chase it.",
  ],
}

export default function AoBox({ grade }: { grade: number }) {
  const lines = (getLang() === 'en' ? aoCopyEn : aoCopy)[Math.min(12, Math.max(9, grade))]
  return (
    <div className="rounded-xl bg-blue-600 px-4 py-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        {t(`AO가 지금 보는 것 · ${grade}학년`, `What AOs look at now · Grade ${grade}`)}
      </p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
