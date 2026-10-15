import { supabase } from '../lib/supabase'
import { filterChecklist, profileGrade, type ProfileRow } from '../lib/profile'
import { currentSeasonLabel } from '../lib/academics'
import { localizeRows, getLang } from '../i18n'
import { majorLabel } from '../data/majors'
import { gpaBandLabels, satStatusLabels, toeflStatusLabels } from '../onboarding/labels'
import type { ChecklistItem } from '../lib/types'
import schoolsIndex from '../data/schools.index.json'

// AI 도우미에 보낼 학생 정보 요약 — 동의한 경우에만 만들고, 이름·이메일·재학 고교·활동 원문은 넣지 않음
const names = new Map((schoolsIndex as { id: number; name: string; name_ko: string | null }[]).map((s) => [s.id, getLang() === 'ko' ? s.name_ko ?? s.name : s.name]))

export async function buildAiProfile(userId: string, p: ProfileRow): Promise<Record<string, unknown>> {
  const ko = getLang() === 'ko'
  const [items, checks, tests, apps] = supabase
    ? await Promise.all([
        supabase.from('checklist_items').select('*'),
        supabase.from('user_checks').select('item_id,status').eq('user_id', userId).eq('season_label', currentSeasonLabel()),
        supabase.from('test_scores').select('kind,total').eq('user_id', userId),
        supabase.from('applications').select('school_id,round,status').eq('user_id', userId),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
  const season = filterChecklist(localizeRows((items.data ?? []) as ChecklistItem[]), p).slice(0, 15)
  const done = new Set(((checks.data ?? []) as { item_id: number; status: string }[]).filter((c) => c.status === 'done').map((c) => c.item_id))
  const best: Record<string, number> = {}
  for (const s of (tests.data ?? []) as { kind: string; total: number | null }[]) if (s.total !== null && s.total > (best[s.kind] ?? -1)) best[s.kind] = Number(s.total)
  const status = p.applicant_status === 'domestic' ? (ko ? '미국 시민권·영주권자' : 'U.S. citizen/permanent resident') : (ko ? '국제학생(유학생)' : 'International student')

  return {
    [ko ? '학년' : 'grade']: profileGrade(p),
    [ko ? '졸업연도' : 'class_of']: p.grad_year,
    [ko ? '이번_시즌' : 'season']: currentSeasonLabel(),
    [ko ? '신분' : 'status']: status,
    applicant_status: p.applicant_status,
    [ko ? '전담_카운슬러' : 'has_counselor']: p.has_counselor,
    [ko ? '희망_전공' : 'majors']: [p.major_primary, p.major_secondary].filter(Boolean).map((m) => majorLabel(m)),
    [ko ? '목표_학교' : 'target_schools']: p.target_mode === 'schools' ? p.target_school_ids.map((id) => names.get(id) ?? id) : p.target_mode === 'tier' ? `Tier ${p.target_tier}` : (ko ? '미정' : 'undecided'),
    [ko ? 'GPA_구간' : 'gpa_band']: p.gpa_band ? gpaBandLabels[p.gpa_band] ?? p.gpa_band : null,
    SAT: best.sat ?? (p.sat_status === 'taken' && p.sat_band ? p.sat_band : p.sat_status ? satStatusLabels[p.sat_status] : null),
    ACT: best.act ?? null,
    [ko ? '영어_시험' : 'english_test']: best.toefl ? `TOEFL ${best.toefl}` : best.ielts ? `IELTS ${best.ielts}` : p.toefl_status ? toeflStatusLabels[p.toefl_status] : null,
    [ko ? 'AP_이수_수강중' : 'ap_done_current']: [p.ap_completed, p.ap_current],
    [ko ? '이번_시즌_체크리스트' : 'this_season_checklist']: season.map((i) => ({ [ko ? '항목' : 'item']: i.title, [ko ? '완료' : 'done']: done.has(i.id) })),
    [ko ? '지원_라운드' : 'applications']: ((apps.data ?? []) as { school_id: number; round: string | null; status: string | null }[]).map((a) => ({ [ko ? '학교' : 'school']: names.get(a.school_id) ?? a.school_id, [ko ? '라운드' : 'round']: a.round, [ko ? '상태' : 'status']: a.status })),
  }
}
