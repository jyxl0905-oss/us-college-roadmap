import { useEffect, useState } from 'react'
import { t, localizeRows } from '../i18n'
import type { ChecklistItem, OnboardingAnswers, School } from '../lib/types'
import { supabase } from '../lib/supabase'
import { answersToRow, countStoryExposure, filterChecklist, profileGrade } from '../lib/profile'
import { currentSeason, seasonLabelKo } from '../lib/academics'
import { computeScores, weakestAxis, axisKo, axisDiagnosis, storyAxisTooltip } from '../lib/score'
import RadarChart from './RadarChart'
import AoBox from './AoBox'
import SchoolCards from './SchoolCards'
import ChecklistSection from './ChecklistSection'

const VISIBLE_ITEMS = 3

interface PreviewReportProps {
  answers: OnboardingAnswers
  onContinue: () => void // 이메일 입력으로
}

// 온보딩 직후 리포트 프리뷰 — 차트와 일부 항목만 보여주고 나머지는 블러
export default function PreviewReport({ answers, onContinue }: PreviewReportProps) {
  const profile = answersToRow(answers, '')
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [storyExposed, setStoryExposed] = useState(1)

  const grade = profileGrade(profile)
  // 프리뷰는 체크 전이므로 자가진단·프로필 기반 (스토리 준비는 0/노출 수)
  const scores = computeScores(profile, [], { done: 0, exposed: storyExposed })
  const weakest = weakestAxis(scores)

  // schools·checklist_items는 공개 읽기라 로그인 전에도 조회 가능
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('checklist_items')
      .select('*')
      .then(({ data }) => {
        if (data) {
          const all = localizeRows(data as ChecklistItem[])
          setItems(filterChecklist(all, profile))
          setStoryExposed(countStoryExposure(all, profile))
        }
      })
    const schoolsQuery =
      profile.target_mode === 'schools'
        ? supabase.from('schools').select('*').in('id', profile.target_school_ids)
        : profile.target_mode === 'tier' && profile.target_tier
          ? supabase.from('schools').select('*').eq('tier', profile.target_tier)
          : null
    schoolsQuery?.then(({ data }) => {
      if (data) setSchools(localizeRows(data as School[]).sort((a, b) => a.usnews_rank - b.usnews_rank))
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleItems = items.slice(0, VISIBLE_ITEMS)
  const blurredItems = items.slice(VISIBLE_ITEMS)
  const emptyChecked = new Set<number>()

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold text-gray-900">{t('리포트가 준비됐어요! 🎯', 'Your report is ready! 🎯')}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t(`${grade < 9 ? '예비 9' : grade}학년 · ${seasonLabelKo[currentSeason()]} 시즌 기준`, `Grade ${grade < 9 ? 'rising 9' : grade} · ${currentSeason()} season`)}
      </p>

      <div className="mt-5">
        <AoBox grade={grade} />
      </div>

      <div className="mt-5 rounded-xl border-2 border-gray-200 bg-white px-4 py-4">
        <p className="font-semibold text-gray-900">{t('내 6축 밸런스', 'My 6-axis balance')}</p>
        <div className="mt-2">
          <RadarChart scores={scores} />
        </div>
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
          <strong>{axisKo[weakest]}</strong>{' '}
          {weakest === 'story' ? t('축은 아직 채워지는 중이에요.', 'axis is still filling in.') : t('축이 가장 약해요.', 'axis is your weakest.')}{' '}
          {axisDiagnosis[weakest]}
        </p>
        <details className="mt-2 text-xs text-gray-400">
          <summary className="cursor-pointer select-none">{t("ⓘ '스토리 준비' 축이란?", 'ⓘ What is the “Story” axis?')}</summary>
          <p className="mt-1 leading-relaxed text-gray-500">{storyAxisTooltip()}</p>
        </details>
      </div>

      <div className="mt-5">
        <h2 className="font-semibold text-gray-900">{t('이번 시즌 체크리스트', 'This season’s checklist')}</h2>
        <div className="mt-3">
          <ChecklistSection items={visibleItems} checkedIds={emptyChecked} />
        </div>
      </div>

      {/* 블러 처리된 나머지 — 이메일 입력 유도 */}
      <div className="relative mt-3 min-h-80 overflow-hidden">
        <div className="pointer-events-none select-none opacity-60 blur-[10px]" aria-hidden>
          <ChecklistSection items={blurredItems.slice(0, 3)} checkedIds={emptyChecked} />
          {schools.length > 0 && (
            <div className="mt-5">
              <h2 className="font-semibold text-gray-900">{t('목표 학교 분석', 'Target school analysis')}</h2>
              <div className="mt-3">
                <SchoolCards
                  schools={schools.slice(0, 2)}
                  satBand={profile.sat_status === 'taken' ? profile.sat_band : null}
                  majorPrimary={profile.major_primary}
                />
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-gray-50/80 to-gray-50 px-4">
          <div className="w-full max-w-xs rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-lg">
            <p className="text-center font-semibold text-gray-900">
              {t('나머지 체크리스트와 학교 분석이 기다리고 있어요', 'The rest of your checklist and school analysis are waiting')}
            </p>
            <p className="mt-1 text-center text-sm text-gray-500">
              {t('이메일 하나면 전체 리포트를 무료로 받을 수 있어요', 'Just an email gets you the full report — free')}
            </p>
            <button
              onClick={onContinue}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white active:bg-blue-700"
            >
              {t('이메일로 전체 리포트 받기', 'Get the full report by email')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
