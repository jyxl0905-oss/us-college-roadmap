// 운영자 이메일 — UI 노출 판단용. 실제 권한은 DB 함수 admin_stats()의 화이트리스트가 검사함
export const ADMIN_EMAILS = ['j.yxl0905@gmail.com', 'a01024160890@gmail.com']
export const isAdminEmail = (email: string | null | undefined): boolean => !!email && ADMIN_EMAILS.includes(email.toLowerCase())
