// 학년별 "AO(입학사정관)가 지금 보는 것" — 편집 콘텐츠
const aoCopy: Record<number, string[]> = {
  9: [
    'AO는 9학년에게 완성된 스펙을 기대하지 않아요.',
    '지금은 수업 난이도를 감당하는 성적 흐름과, 관심사를 넓게 탐색하는 모습이 중요해요.',
    "활동은 '무엇을 오래 할 수 있을지' 후보를 찾는 시기예요.",
  ],
  10: [
    '10학년부터 AO는 성적의 상승세와 과목 선택의 도전성을 보기 시작해요.',
    '활동은 탐색을 좁혀 1~2개에 깊이를 만들기 시작할 때예요.',
    'SAT 등 표준시험 준비 계획도 이번 해에 세우는 게 좋아요.',
  ],
  11: [
    '11학년은 입시의 중심 학년이에요.',
    'AO는 최고 난도 과목에서의 성적, SAT 점수, 활동의 리더십과 성과를 집중해서 봐요.',
    '이번 해의 기록이 원서의 대부분을 만들어요.',
  ],
  12: [
    '12학년 Fall은 원서 그 자체예요.',
    '에세이·추천서·지원 전략(ED/EA/RD)이 결과를 좌우해요.',
    '성적은 끝까지 유지해야 해요 — 합격 후에도 최종 성적표가 제출돼요.',
  ],
}

export default function AoBox({ grade }: { grade: number }) {
  const lines = aoCopy[Math.min(12, Math.max(9, grade))]
  return (
    <div className="rounded-xl bg-blue-600 px-4 py-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        AO가 지금 보는 것 · {grade}학년
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
