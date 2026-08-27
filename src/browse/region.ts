import type { School } from '../lib/types'
import { bilingual } from '../i18n'

// 지역 필터용 — 미국 표준 4대 지역 (사실 기반 지리 분류)
export type Region = 'northeast' | 'south' | 'midwest' | 'west'

export const regionLabels: Record<Region, string> = bilingual(
  { northeast: '동부', south: '남부', midwest: '중서부', west: '서부' },
  { northeast: 'Northeast', south: 'South', midwest: 'Midwest', west: 'West' },
)

// 63개교 확정 분류 (id는 logos.ts와 동일한 시드 id) — 소개문 언어(KO/EN)와 무관하게 안정적으로 동작
const REGION_BY_ID: Record<number, Region> = {
  1: 'northeast', 2: 'northeast', 3: 'northeast', 4: 'west', 5: 'northeast',
  6: 'midwest', 7: 'south', 8: 'south', 9: 'midwest', 10: 'northeast',
  11: 'west', 12: 'northeast', 13: 'northeast', 14: 'northeast', 15: 'northeast',
  16: 'west', 17: 'south', 18: 'west', 19: 'south', 20: 'northeast',
  21: 'midwest', 22: 'midwest', 23: 'midwest', 24: 'south', 25: 'south',
  26: 'south', 27: 'south', 28: 'west', 29: 'west', 30: 'south',
  31: 'south', 32: 'south', 33: 'northeast', 34: 'west', 35: 'west',
  36: 'northeast', 37: 'northeast', 38: 'midwest', 39: 'midwest', 40: 'west',
  41: 'midwest', 42: 'northeast', 43: 'northeast', 44: 'south', 45: 'west',
  46: 'northeast', 47: 'northeast', 48: 'midwest', 49: 'south', 50: 'northeast',
  51: 'midwest', 52: 'south', 53: 'south', 54: 'south', 55: 'south',
  56: 'south', 57: 'west', 58: 'northeast', 59: 'south', 60: 'northeast',
  61: 'west', 62: 'northeast', 63: 'midwest',
  // 60~100위 확장 (2026-08)
  100: 'midwest',
  101: 'south',
  102: 'northeast',
  103: 'northeast',
  104: 'south',
  105: 'northeast',
  106: 'south',
  107: 'northeast',
  108: 'northeast',
  109: 'northeast',
  110: 'south',
  111: 'northeast',
  112: 'northeast',
  113: 'northeast',
  114: 'west',
  115: 'west',
  116: 'northeast',
  117: 'northeast',
  118: 'northeast',
  119: 'west',
  120: 'midwest',
  121: 'northeast',
  122: 'northeast',
  123: 'south',
  124: 'south',
  125: 'south',
  126: 'midwest',
  127: 'northeast',
  128: 'south',
  129: 'west',
  130: 'south',
  131: 'south',
  132: 'south',
  133: 'northeast',
  134: 'northeast',
  135: 'south',
  136: 'west',
}

// 신규 학교 폴백 — intro/location_note의 주(州)·도시 표기(한/영)에서 유도
const KEYWORD_REGION: [string, Region][] = [
  // 동부 (Northeast)
  ['뉴저지', 'northeast'], ['New Jersey', 'northeast'], [', NJ', 'northeast'],
  ['매사추세츠', 'northeast'], ['Massachusetts', 'northeast'], [', MA', 'northeast'],
  ['보스턴', 'northeast'], ['Boston', 'northeast'],
  ['코네티컷', 'northeast'], ['Connecticut', 'northeast'], [', CT', 'northeast'],
  ['뉴욕', 'northeast'], ['New York', 'northeast'], [', NY', 'northeast'],
  ['뉴햄프셔', 'northeast'], ['New Hampshire', 'northeast'],
  ['로드아일랜드', 'northeast'], ['Rhode Island', 'northeast'],
  ['펜실베이니아', 'northeast'], ['Pennsylvania', 'northeast'], [', PA', 'northeast'],
  ['필라델피아', 'northeast'], ['Philadelphia', 'northeast'],
  ['피츠버그', 'northeast'], ['Pittsburgh', 'northeast'],
  ['메인', 'northeast'], ['Maine', 'northeast'], [', ME', 'northeast'],
  ['버몬트', 'northeast'], ['Vermont', 'northeast'], [', VT', 'northeast'],
  // 남부 (South)
  ['노스캐롤라이나', 'south'], ['North Carolina', 'south'],
  ['메릴랜드', 'south'], ['Maryland', 'south'],
  ['볼티모어', 'south'], ['Baltimore', 'south'],
  ['워싱턴 D.C', 'south'], ['Washington, D.C', 'south'],
  ['버지니아', 'south'], ['Virginia', 'south'],
  ['조지아', 'south'], ['Georgia', 'south'],
  ['애틀랜타', 'south'], ['Atlanta', 'south'],
  ['플로리다', 'south'], ['Florida', 'south'],
  ['텍사스', 'south'], ['Texas', 'south'],
  ['휴스턴', 'south'], ['Houston', 'south'],
  ['테네시', 'south'], ['Tennessee', 'south'],
  ['내슈빌', 'south'], ['Nashville', 'south'],
  ['켄터키', 'south'], ['Kentucky', 'south'],
  // 중서부 (Midwest)
  ['미네소타', 'midwest'], ['Minnesota', 'midwest'],
  ['아이오와', 'midwest'], ['Iowa', 'midwest'],
  ['오하이오', 'midwest'], ['Ohio', 'midwest'],
  ['위스콘신', 'midwest'], ['Wisconsin', 'midwest'],
  ['미시간', 'midwest'], ['Michigan', 'midwest'],
  ['일리노이', 'midwest'], ['Illinois', 'midwest'],
  ['시카고', 'midwest'], ['Chicago', 'midwest'],
  ['인디애나', 'midwest'], ['Indiana', 'midwest'],
  ['미주리', 'midwest'], ['Missouri', 'midwest'],
  ['세인트루이스', 'midwest'], ['St. Louis', 'midwest'],
  ['미시간', 'midwest'], ['Michigan', 'midwest'],
  ['위스콘신', 'midwest'], ['Wisconsin', 'midwest'],
  ['오하이오', 'midwest'], ['Ohio', 'midwest'],
  ['미네소타', 'midwest'], ['Minnesota', 'midwest'],
  // 서부 (West)
  ['캘리포니아', 'west'], ['California', 'west'], [', CA', 'west'],
  ['콜로라도', 'west'], ['Colorado', 'west'], [', CO', 'west'],
  ['로스앤젤레스', 'west'], ['Los Angeles', 'west'],
  ['패서디나', 'west'], ['Pasadena', 'west'],
  ['버클리', 'west'], ['Berkeley', 'west'],
  ['샌디에이고', 'west'], ['San Diego', 'west'],
  ['스탠퍼드', 'west'], ['Stanford', 'west'],
  ['워싱턴주', 'west'], ['Seattle', 'west'], ['시애틀', 'west'],
]

export function schoolRegion(s: School): Region | null {
  const fixed = REGION_BY_ID[s.id]
  if (fixed) return fixed
  // 소재지를 직접 서술하는 intro를 먼저, 주변 도시까지 언급하는 location_note를 나중에 검사
  for (const text of [s.intro_ko ?? '', s.location_note ?? '']) {
    for (const [kw, region] of KEYWORD_REGION) {
      if (text.includes(kw)) return region
    }
  }
  return null
}
