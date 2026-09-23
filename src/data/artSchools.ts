import schoolsIndex from './schools.index.json'

// 미술·디자인 전문학교(kind='art') + 예술대학 정보가 있는 종합대(예: UCLA) 자동 추천 — 학생 전공이 아래 창작 계열이면,
// 그 전공을 공식 개설한 학교만 골라 보여줌 (개설 전공은 각 학교 공식 입학처 확인분: art_programs)
export const ART_MAJORS = ['arts', 'graphic_design', 'fashion_design', 'film', 'architecture', 'game_design', 'music']

export const isArtMajor = (m: string | null | undefined): boolean => !!m && ART_MAJORS.includes(m)

export interface ArtSchoolLite {
  id: number
  name: string
  name_ko: string
  kind?: string
  art_programs?: string[] | null
  overall_accept_rate?: number | null
}

// 전문학교 먼저, 그다음 예술대학이 있는 종합대
const artSchools = (schoolsIndex as ArtSchoolLite[])
  .filter((s) => s.kind === 'art' || (s.art_programs ?? []).length > 0)
  .sort((a, b) => (a.kind === 'art' ? 0 : 1) - (b.kind === 'art' ? 0 : 1))

// 학생의 1·2순위 전공 중 창작 계열과 맞는 전문학교 (1순위 매칭 먼저)
export function artSchoolsForMajors(majors: (string | null | undefined)[]): ArtSchoolLite[] {
  const wanted = majors.filter(isArtMajor) as string[]
  if (wanted.length === 0) return []
  const score = (s: ArtSchoolLite) => wanted.findIndex((m) => (s.art_programs ?? []).includes(m))
  return artSchools
    .filter((s) => score(s) >= 0)
    .sort((a, b) => score(a) - score(b) || (a.kind === 'art' ? 0 : 1) - (b.kind === 'art' ? 0 : 1) || a.id - b.id)
}

export const artSchoolCount = artSchools.filter((s) => s.kind === 'art').length
