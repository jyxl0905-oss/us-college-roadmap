import { supabase } from './supabase'
import type { School } from './types'

// '순위대만' 목표 학생용 학교 목록 — 해당 티어 전체(최대 70여 곳)가 아니라 종합대 상위 10곳만 (원서 보드·리포트·PDF가 과도하게 길어지지 않도록)
export const TIER_SAMPLE = 10

export const tierSchoolsQuery = (tier: number | null) =>
  supabase!.from('schools').select('*').eq('tier', tier ?? -1).eq('kind', 'university').order('usnews_rank', { ascending: true }).limit(TIER_SAMPLE)

export const tierSchoolsFrom = (all: School[], tier: number | null): School[] =>
  all
    .filter((s) => s.tier === tier && (s.kind ?? 'university') === 'university')
    .sort((a, b) => (a.usnews_rank ?? 9999) - (b.usnews_rank ?? 9999))
    .slice(0, TIER_SAMPLE)
