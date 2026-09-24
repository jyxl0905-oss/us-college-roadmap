-- 실제 운영 DB(Supabase) 구조 스냅샷 — 2026-09-24 추출 (information_schema·pg_policies 기준)
-- schema.sql은 Phase 1 초기 설계본이라 이후 추가된 테이블·컬럼이 빠져 있음 → 현재 구조는 이 파일이 기준
-- 새로 만들 때 참고용 (기본키·인덱스·함수 정의는 제외. 함수는 supabase_migrations 기록과 security-hardening-2026-09.sql 참고)
-- CHECK 제약 요약: schools.kind ∈ (university, lac, art) · test_scores.kind ∈ (sat, act, toefl, ielts, ap)
--   courses.level ∈ (regular, honors, ap, ib) · applications.round ∈ (ed, ed2, ea, rea, rd) · user_checks.status ∈ (done, carried, skipped)
-- 유니크: reports (user_id, season_label) · predictions (user_id, school_id)

create table public.activities (
  id bigint not null,
  user_id uuid not null,
  sort_order integer not null default 0,
  category text not null default 'other'::text,
  "position" text not null default ''::text,
  organization text not null default ''::text,
  description text not null default ''::text,
  grades int2[] not null default '{}'::smallint[],
  timing text,
  hours_per_week numeric,
  weeks_per_year integer,
  continue_in_college boolean,
  updated_at timestamp with time zone not null default now()
);
alter table public.activities enable row level security;
create policy "own activities" on public.activities for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.analytics_events (
  id bigint not null,
  user_id uuid,
  event text not null,
  created_at timestamp with time zone not null default now()
);
alter table public.analytics_events enable row level security;
create policy "users insert own events" on public.analytics_events for INSERT to public with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.appeal_strategies (
  id bigint not null,
  axis text not null,
  text_ko text not null,
  text_en text
);
alter table public.appeal_strategies enable row level security;
create policy "appeal readable" on public.appeal_strategies for SELECT to public using (true);

create table public.applications (
  user_id uuid not null,
  school_id bigint not null,
  round text,
  status text not null default 'preparing'::text,
  updated_at timestamp with time zone not null default now(),
  student_deadline date,
  fit text
);
alter table public.applications enable row level security;
create policy "own applications" on public.applications for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.basics (
  id bigint not null,
  title_ko text not null,
  body_ko text not null,
  sort_order integer not null default 0,
  title_en text,
  body_en text
);
alter table public.basics enable row level security;
create policy "basics readable" on public.basics for SELECT to public using (true);

create table public.checklist_items (
  id bigint not null,
  title text not null,
  why_how text,
  grade smallint not null,
  season text not null,
  major_category text,
  tier_condition smallint,
  intl_only boolean not null default false,
  no_counselor_only boolean not null default false,
  axis text not null,
  sort_order integer not null default 0,
  is_guide boolean not null default false,
  title_en text,
  why_how_en text
);
alter table public.checklist_items enable row level security;
create policy "checklist items are readable by everyone" on public.checklist_items for SELECT to public using (true);

create table public.clarity_items (
  id bigint not null,
  question text not null,
  sort_order integer not null default 0,
  question_en text
);
alter table public.clarity_items enable row level security;
create policy "clarity readable" on public.clarity_items for SELECT to public using (true);

create table public.clarity_responses (
  id bigint not null,
  user_id uuid not null,
  season_label text not null,
  item_id bigint not null,
  score smallint not null,
  research_ok boolean not null default false,
  created_at timestamp with time zone not null default now()
);
alter table public.clarity_responses enable row level security;
create policy "clarity insert own" on public.clarity_responses for INSERT to public with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "clarity select own" on public.clarity_responses for SELECT to public using ((( SELECT auth.uid() AS uid) = user_id));

create table public.courses (
  id bigint not null,
  user_id uuid not null,
  grade smallint not null,
  name text not null,
  level text not null default 'regular'::text,
  updated_at timestamp with time zone not null default now(),
  letter_grade text,
  percent smallint,
  credits numeric not null default 1
);
alter table public.courses enable row level security;
create policy "own courses" on public.courses for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.custom_tasks (
  id bigint not null,
  user_id uuid not null,
  school_id bigint not null,
  title text not null,
  done boolean not null default false,
  created_at timestamp with time zone not null default now()
);
alter table public.custom_tasks enable row level security;
create policy "own custom_tasks" on public.custom_tasks for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.essays (
  id bigint not null,
  user_id uuid not null,
  school_id bigint,
  prompt text not null default ''::text,
  status text not null default 'not_started'::text,
  word_limit integer,
  notes text,
  updated_at timestamp with time zone not null default now(),
  body text,
  body_saved_at timestamp with time zone
);
alter table public.essays enable row level security;
create policy "own essays" on public.essays for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.feedback (
  id bigint not null,
  user_id uuid,
  message text not null,
  page text,
  created_at timestamp with time zone not null default now()
);
alter table public.feedback enable row level security;
create policy "insert own feedback" on public.feedback for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.glossary (
  id bigint not null,
  term text not null,
  definition_ko text not null,
  sort_order integer not null default 0,
  term_en text,
  definition_en text
);
alter table public.glossary enable row level security;
create policy "glossary readable" on public.glossary for SELECT to public using (true);

create table public.honors (
  id bigint not null,
  user_id uuid not null,
  sort_order integer not null default 0,
  title text not null default ''::text,
  grade smallint,
  level text,
  activity_id bigint,
  updated_at timestamp with time zone not null default now()
);
alter table public.honors enable row level security;
create policy "own honors" on public.honors for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.milestones (
  user_id uuid not null,
  key text not null,
  done_at timestamp with time zone not null default now()
);
alter table public.milestones enable row level security;
create policy "own milestones" on public.milestones for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.outcome_surveys (
  user_id uuid not null,
  helpful smallint not null,
  admitted text not null,
  enrolled_school_id bigint,
  enrolled_school_name text,
  best_features text[],
  comment text,
  research_ok boolean not null default false,
  created_at timestamp with time zone not null default now()
);
alter table public.outcome_surveys enable row level security;
create policy "own outcome_surveys" on public.outcome_surveys for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.pending_onboarding (
  email text not null,
  answers jsonb not null,
  research_consent boolean not null default false,
  created_at timestamp with time zone not null default now(),
  token text
);
alter table public.pending_onboarding enable row level security;
-- (정책 없음: stash_onboarding / take_onboarding 보안 함수 전용)

create table public.plans (
  id bigint not null,
  user_id uuid not null,
  title text not null,
  axis text not null,
  season_label text not null,
  status text not null default 'planned'::text,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
alter table public.plans enable row level security;
create policy "own plans" on public.plans for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.predictions (
  id bigint not null,
  user_id uuid not null,
  school_id bigint not null,
  user_fit text not null,
  data_fit text,
  decision text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
alter table public.predictions enable row level security;
create policy "predictions own delete" on public.predictions for DELETE to public using ((( SELECT auth.uid() AS uid) = user_id));
create policy "predictions own insert" on public.predictions for INSERT to public with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "predictions own read" on public.predictions for SELECT to public using ((( SELECT auth.uid() AS uid) = user_id));
create policy "predictions own update" on public.predictions for UPDATE to public using ((( SELECT auth.uid() AS uid) = user_id));

create table public.prescriptions (
  id bigint not null,
  axis text not null,
  level text not null,
  grade_band text not null,
  text_ko text not null,
  text_en text
);
alter table public.prescriptions enable row level security;
create policy "prescriptions readable" on public.prescriptions for SELECT to public using (true);

create table public.presence (
  user_id uuid not null,
  last_seen timestamp with time zone not null default now()
);
alter table public.presence enable row level security;
create policy presence_insert_own on public.presence for INSERT to public with check ((( SELECT auth.uid() AS uid) = user_id));
create policy presence_select_own on public.presence for SELECT to public using ((( SELECT auth.uid() AS uid) = user_id));
create policy presence_update_own on public.presence for UPDATE to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.profiles (
  user_id uuid not null,
  nickname text,
  grad_year integer,
  applicant_status text,
  has_counselor text,
  school_accredited text,
  major_primary text,
  major_secondary text,
  target_mode text,
  target_school_ids int8[] not null default '{}'::bigint[],
  target_tier smallint,
  gpa_band text,
  math_course text,
  sat_status text,
  sat_band text,
  ap_completed smallint,
  ap_current smallint,
  toefl_status text,
  activity_spike smallint,
  activity_leadership smallint,
  activity_validation smallint,
  quiz_answers jsonb,
  info_sources text[],
  research_consent boolean not null default false,
  reminder_opt_out boolean not null default false,
  school_in_us boolean not null default false,
  lang text,
  graduated boolean not null default false,
  school_name text,
  ref_source text
);
alter table public.profiles enable row level security;
create policy "users manage own profile" on public.profiles for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.quiz_items (
  id bigint not null,
  question text not null,
  answer boolean not null,
  explanation_2lines text not null,
  sort_order integer not null default 0,
  question_en text,
  explanation_2lines_en text
);
alter table public.quiz_items enable row level security;
create policy "quiz readable" on public.quiz_items for SELECT to public using (true);

create table public.reminder_log (
  user_id uuid not null,
  season_label text not null,
  sent_at timestamp with time zone not null default now()
);
alter table public.reminder_log enable row level security;
-- (정책 없음: 알림 메일 서버 작업(서비스 키) 전용)

create table public.reports (
  id bigint not null,
  user_id uuid not null,
  season_label text not null,
  snapshot jsonb not null,
  created_at timestamp with time zone not null default now()
);
alter table public.reports enable row level security;
create policy "users manage own reports" on public.reports for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.schools (
  id bigint not null,
  name text not null,
  name_ko text,
  usnews_rank integer,
  tier smallint,
  sat_mid50_low integer,
  sat_mid50_high integer,
  gpa_note text,
  intl_accept_rate numeric,
  need_blind_intl boolean default false,
  demonstrated_interest boolean default false,
  direct_admit_majors text[] not null default '{}'::text[],
  what_they_value text,
  source_url text,
  test_policy text,
  intro_ko text,
  location_note text,
  ed_offered boolean,
  ed2_offered boolean,
  ea_offered boolean,
  rea_offered boolean,
  ed_timing text,
  ed2_timing text,
  ea_timing text,
  rd_timing text,
  deadlines_source_url text,
  deadlines_verified_at date,
  c7_very_important text[],
  c7_source_url text,
  intro_en text,
  what_they_value_en text,
  location_note_en text,
  gpa_note_en text,
  intl_aid_count integer,
  intl_aid_avg integer,
  intl_aid_year text,
  meets_full_need_intl boolean,
  merit_intl text,
  meets_full_need_all boolean,
  no_loan boolean,
  merit_note text,
  aid_source_url text,
  kind text not null default 'university'::text,
  lac_rank integer,
  overall_accept_rate numeric,
  ed_applied integer,
  ed_admitted integer,
  ed_cds_year text,
  essay_req text,
  essay_req_en text,
  essay_change text,
  essay_change_en text,
  merit_note_en text,
  merit_intl_en text,
  essay_cycle text,
  essay_source_url text,
  avg_gpa numeric,
  avg_gpa_scale text,
  avg_gpa_year text,
  avg_gpa_source_url text,
  portfolio_req text,
  portfolio_req_en text,
  portfolio_source_url text,
  art_programs text[]
);
alter table public.schools enable row level security;
create policy "schools are readable by everyone" on public.schools for SELECT to public using (true);

create table public.stats_snapshots (
  month text not null,
  data jsonb not null,
  updated_at timestamp with time zone not null default now()
);
alter table public.stats_snapshots enable row level security;
-- (정책 없음: take_stats_snapshot / admin_snapshots 보안 함수 전용)

create table public.test_scores (
  id bigint not null,
  user_id uuid not null,
  kind text not null,
  taken_on date,
  total numeric,
  section_scores jsonb,
  subject text,
  updated_at timestamp with time zone not null default now()
);
alter table public.test_scores enable row level security;
create policy "own test_scores" on public.test_scores for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create table public.user_checks (
  user_id uuid not null,
  item_id bigint not null,
  checked_at timestamp with time zone not null default now(),
  season_label text not null,
  status text not null
);
alter table public.user_checks enable row level security;
create policy "users manage own checks" on public.user_checks for ALL to public using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
