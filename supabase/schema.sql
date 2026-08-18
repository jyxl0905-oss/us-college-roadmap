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
  location_note text, -- 사실 서술 (도시 규모·기후)
  -- F3: 마감 캘린더 — 공식 입학처 페이지에서만 수집, 확인 불가 시 null
  ed_offered boolean, -- Early Decision (binding)
  ed2_offered boolean, -- Early Decision II
  ea_offered boolean, -- 비제한 Early Action
  rea_offered boolean, -- Restrictive EA / Single-Choice EA
  ed_timing text, -- 시기 라벨: "11월 초" 형식 (월+순, 연도별 날짜 유지보수 최소화)
  ed2_timing text,
  ea_timing text, -- REA/SCEA 시기도 여기에
  rd_timing text,
  deadlines_source_url text,
  deadlines_verified_at date,
  -- F4: CDS C7에서 Very Important로 공시된 요소 슬러그 (공식 CDS만, 미확인 null)
  c7_very_important text[],
  c7_source_url text
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
  event text not null check (event in ('signup', 'login', 'check', 'report_view', 'board_view', 'round_assigned')),
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

-- F4 지원 보드
create table applications (
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id bigint not null references schools(id),
  round text check (round in ('ed','ed2','ea','rea','rd')),
  status text not null default 'preparing' check (status in ('preparing','submitted','waiting','accepted','rejected','waitlisted','deferred')),
  updated_at timestamptz not null default now(),
  primary key (user_id, school_id)
);
alter table applications enable row level security;
create policy "own applications" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table custom_tasks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id bigint not null references schools(id),
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table custom_tasks enable row level security;
create policy "own custom_tasks" on custom_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- F5 가상 Common App — 학생 본인 기록 (전부 RLS 본인만)
create table activities (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sort_order int not null default 0,
  category text not null default 'other',
  position text not null default '' check (char_length(position) <= 50),      -- Common App 직책 50자
  organization text not null default '' check (char_length(organization) <= 100), -- 단체명 100자
  description text not null default '' check (char_length(description) <= 150),  -- 설명 150자
  grades smallint[] not null default '{}',
  timing text check (timing in ('school_year','break','year_round')),
  hours_per_week numeric,
  weeks_per_year int,
  continue_in_college boolean,
  updated_at timestamptz not null default now()
);
create table honors (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sort_order int not null default 0,
  title text not null default '' check (char_length(title) <= 100),
  grade smallint,
  level text check (level in ('school','regional','national','international')),
  activity_id bigint references activities(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table test_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('sat','toefl','ielts','ap')),
  taken_on date,
  total numeric,
  section_scores jsonb,
  subject text, -- AP 과목명
  updated_at timestamptz not null default now()
);
create table courses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  grade smallint not null,
  name text not null,
  level text not null default 'regular' check (level in ('regular','honors','ap','ib')),
  updated_at timestamptz not null default now()
);
create table essays (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id bigint references schools(id), -- null = 개인 에세이
  prompt text not null default '',
  status text not null default 'not_started' check (status in ('not_started','brainstorm','draft','revising','done')),
  word_limit int,
  notes text, -- 본문은 저장하지 않음 (메모·상태만)
  updated_at timestamptz not null default now()
);
alter table applications add column student_deadline date; -- 학생이 공식 페이지 확인 후 직접 입력한 마감일
alter table activities enable row level security;
alter table honors enable row level security;
alter table test_scores enable row level security;
alter table courses enable row level security;
alter table essays enable row level security;
create policy "own activities" on activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own honors" on honors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own test_scores" on test_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own courses" on courses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own essays" on essays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 시즌 시작 리마인더 이메일 (Vercel cron → api/season-reminder.js, 서비스 롤로만 접근)
alter table profiles add column reminder_opt_out boolean not null default false;
create table reminder_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_label text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, season_label)
);
alter table reminder_log enable row level security;

-- F6 내 계획 — 시즌별 계획 항목(축 태그) → 리포트 6축에 "계획 반영 시" 점선으로 표시
create table plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  axis text not null check (axis in ('rigor','testing','spike','leadership','validation','story')),
  season_label text not null, -- 예: '2026-fall'
  status text not null default 'planned' check (status in ('planned','doing','done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table plans enable row level security;
create policy "own plans" on plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
