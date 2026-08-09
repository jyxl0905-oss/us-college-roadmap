-- 미국 대입 로드맵 툴 — Supabase 스키마
-- Supabase SQL Editor에 붙여넣어 실행 (Phase 2에서 적용 예정)

-- 1. schools — 학교 공식 데이터 (Common Data Set·College Scorecard·공식 입학처 기반)
create table schools (
  id bigint primary key,
  name text not null,
  name_ko text,
  usnews_rank int,
  tier smallint check (tier in (1, 2, 3)), -- 1=Top20, 2=21-40, 3=41-60
  sat_mid50_low int,
  sat_mid50_high int,
  gpa_note text,
  intl_accept_rate numeric, -- 국제학생 합격률 (%) — 공식 공개 시에만
  need_blind_intl boolean, -- null = 학교가 공식 표명하지 않음
  demonstrated_interest boolean, -- CDS C7 기준, null = 확인 불가
  direct_admit_majors text[] not null default '{}',
  what_they_value text, -- 공식 출처 기반
  source_url text,
  test_policy text, -- test-required / test-optional / test-free
  intro_ko text, -- 사실 서술 (소재지·캠퍼스 유형)
  location_note text -- 사실 서술 (도시 규모·기후)
);

-- 2. checklist_items — 시즌별 체크리스트 항목 (편집 콘텐츠)
create table checklist_items (
  id bigint primary key,
  title text not null,
  why_how text, -- 한 줄 설명
  grade smallint not null check (grade between 9 and 12),
  season text not null check (season in ('fall', 'spring', 'summer')),
  major_category text, -- null = 공통
  tier_condition smallint check (tier_condition in (1, 2, 3)), -- null = 전체
  intl_only boolean not null default false,
  no_counselor_only boolean not null default false,
  axis text not null check (axis in ('rigor', 'testing', 'spike', 'leadership', 'validation', 'story')),
  is_guide boolean not null default false, -- true = 편집 가이드, false = 사실 기반 항목
  sort_order int not null default 0
);

-- 3. profiles — 사용자 프로필 (온보딩 답변)
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text,
  grad_year int,
  applicant_status text check (applicant_status in ('intl', 'domestic', 'unknown')),
  has_counselor text check (has_counselor in ('yes', 'no', 'unknown')),
  school_accredited text check (school_accredited in ('yes', 'no', 'unknown')),
  major_primary text,
  major_secondary text,
  target_mode text check (target_mode in ('schools', 'tier', 'undecided')),
  target_school_ids bigint[] not null default '{}',
  target_tier smallint check (target_tier in (1, 2, 3)),
  gpa_band text,
  math_course text,
  sat_status text,
  sat_band text,
  ap_completed smallint,
  ap_current smallint,
  toefl_status text,
  activity_spike smallint check (activity_spike in (1, 2, 3)),
  activity_leadership smallint check (activity_leadership in (1, 2, 3)),
  activity_validation smallint check (activity_validation in (1, 2, 3)),
  quiz_answers jsonb, -- 온보딩 OX 퀴즈 응답 [{id, answer, correct}]
  info_sources text[], -- 대입 정보원 (복수)
  research_consent boolean not null default false -- 연구 목적 익명 통계 활용 동의
);

-- 연구 모듈 (R1)
create table quiz_items (
  id bigint primary key,
  question text not null,
  answer boolean not null, -- true=O, false=X
  explanation_2lines text not null, -- 2줄 해설 (\n 구분)
  sort_order int not null default 0
);

create table clarity_items (
  id bigint primary key,
  question text not null, -- 진로 명확성 단축 척도 문항
  sort_order int not null default 0
);

create table clarity_responses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  season_label text not null,
  item_id bigint not null references clarity_items (id),
  score smallint not null check (score between 1 and 5),
  research_ok boolean not null default false, -- 응답 시점의 연구 동의 여부 (연구 플래그 분리)
  created_at timestamptz not null default now()
);

-- 4. user_checks — 체크리스트 체크 기록
create table user_checks (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id bigint not null references checklist_items (id),
  checked_at timestamptz not null default now(),
  season_label text not null, -- 예: '2026-fall'
  status text not null check (status in ('done', 'carried', 'skipped')),
  primary key (user_id, item_id, season_label)
);

-- 5. reports — 시즌별 리포트 스냅샷
create table reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  season_label text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

-- 콘텐츠 테이블 (§4) — 축별 처방·어필 전략·용어집·입시 기본기
create table prescriptions (
  id bigint generated always as identity primary key,
  axis text not null check (axis in ('rigor','testing','spike','leadership','validation','story')),
  level text not null check (level in ('sufficient','in_progress','large_gap')),
  grade_band text not null, -- '9', '9-10', '11', '12', 'all'
  text_ko text not null
);

create table appeal_strategies (
  id bigint generated always as identity primary key,
  axis text not null check (axis in ('rigor','testing','spike','leadership','validation','story','none')),
  text_ko text not null
);

create table glossary (
  id bigint generated always as identity primary key,
  term text not null,
  definition_ko text not null,
  sort_order int not null default 0
);

create table basics (
  id bigint generated always as identity primary key,
  title_ko text not null,
  body_ko text not null,
  sort_order int not null default 0
);

-- 6. analytics_events — 간단한 사용 로그
create table analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  event text not null check (event in ('signup', 'login', 'check', 'report_view')),
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table schools enable row level security;
alter table checklist_items enable row level security;
alter table profiles enable row level security;
alter table user_checks enable row level security;
alter table reports enable row level security;
alter table analytics_events enable row level security;

alter table prescriptions enable row level security;
alter table appeal_strategies enable row level security;
alter table glossary enable row level security;
alter table basics enable row level security;

-- 공개 읽기 전용 데이터
create policy "schools are readable by everyone" on schools for select using (true);
create policy "checklist items are readable by everyone" on checklist_items for select using (true);
create policy "prescriptions readable" on prescriptions for select using (true);
create policy "appeal readable" on appeal_strategies for select using (true);
create policy "glossary readable" on glossary for select using (true);
create policy "basics readable" on basics for select using (true);

alter table quiz_items enable row level security;
alter table clarity_items enable row level security;
alter table clarity_responses enable row level security;
create policy "quiz readable" on quiz_items for select using (true);
create policy "clarity readable" on clarity_items for select using (true);
create policy "clarity insert own" on clarity_responses for insert with check (auth.uid() = user_id);
create policy "clarity select own" on clarity_responses for select using (auth.uid() = user_id);

-- 본인 데이터만 접근
create policy "users manage own profile" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own checks" on user_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own reports" on reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users insert own events" on analytics_events
  for insert with check (auth.uid() = user_id);
