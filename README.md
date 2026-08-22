# 미국 대입 로드맵 툴 (US College Roadmap for Korean International School Students)

한국 국제학교 학생을 위한 미국 대학 입시 시즌별 체크리스트·리포트 서비스입니다.

**🌐 서비스 주소: https://us-college-roadmap.vercel.app**

## 프로젝트 목적

미국 대학 진학을 준비하는 한국 국제학교 학생(9~12학년)에게 학년·전공·목표 학교에 맞는
시즌별(Fall / Spring / Summer, 연 3회) 체크리스트를 제공하고, 주기적으로 돌아와 진행 상황을
체크하며 4년간 스펙을 관리할 수 있게 돕습니다.

- 챗봇·런타임 AI 없음 — 모든 개인화는 사전 정의된 데이터를 프로필 조건으로 필터링하는 **규칙 기반**
- UI는 한국어, 전공·입시 용어는 영어 병기
- 모바일 우선 반응형 (대부분 폰 브라우저로 접속)

## 타깃 사용자

- 미국 대학 진학을 준비하는 한국 국제학교 재학생 (9~12학년)
- 대부분 국제학생(international applicant) 신분
- 전담 카운슬러 인프라가 약한 환경의 학생

## 데이터 출처와 설계 원칙

학교 데이터(SAT 중간 50% 범위, 국제학생 합격률, need-blind 여부 등)는 아래 공식 출처를 기반으로 합니다.

- **Common Data Set** (각 대학 공시 자료)
- **College Scorecard** (미국 교육부)
- **각 대학 공식 입학처(Admissions) 페이지**

> **원칙: 공식 데이터와 편집 가이드를 구분해 설계합니다.**
> 수치·정책(공식 출처 기반)과 서비스가 제안하는 체크리스트·조언(편집 콘텐츠)을
> 데이터 구조와 화면 표기에서 명확히 분리합니다. 모든 학교 데이터에는 `source_url`을 기록합니다.

## 기술 스택

- Vite + React + TypeScript + Tailwind CSS
- Supabase (매직 링크 이메일 로그인 / Postgres)
- Vercel 배포
- PDF/docx 내보내기: 클라이언트 사이드

## 개발

```bash
npm install
npm run dev
```

환경 변수는 `.env.example`을 복사해 `.env`를 만들어 설정합니다 (키는 절대 커밋하지 않습니다).

## 개발 진행 상황

- [x] Phase 0~5: 스캐폴딩 → 온보딩 → Supabase → 리포트 → 내보내기·체크인 → 롤오버·배포
- [x] 콘텐츠: 백본 체크리스트 51 + 전공 오버레이 72 = 123개, 처방 47·어필 7·용어집 30·기본기 5 (전부 실콘텐츠)
- [x] 연구 모듈(R1): 온보딩 OX 퀴즈 5문항·정보원 문항·연구 동의, 체크인 진로 명확성 척도 4문항 (전부 확정 실문항)
- [x] 대학 둘러보기(/schools)·비교(/compare)·마감 캘린더(/deadlines)
- [x] 내 원서 = 가상 Common App(/app): 활동 10·수상 5·시험·학업·지원 학교(라운드 칸)·에세이 — 학생 기록이 리포트 6축에 반영

## 데이터 현황 (2026-08-10 기준)

| 데이터 | 규모 | 출처·원칙 |
|---|---|---|
| schools 기본 데이터 | 63개교 (US News 2026 1~59위) | 공식 CDS·입학처, `source_url` 100% |
| direct-admit 전공 (12계열) | 63/63 — 건축·간호 포함 | 공식 입학처·학과 페이지, `docs/direct-admit-nursing-arch.md` |
| 마감 구조 (ED/ED2/EA/REA/RD + 시기 라벨) | 63/63 | 공식 입학처 페이지만, `deadlines_source_url` 100%, 검증일 기록 |
| CDS C7 Very Important 요소 | 60/63 (Brown·FSU·Virginia Tech은 공식 원문 확인 불가로 null) | 각 대학 공식 CDS 문서만, `c7_source_url` 기록 |
| 체크리스트 | 144개 (공통 51 + 전공별 93, 12계열) | 편집 콘텐츠는 `is_guide`로 구분 |
| 용어집·기본기·처방·어필 | 30 · 5 · 47 · 7 | 편집 콘텐츠 |

확인 불가 항목은 그럴듯한 추정으로 채우지 않고 null("미공개")로 표기합니다.
조사 기록: `docs/deadlines-top20-report.md`, `docs/c7-report.md`, `docs/schools-*.md`

## 남은 작업

- 매직 링크 이메일 한도(시간당 2통) — 사용자가 늘면 커스텀 SMTP(Resend 등 무료 티어) 연결 필요
- 연 1회(여름) 데이터 갱신: 학교·마감·C7 (특히 FSU 사이트 복구 시 C7 재시도, Minnesota 2025-26판 갱신)

## 언어 (i18n)
- UI: 한국어/영어 토글 (`src/i18n`, `t()`·`bilingual()`), localStorage `lang`
- DB 콘텐츠: 한국어 원문 + `*_en` 컬럼 (checklist_items·prescriptions·appeal_strategies·glossary·basics·quiz_items·clarity_items·schools). 영어값이 없으면 한국어 표시. 시드: `supabase/seed-i18n-en.sql`, 검토 문서: `docs/i18n-review/`
- 전공 가이드 맵: `src/data/major-roadmaps.json` / `.en.json`

## 재정지원·장학금 데이터
- 출처: 각 대학 Common Data Set 섹션 H6(국제학생 지원 인원·평균)과 공식 재정지원/장학금 페이지만. 추정치 없음, 미확인은 null(화면 비표시).
- 지원 신분(국제학생 / 시민권·영주권)에 따라 해당 파트만 표시. 시드: `supabase/seed-aid.sql`, 검토: `docs/i18n-review/aid-review.md`. 연 1회 갱신 대상.
