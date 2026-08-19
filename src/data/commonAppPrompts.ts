// Common App 공통 에세이(Personal Essay) 문항 — 공식 문구(영문) 그대로 + 한국어 요약.
// 출처: https://www.commonapp.org/apply/essay-prompts (2025-26). 매년 여름 공식 페이지에서 변경 여부 확인.
export const COMMON_APP_PROMPTS_SOURCE = 'https://www.commonapp.org/apply/essay-prompts'
export const COMMON_APP_PROMPTS_YEAR = '2025-26'
export const COMMON_APP_WORD_RANGE = '250–650'

export interface CommonAppPrompt { n: number; en: string; ko: string }
export const COMMON_APP_PROMPTS: CommonAppPrompt[] = [
  { n: 1, en: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.', ko: '내 배경·정체성·관심사·재능 중 이것 없이는 나를 설명할 수 없다 싶은 것' },
  { n: 2, en: 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?', ko: '어려움·실패를 겪은 경험 — 그게 나를 어떻게 바꿨고 뭘 배웠나' },
  { n: 3, en: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?', ko: '어떤 믿음이나 생각에 의문을 품거나 맞섰던 때 — 계기와 결과' },
  { n: 4, en: 'Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?', ko: '누군가 해준 일에 뜻밖의 고마움을 느낀 경험 — 그 감사가 나를 어떻게 움직였나' },
  { n: 5, en: 'Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.', ko: '성장의 계기가 된 성취·사건·깨달음 — 나 또는 타인을 새롭게 이해하게 된 것' },
  { n: 6, en: 'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?', ko: '시간 가는 줄 모르고 빠져드는 주제 — 왜 끌리는지, 더 알고 싶을 때 누구·무엇을 찾는지' },
  { n: 7, en: 'Share an essay on any topic of your choice. It can be one you\'ve already written, one that responds to a different prompt, or one of your own design.', ko: '자유 주제 — 이미 쓴 글, 다른 문항에 답한 글, 직접 설계한 주제 모두 가능' },
]
