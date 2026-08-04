# 프로젝트: 한국 국제학교 학생용 미국 대입 로드맵 툴

## 제품 개요
- 타깃: 미국 대학 진학을 준비하는 한국 국제학교 학생 (9~12학년, 대부분 국제학생 신분, 카운슬러 인프라가 약한 환경)
- 핵심 가치: 학년·전공·목표 학교에 맞는 시즌별(Fall/Spring/Summer, 연 3회) 체크리스트를 주고, 주기적으로 돌아와 체크하며 4년간 스펙을 관리하는 툴
- 챗봇·런타임 AI 없음. 모든 개인화는 사전 정의된 데이터를 프로필 조건으로 필터링하는 규칙 기반
- 언어: UI는 한국어, 전공·입시 용어는 영어 병기

## 기술 스택
- Vite + React + TypeScript + Tailwind CSS
- Supabase (Auth: 매직 링크 이메일 로그인 / DB: Postgres)
- 배포: Vercel (GitHub 연동)
- 모바일 우선 반응형. 대부분 폰 브라우저로 접속함
- PDF 내보내기: 클라이언트 사이드 (react-pdf 또는 브라우저 print CSS), docx 내보내기: docx 라이브러리
- 결제·외부 API 없음. 무료 티어 범위 내에서만 설계

## GitHub·버전 관리 규칙
- Phase 0에서 git 초기화 + GitHub 원격 리포 생성·연결까지 완료할 것
- gh CLI가 설치·로그인되어 있으면 gh repo create로 public 리포를 만들어 연결하고, 없거나 미로그인 상태면 로그인 방법(gh auth login)을 안내한 뒤 대기할 것
- .gitignore에 반드시 포함: node_modules, dist, .env, .env.*, .DS_Store
- Supabase URL·anon key 등 모든 키는 .env로만 관리하고 코드에 하드코딩 금지. .env.example 파일을 만들어 필요한 변수명만 기록할 것
- 각 페이즈 완료 시마다 의미 있는 메시지로 커밋하고 push할 것 (예: "Phase 1: onboarding flow with 12 questions"). 페이즈 중간에도 기능 단위로 잘게 커밋할 것
- README.md 초안 작성: 프로젝트 목적, 타깃 사용자, 데이터 출처(Common Data Set, College Scorecard, 각 대학 공식 입학처 페이지), "공식 데이터와 편집 가이드를 구분해 설계함" 원칙 명시. 이후 페이즈 진행에 맞춰 업데이트

## DB 스키마 (Supabase)
1. schools — id, name, name_ko, usnews_rank, tier(1=Top20/2=21-40/3=41-60), sat_mid50_low, sat_mid50_high, gpa_note, intl_accept_rate, need_blind_intl(bool), demonstrated_interest(bool), direct_admit_majors(text[]), what_they_value(text, 공식 출처 기반), source_url
2. checklist_items — id, title, why_how(한 줄 설명), grade(9-12), season(fall/spring/summer), major_category(공통이면 null), tier_condition(null=전체), intl_only(bool), no_counselor_only(bool), axis(rigor/testing/spike/leadership/validation/story), sort_order
3. profiles — user_id(FK auth), nickname, grad_year, applicant_status(intl/domestic/unknown), has_counselor(yes/no/unknown), school_accredited(yes/no/unknown), major_primary, major_secondary, target_mode(schools/tier/undecided), target_school_ids(int[]), target_tier, gpa_band, math_course, sat_status, sat_band, ap_completed, ap_current, toefl_status, activity_spike, activity_leadership, activity_validation
4. user_checks — user_id, item_id, checked_at, season_label(예: 2026-fall), status(done/carried/skipped)
5. reports — user_id, season_label, snapshot(jsonb), created_at
6. analytics_events — user_id, event(signup/login/check/report_view), created_at

## 핵심 로직
- 학년 계산: grad_year와 현재 날짜로 자동 산출 (매년 8월 1일 기준 롤오버, 롤오버 시 확인 팝업)
- 시즌 판정: 8-12월=Fall, 1-5월=Spring, 6-7월=Summer
- 체크리스트 생성: checklist_items에서 (학년 AND 시즌 AND (전공=null OR 전공=내 전공) AND 티어/국제학생/카운슬러 조건 충족) 필터 → sort_order 정렬
- 6축 밸런스 점수: rigor·testing은 프로필 값(GPA 밴드, AP 수, SAT 밴드, 수학 트랙)에서 자동 계산, spike·leadership·validation은 온보딩 자가진단 초기값 + 해당 축 항목 체크 시 가산, story는 체크 기반

## 온보딩 플로우 (한 화면에 한 질문, 뒤로가기 가능, 자유입력은 닉네임뿐)
Q1 졸업연도(Class of 2027-2031) → 학년 자동 계산 후 확인 문구
Q2 지원 신분: 국제학생/시민권·영주권/모름(→국제학생 처리+확인 항목 추가)
Q3 전담 카운슬러 유무: 예/아니오/모름
Q4 학교 국제 인증(WASC·Cognia 등): 예/아니오/모름(→모름이면 확인 항목이 체크리스트 최상단)
Q5 희망 전공 1순위(필수)+2순위(선택): CS/공학/비즈니스·경제/수학·통계·데이터/자연과학/보건·프리메드/사회과학/인문/예술·디자인/미정
Q6 목표 학교: 구체 선택(톱60 검색·복수선택)/티어만(Top20, 21-40, 41-60)/미정
Q7 GPA 밴드: 3.9+/3.7-3.9/3.5-3.7/3.5미만/GPA 없음/9학년이라 아직 없음
Q8 현재 수학 과목: Algebra2 이하/Precalc/Calc(AB·BC)/Calc 이후
Q9 SAT: 계획 없음/공부 중/응시(→밴드: 1500+/1400-1490/1300-1390/1300미만)
Q10 AP: 이수 완료 수 + 수강 중 수
Q11 (국제학생만) TOEFL/IELTS: 미응시/공부 중/점수 있음
Q12 활동 자가진단 3그룹(대표활동/리더십/교외 인정, 각 3단계)
→ 리포트 프리뷰(차트+체크리스트 2-3개, 나머지 블러) → 이메일 입력(매직 링크) → 닉네임 → 전체 리포트

## 시즌 체크인 (재방문, 화면 3개)
1. 지난 시즌 미완료 항목 → 항목별 [이월]/[건너뛰기]
2. 변경사항: 새 점수/새 수상·활동/GPA 변동/변동 없음(원탭)
3. 전공·목표 학교 유지 여부 → 새 리포트 발급

## 리포트 구성 (웹 뷰 + PDF/docx 내보내기, A4 1-2장)
1. 프로필 헤더(닉네임·학년·전공·목표학교·시즌)
2. 학년별 "AO가 지금 보는 것" 3-4줄 박스
3. 시즌 진행률(완료율, 지난 시즌 대비 — 첫 리포트는 생략)
4. 6축 밸런스 레이더 차트 + 약한 축 자동 진단 한 줄
5. 목표 학교 테이블: SAT 중간50% 범위 위 내 위치 마커, 국제학생 합격률, need-blind 여부, demonstrated interest 여부, direct-admit 경고, 학교가 공식적으로 보는 것(what_they_value)
6. 이번 시즌 체크리스트(시기순, 항목마다 why_how와 축 태그)
7. (국제학생만) 이번 시즌 국제학생 섹션
8. 푸터: 서비스명·URL·다음 체크인 날짜

## 개발 페이즈 — 반드시 이 순서로, 페이즈마다 멈추고 확인받기
Phase 0: git init → .gitignore·.env.example·README.md 작성 → GitHub public 리포 생성·원격 연결 → 첫 커밋·push (리포 이름은 사용자에게 물어볼 것)
Phase 1: 프로젝트 스캐폴딩 + Supabase 스키마 SQL 파일 작성 + 온보딩 12문항 플로우 (로컬 상태로만, DB 연결 전) + 시드 데이터(schools 10개, checklist_items 30개는 내용이 "PLACEHOLDER"인 더미 — 실제 콘텐츠는 사용자가 나중에 제공) + 완료 시 커밋·push
Phase 2: Supabase 연결 + 매직 링크 로그인 + 프로필 저장 + 체크리스트 조회·체크
Phase 3: 리포트 화면(차트 포함) + 프리뷰 블러 처리
Phase 4: PDF/docx 내보내기 + 시즌 체크인 플로우
Phase 5: 학년 롤오버 + analytics_events + Vercel 배포 연결 + 마무리

## 코딩 규칙
- 단순하게. 상태관리 라이브러리 없이 React 기본만, 컴포넌트는 작게
- 시드 데이터와 실제 콘텐츠는 코드와 분리 (SQL 시드 파일 또는 JSON)
- 매 페이즈 끝에 "내가 브라우저에서 확인할 방법"을 한 줄로 알려줄 것
