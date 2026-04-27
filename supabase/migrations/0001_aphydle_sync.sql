-- Aphydle sync migration. Idempotent: re-runnable on a fresh database
-- or on one that already carries an older Aphydle schema. Defines every
-- Aphydle-specific object the runtime needs and drops anything the app
-- no longer reads from.
--
-- Plant content (taxonomy, common/scientific names, images, translations,
-- toxicity, sunlight, etc.) is owned by PlantSwipe in the public schema
-- and is intentionally NOT (re)defined here — the Aphydle runtime queries
-- public.plants, public.plant_images, public.plant_translations directly
-- (see src/lib/data.js). This file only encodes the Aphydle-private
-- bookkeeping that has no equivalent in the PlantSwipe catalog.
--
-- Apply with `supabase db push`, or paste the whole file into the
-- Supabase SQL editor and run it once.

-- ── schema ──────────────────────────────────────────────────────────────────
create schema if not exists aphydle;
grant usage on schema aphydle to anon, authenticated;

-- ── retired objects ─────────────────────────────────────────────────────────
-- Earlier migrations stood up an aphydle-owned plant catalog and a
-- daily_puzzles rotation table. The runtime never queries them — daily
-- picks live in aphydle.daily_log (below) and plant content comes from
-- PlantSwipe's public.plants. Drop them so they don't drift out of sync.
-- CASCADE is required because puzzle_results historically carried a FK to
-- daily_puzzles.puzzle_no; cascading the drop strips that constraint
-- without touching the result rows themselves.
drop view  if exists aphydle.daily_distribution;
drop table if exists aphydle.guessable_plants cascade;
drop table if exists aphydle.daily_puzzles    cascade;
drop table if exists aphydle.plants           cascade;

-- ── puzzle_results ──────────────────────────────────────────────────────────
-- One row per (puzzle, player) attempt. `player_id` is whatever stable id
-- the host has — typically auth.uid() when the user is signed in to
-- Supabase, otherwise a hashed Aphylia session id pushed in via a
-- service-role function. Powers the per-day distribution histogram.
create table if not exists aphydle.puzzle_results (
    id           bigserial primary key,
    puzzle_no    integer not null,
    player_id    text not null,
    outcome      text not null check (outcome in ('won', 'lost')),
    guess_count  smallint not null check (guess_count between 1 and 10),
    finished_at  timestamptz not null default now(),
    -- Idempotency: one result per puzzle per player. Re-submits are no-ops.
    unique (puzzle_no, player_id)
);

create index if not exists puzzle_results_puzzle_idx on aphydle.puzzle_results (puzzle_no);
create index if not exists puzzle_results_player_idx on aphydle.puzzle_results (player_id);

alter table aphydle.puzzle_results enable row level security;

drop policy if exists "insert own result" on aphydle.puzzle_results;
create policy "insert own result"
    on aphydle.puzzle_results
    for insert
    to authenticated
    with check (player_id = auth.uid()::text);

drop policy if exists "read all results" on aphydle.puzzle_results;
create policy "read all results"
    on aphydle.puzzle_results
    for select
    to anon, authenticated
    using (true);

grant select, insert on aphydle.puzzle_results                 to authenticated;
grant select         on aphydle.puzzle_results                 to anon;
grant usage, select  on sequence aphydle.puzzle_results_id_seq to authenticated;

-- ── daily_distribution view ─────────────────────────────────────────────────
-- Buckets 1..10 are wins by guess count; bucket_lost is the loss tally.
-- The finish screen reads this directly to draw the histogram.
create or replace view aphydle.daily_distribution as
select
    puzzle_no,
    sum(case when outcome = 'won' and guess_count = 1  then 1 else 0 end)::int as bucket_1,
    sum(case when outcome = 'won' and guess_count = 2  then 1 else 0 end)::int as bucket_2,
    sum(case when outcome = 'won' and guess_count = 3  then 1 else 0 end)::int as bucket_3,
    sum(case when outcome = 'won' and guess_count = 4  then 1 else 0 end)::int as bucket_4,
    sum(case when outcome = 'won' and guess_count = 5  then 1 else 0 end)::int as bucket_5,
    sum(case when outcome = 'won' and guess_count = 6  then 1 else 0 end)::int as bucket_6,
    sum(case when outcome = 'won' and guess_count = 7  then 1 else 0 end)::int as bucket_7,
    sum(case when outcome = 'won' and guess_count = 8  then 1 else 0 end)::int as bucket_8,
    sum(case when outcome = 'won' and guess_count = 9  then 1 else 0 end)::int as bucket_9,
    sum(case when outcome = 'won' and guess_count = 10 then 1 else 0 end)::int as bucket_10,
    sum(case when outcome = 'lost' then 1 else 0 end)::int                      as bucket_lost,
    count(*)::int                                                                as total_played
from aphydle.puzzle_results
group by puzzle_no;

grant select on aphydle.daily_distribution to anon, authenticated;

-- ── daily_log ──────────────────────────────────────────────────────────────
-- Append-only record of which plant was served on which puzzle day. The
-- runtime consults this first so a redeploy / rotation change can never
-- reshuffle a played day. `plant_id` is an opaque text id (currently a
-- public.plants UUID coming out of PlantSwipe) — there's no FK so this
-- works regardless of where the catalog lives.
create table if not exists aphydle.daily_log (
    puzzle_no    integer primary key,
    puzzle_date  date not null unique,
    plant_id     text not null,
    recorded_at  timestamptz not null default now()
);

create index if not exists daily_log_date_idx on aphydle.daily_log (puzzle_date);

alter table aphydle.daily_log enable row level security;

drop policy if exists "read daily log" on aphydle.daily_log;
create policy "read daily log"
    on aphydle.daily_log
    for select
    to anon, authenticated
    using (true);

-- Anyone can stamp today's pick. The check restricts writes to the current
-- UTC date so historical entries can't be backfilled or rewritten by a
-- malicious client; the unique key on puzzle_no makes inserts idempotent
-- — first writer wins for any given day.
drop policy if exists "insert today's daily log" on aphydle.daily_log;
create policy "insert today's daily log"
    on aphydle.daily_log
    for insert
    to anon, authenticated
    with check (puzzle_date = (now() at time zone 'utc')::date);

grant select, insert on aphydle.daily_log to anon, authenticated;
