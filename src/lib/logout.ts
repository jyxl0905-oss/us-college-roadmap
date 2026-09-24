import { supabase } from './supabase'

// 로그아웃 — 공용 PC에서 다음 사람에게 이전 사용자의 입력이 넘어가지 않도록 개인 임시 저장값을 함께 지움
// (테마·언어·유입 경로처럼 개인 정보가 아닌 기기 설정은 유지)
const PERSONAL_KEYS = ['pending_answers', 'onboarding_draft', 'research_consent', 'post_login_path', 'prefill_school_id']

export async function logout(): Promise<void> {
  try {
    PERSONAL_KEYS.forEach((k) => localStorage.removeItem(k))
    sessionStorage.removeItem('compare_ids')
  } catch { /* 저장소 접근 불가(프라이빗 모드 등) — 무시 */ }
  await supabase?.auth.signOut()
}
