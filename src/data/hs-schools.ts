// 온보딩 '다니는 학교' 자동완성용 — 한국 소재 국제학교·외국인학교 (통계 그룹핑을 위해 표기 통일). 목록에 없으면 직접 입력.
export const HS_SCHOOLS: string[] = [
  'Seoul International School (SIS)',
  'Korea International School (KIS) Pangyo',
  'Korea International School (KIS) Seoul',
  'Seoul Foreign School (SFS)',
  'Yongsan International School of Seoul (YISS)',
  'Chadwick International',
  'Dwight School Seoul',
  'Asia Pacific International School (APIS)',
  'Dulwich College Seoul',
  'Cheongna Dalton School',
  'Gyeonggi Suwon International School (GSIS)',
  'North London Collegiate School Jeju (NLCS Jeju)',
  'Branksome Hall Asia (BHA)',
  'Korea International School Jeju (KISJ)',
  'St. Johnsbury Academy Jeju (SJA Jeju)',
  'Busan International Foreign School (BIFS)',
  'Busan Foreign School (BFS)',
  'Daegu International School (DIS)',
  'Taejon Christian International School (TCIS)',
  'Gwangju Foreign School (GFS)',
  'International Christian School (ICS)',
]

// 검색 (영문·약어·소문자 무시)
export function searchHsSchools(q: string): string[] {
  const s = q.trim().toLowerCase()
  if (!s) return HS_SCHOOLS
  return HS_SCHOOLS.filter((n) => n.toLowerCase().includes(s))
}
