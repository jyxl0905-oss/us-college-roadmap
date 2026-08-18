import type { School } from '../lib/types'
import { bilingual } from '../i18n'

// 지역 필터용 — intro_ko/location_note의 주(州) 표기에서 미국 표준 4대 지역을 유도 (사실 기반 지리 분류)
export type Region = 'northeast' | 'south' | 'midwest' | 'west'

export const regionLabels: Record<Region, string> = bilingual(
  { northeast: '동부', south: '남부', midwest: '중서부', west: '서부' },
  { northeast: 'Northeast', south: 'South', midwest: 'Midwest', west: 'West' },
)

const KEYWORD_REGION: [string, Region][] = [
  // 동부 (Northeast)
  ['뉴저지', 'northeast'],
  ['매사추세츠', 'northeast'],
  ['보스턴', 'northeast'],
  ['코네티컷', 'northeast'],
  ['뉴욕', 'northeast'],
  ['뉴햄프셔', 'northeast'],
  ['로드아일랜드', 'northeast'],
  ['펜실베이니아', 'northeast'],
  ['필라델피아', 'northeast'],
  ['피츠버그', 'northeast'],
  // 남부 (South)
  ['노스캐롤라이나', 'south'],
  ['메릴랜드', 'south'],
  ['볼티모어', 'south'],
  ['워싱턴 D.C', 'south'],
  ['버지니아', 'south'],
  ['조지아', 'south'],
  ['애틀랜타', 'south'],
  ['플로리다', 'south'],
  ['텍사스', 'south'],
  ['휴스턴', 'south'],
  ['테네시', 'south'],
  ['내슈빌', 'south'],
  // 중서부 (Midwest)
  ['일리노이', 'midwest'],
  ['시카고', 'midwest'],
  ['인디애나', 'midwest'],
  ['미주리', 'midwest'],
  ['세인트루이스', 'midwest'],
  ['미시간', 'midwest'],
  ['위스콘신', 'midwest'],
  ['오하이오', 'midwest'],
  ['미네소타', 'midwest'],
  // 서부 (West)
  ['캘리포니아', 'west'],
  ['로스앤젤레스', 'west'],
  ['패서디나', 'west'],
  ['버클리', 'west'],
  ['샌디에이고', 'west'],
  ['스탠퍼드', 'west'],
  ['워싱턴주', 'west'],
  ['시애틀', 'west'],
]

export function schoolRegion(s: School): Region | null {
  const text = `${s.intro_ko ?? ''} ${s.location_note ?? ''}`
  // '워싱턴주/시애틀'이 '워싱턴 D.C'보다 먼저 걸리지 않도록 D.C를 먼저 검사
  if (text.includes('D.C')) return 'south'
  for (const [kw, region] of KEYWORD_REGION) {
    if (text.includes(kw)) return region
  }
  return null
}
