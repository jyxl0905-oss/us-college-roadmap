import { useEffect, useRef, useState } from 'react'
import type { QuizAnswer, QuizItem } from '../lib/types'
import { supabase } from '../lib/supabase'

const AUTO_ADVANCE_MS = 2800

interface QuizStepProps {
  onDone: (answers: QuizAnswer[]) => void
}

// R1-A①: 입시 상식 OX 퀴즈 — 게임 프레임(보상 구간), 즉답+2줄 해설, 자동 진행
export default function QuizStep({ onDone }: QuizStepProps) {
  const [items, setItems] = useState<QuizItem[] | null>(null)
  const [phase, setPhase] = useState<'intro' | 'question' | 'result'>('intro')
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<boolean | null>(null) // 현재 문항에서 고른 답
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!supabase) {
      onDone([])
      return
    }
    supabase
      .from('quiz_items')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        const list = (data ?? []) as QuizItem[]
        if (list.length === 0) onDone([])
        else setItems(list)
      })
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <p className="mt-16 text-center text-gray-400">불러오는 중…</p>

  const item = items[index]
  const correctCount = answers.filter((a) => a.correct).length

  const next = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setPicked(null)
    if (index + 1 < items.length) setIndex(index + 1)
    else setPhase('result')
  }

  const pick = (choice: boolean) => {
    if (picked !== null) return
    setPicked(choice)
    setAnswers((prev) => [...prev, { id: item.id, answer: choice, correct: choice === item.answer }])
    // 해설 노출 후 자동 진행 (탭하면 즉시)
    timerRef.current = window.setTimeout(next, AUTO_ADVANCE_MS)
  }

  if (phase === 'intro') {
    return (
      <div className="mt-8 text-center">
        <p className="text-4xl">🎯</p>
        <h1 className="mt-4 text-xl font-bold text-gray-900">잠깐 퀴즈 — 몇 개 맞출 수 있을까요?</h1>
        <p className="mt-2 text-sm text-gray-500">
          미국 입시 상식 OX {items.length}문제. 부담 없이 찍어도 돼요 — 바로 정답과 이유를 알려드려요.
        </p>
        <button
          onClick={() => setPhase('question')}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          시작하기
        </button>
      </div>
    )
  }

  if (phase === 'result') {
    const comment =
      correctCount >= 4
        ? '감이 좋은데요? 리포트에서 디테일을 더 채워봐요.'
        : correctCount >= 2
          ? '절반쯤 알고 있네요 — 나머지는 리포트가 채워줄 거예요.'
          : '지금 몰라도 돼요 — 이 툴이 알려주는 게 바로 그거니까요.'
    return (
      <div className="mt-8 text-center">
        <p className="text-4xl">{correctCount >= 4 ? '🏆' : correctCount >= 2 ? '👍' : '🌱'}</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          {items.length}개 중 {correctCount}개!
        </h1>
        <p className="mt-2 text-sm text-gray-500">{comment}</p>
        <button
          onClick={() => onDone(answers)}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
        >
          다음
        </button>
      </div>
    )
  }

  const revealed = picked !== null
  const wasCorrect = revealed && picked === item.answer

  return (
    <div onClick={revealed ? next : undefined}>
      <p className="text-sm font-medium text-blue-600">
        퀴즈 {index + 1} / {items.length}
      </p>
      <h1 className="mt-2 text-xl font-bold leading-relaxed text-gray-900">{item.question}</h1>

      <div className="mt-6 flex gap-3">
        {[true, false].map((choice) => {
          const label = choice ? 'O' : 'X'
          const isAnswer = revealed && item.answer === choice
          const isPickedWrong = revealed && picked === choice && !isAnswer
          return (
            <button
              key={label}
              onClick={(e) => {
                e.stopPropagation()
                pick(choice)
              }}
              disabled={revealed}
              className={`flex-1 rounded-2xl border-2 py-8 text-4xl font-bold transition-colors ${
                isAnswer
                  ? 'border-green-500 bg-green-50 text-green-600'
                  : isPickedWrong
                    ? 'border-red-300 bg-red-50 text-red-400'
                    : revealed
                      ? 'border-gray-100 bg-white text-gray-200'
                      : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3.5">
          <p className="font-semibold text-blue-900">
            {wasCorrect ? '정답이에요! 🎉' : `정답은 ${item.answer ? 'O' : 'X'}예요`}
          </p>
          <div className="mt-1 space-y-0.5">
            {item.explanation_2lines.split('\n').map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-blue-800">
                {line}
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-blue-400">잠시 후 다음 문제로 — 탭하면 바로 넘어가요</p>
        </div>
      )}
    </div>
  )
}
