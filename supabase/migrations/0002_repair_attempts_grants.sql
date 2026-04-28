-- Repair migration: re-applies the RLS policies and grants on the aphydle
-- analytics tables (attempts, page_visits, daily_log, puzzle_results,
-- daily_distribution).
--
-- Why this exists as a separate file: 0001_aphydle_sync.sql shipped with a
-- raw `create extension if not exists pg_cron` that aborts on Supabase Cloud
-- projects where the extension isn't dashboard-enabled. When that ran inside
-- a single transaction, the failure rolled back every grant below it and the
-- table ended up without `insert, update` on `anon` — every PostgREST write
-- to `aphydle.attempts` came back 401 with SQLSTATE 42501 ("permission
-- denied for table attempts") and the finish-screen world histogram only
-- ever showed the local player's bar.
--
-- 0001 has since been patched (the pg_cron block is now wrapped in
-- `do $$ … exception when others …`), but Supabase tracks applied migrations
-- by filename. Editing 0001 in place doesn't re-run it on databases where
-- the row in `supabase_migrations.schema_migrations` already exists. This
-- file is a fresh entry so `supabase db push` actually executes the repair.
-- It is idempotent — safe to re-run on any aphydle-schema state.

-- ── schema ──────────────────────────────────────────────────────────────────
-- Cheap insurance: if for some reason the schema or USAGE grant is missing,
-- restore them before touching the tables. `create schema if not exists` is
-- a no-op when the schema is already there.
create schema if not exists aphydle;
grant usage on schema aphydle to anon, authenticated;

-- ── attempts ───────────────────────────────────────────────────────────────
-- Recreate the table only if 0001 never landed (e.g. it rolled back before
-- the create). On every other database this is a no-op because of `if not
-- exists`. The shape mirrors 0001 exactly so a later re-run of either file
-- finds the column set unchanged.
create table if not exists aphydle.attempts (
    id              bigserial primary key,
    anon_id         text not null,
    puzzle_no       integer not null,
    attempt_no      smallint not null check (attempt_no between 1 and 10),
    guess_plant_id  text,
    is_correct      boolean not null default false,
    attempted_at    timestamptz not null default now(),
    constraint attempts_anon_id_puzzle_no_key unique (anon_id, puzzle_no)
);

-- Drop any legacy three-column unique key so the runtime upsert
-- (on_conflict=anon_id,puzzle_no) finds a matching constraint.
alter table aphydle.attempts
    drop constraint if exists attempts_anon_id_puzzle_no_attempt_no_key;

-- Make sure the (anon_id, puzzle_no) unique key exists, even on databases
-- created before that constraint was added.
do $$
begin
    if not exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'aphydle'
          and t.relname = 'attempts'
          and c.conname = 'attempts_anon_id_puzzle_no_key'
    ) then
        -- Collapse duplicate rows first so the unique index can be built.
        delete from aphydle.attempts a
        using aphydle.attempts b
        where a.anon_id = b.anon_id
          and a.puzzle_no = b.puzzle_no
          and (
              a.attempt_no < b.attempt_no
              or (a.attempt_no = b.attempt_no and a.id < b.id)
          );
        alter table aphydle.attempts
            add constraint attempts_anon_id_puzzle_no_key
            unique (anon_id, puzzle_no);
    end if;
end $$;

alter table aphydle.attempts enable row level security;

drop policy if exists "insert attempt" on aphydle.attempts;
create policy "insert attempt"
    on aphydle.attempts
    for insert
    to anon, authenticated
    with check (
        anon_id is not null
        and length(anon_id) between 8 and 128
        and attempt_no between 1 and 10
    );

drop policy if exists "update attempt" on aphydle.attempts;
create policy "update attempt"
    on aphydle.attempts
    for update
    to anon, authenticated
    using (true)
    with check (
        anon_id is not null
        and length(anon_id) between 8 and 128
        and attempt_no between 1 and 10
    );

grant insert, update on aphydle.attempts                 to anon, authenticated;
grant usage, select  on sequence aphydle.attempts_id_seq to anon, authenticated;

-- ── page_visits ────────────────────────────────────────────────────────────
create table if not exists aphydle.page_visits (
    id          bigserial primary key,
    anon_id     text not null,
    puzzle_no   integer,
    visited_at  timestamptz not null default now()
);

alter table aphydle.page_visits enable row level security;

drop policy if exists "insert page visit" on aphydle.page_visits;
create policy "insert page visit"
    on aphydle.page_visits
    for insert
    to anon, authenticated
    with check (anon_id is not null and length(anon_id) between 8 and 128);

grant insert on aphydle.page_visits                        to anon, authenticated;
grant usage, select on sequence aphydle.page_visits_id_seq to anon, authenticated;

-- ── puzzle_results ─────────────────────────────────────────────────────────
create table if not exists aphydle.puzzle_results (
    id           bigserial primary key,
    puzzle_no    integer not null,
    player_id    text not null,
    outcome      text not null check (outcome in ('won', 'lost')),
    guess_count  smallint not null check (guess_count between 1 and 10),
    finished_at  timestamptz not null default now(),
    unique (puzzle_no, player_id)
);

alter table aphydle.puzzle_results enable row level security;

drop policy if exists "insert own result" on aphydle.puzzle_results;
create policy "insert own result"
    on aphydle.puzzle_results
    for insert
    to authenticated
    with check (player_id = auth.uid()::text);

drop policy if exists "insert anon result" on aphydle.puzzle_results;
create policy "insert anon result"
    on aphydle.puzzle_results
    for insert
    to anon
    with check (player_id is not null and length(player_id) between 8 and 128);

drop policy if exists "read all results" on aphydle.puzzle_results;
create policy "read all results"
    on aphydle.puzzle_results
    for select
    to anon, authenticated
    using (true);

grant select, insert on aphydle.puzzle_results                 to anon, authenticated;
grant usage, select  on sequence aphydle.puzzle_results_id_seq to anon, authenticated;

-- ── daily_log ──────────────────────────────────────────────────────────────
create table if not exists aphydle.daily_log (
    puzzle_no    integer primary key,
    puzzle_date  date not null unique,
    plant_id     text not null,
    recorded_at  timestamptz not null default now()
);

alter table aphydle.daily_log enable row level security;

drop policy if exists "read daily log" on aphydle.daily_log;
create policy "read daily log"
    on aphydle.daily_log
    for select
    to anon, authenticated
    using (true);

drop policy if exists "insert today's daily log" on aphydle.daily_log;
create policy "insert today's daily log"
    on aphydle.daily_log
    for insert
    to anon, authenticated
    with check (puzzle_date = (now() at time zone 'utc')::date);

grant select, insert on aphydle.daily_log to anon, authenticated;

-- ── daily_distribution view ────────────────────────────────────────────────
-- Recreate from aphydle.attempts. The select grant is what the finish screen
-- needs to read the world histogram.
create or replace view aphydle.daily_distribution as
select
    puzzle_no,
    sum(case when is_correct and attempt_no = 1  then 1 else 0 end)::int as bucket_1,
    sum(case when is_correct and attempt_no = 2  then 1 else 0 end)::int as bucket_2,
    sum(case when is_correct and attempt_no = 3  then 1 else 0 end)::int as bucket_3,
    sum(case when is_correct and attempt_no = 4  then 1 else 0 end)::int as bucket_4,
    sum(case when is_correct and attempt_no = 5  then 1 else 0 end)::int as bucket_5,
    sum(case when is_correct and attempt_no = 6  then 1 else 0 end)::int as bucket_6,
    sum(case when is_correct and attempt_no = 7  then 1 else 0 end)::int as bucket_7,
    sum(case when is_correct and attempt_no = 8  then 1 else 0 end)::int as bucket_8,
    sum(case when is_correct and attempt_no = 9  then 1 else 0 end)::int as bucket_9,
    sum(case when is_correct and attempt_no = 10 then 1 else 0 end)::int as bucket_10,
    sum(case when not is_correct and attempt_no = 10 then 1 else 0 end)::int as bucket_lost,
    sum(case when is_correct or attempt_no = 10 then 1 else 0 end)::int      as total_played
from aphydle.attempts
group by puzzle_no;

grant select on aphydle.daily_distribution to anon, authenticated;
