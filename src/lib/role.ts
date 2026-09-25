import { getLang, setAudience } from '../i18n'

// 사용자 유형 — 학생 본인 / 부모. 부모면 같은 기능을 '자녀' 기준 문구로 보여줌 (기록·분석은 동일)
export type UserRole = 'student' | 'parent'
let role: UserRole = 'student'

export const getRole = (): UserRole => role
export function setRole(r: UserRole | null | undefined): void {
  const next: UserRole = r === 'parent' ? 'parent' : 'student'
  role = next // 렌더 중에 호출됨(App) — 이벤트 없이 값만 바꿈
  setAudience(next) // 공통 문구('내 ○○')도 부모 기준으로
}
export const isParent = () => role === 'parent'

// 학생용/부모용 문구 (한국어·영어) — tp('내 과목', '자녀 과목', 'My courses', 'Your child’s courses')
export function tp(koStudent: string, koParent: string, enStudent: string, enParent: string): string {
  const en = getLang() === 'en'
  return role === 'parent' ? (en ? enParent : koParent) : (en ? enStudent : koStudent)
}

// 연구 동의·연구 문항 대상: 학생 본인이고 미국 시민권·영주권자가 아닐 때만 (미국 사용자·부모는 연구 제외)
export function researchAllowed(x: { role?: string | null; status?: string | null }): boolean {
  return x.role !== 'parent' && x.status !== 'domestic'
}
