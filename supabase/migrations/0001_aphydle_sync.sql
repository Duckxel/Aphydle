-- Aphydle sync migration. Idempotent: re-runnable on a fresh database
-- or on one that already carries an older Aphydle schema. This file is
-- the single source of truth for every Aphydle-owned object the
-- runtime needs.
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
-- The view is dropped here too because it gets re-created lower down with
-- a different source table; CREATE OR REPLACE VIEW can't change the
-- column list, so the drop guarantees the new definition wins.
drop view  if exists aphydle.daily_distribution;
drop table if exists aphydle.guessable_plants cascade;
drop table if exists aphydle.daily_puzzles    cascade;
drop table if exists aphydle.plants           cascade;

-- ── puzzle_results ──────────────────────────────────────────────────────────
-- One row per (puzzle, player) attempt. `player_id` is whatever stable id
-- the host has — typically auth.uid() when the user is signed in to
-- Supabase, otherwise a hashed Aphylia session id pushed in via a
-- service-role function, otherwise the per-day anon id used by the
-- analytics tables below. Kept around for back-compat with hosts that
-- aggregate against it; the in-app histogram now sources from
-- aphydle.attempts (see daily_distribution below).
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

grant select, insert on aphydle.puzzle_results                 to authenticated;
grant select, insert on aphydle.puzzle_results                 to anon;
grant usage, select  on sequence aphydle.puzzle_results_id_seq to anon, authenticated;

-- ── page_visits ────────────────────────────────────────────────────────────
-- One row every time the app loads. `puzzle_no` is null when the visit
-- lands before today's puzzle has resolved; otherwise it pins the visit
-- to the day the user saw.
--
-- Privacy posture (also covers attempts below):
--   * The client mints a fresh random uuid every UTC day (stored locally,
--     never sent to the server unhashed across days). There is therefore
--     no stable cross-day identifier, no IP capture here, no UA capture.
--   * Anon role can INSERT/UPDATE but never SELECT — individual rows are
--     visible to project admins only (service role, SQL editor, dashboard).
create table if not exists aphydle.page_visits (
    id          bigserial primary key,
    anon_id     text not null,
    puzzle_no   integer,
    visited_at  timestamptz not null default now()
);

create index if not exists page_visits_puzzle_idx on aphydle.page_visits (puzzle_no);
create index if not exists page_visits_when_idx   on aphydle.page_visits (visited_at);
create index if not exists page_visits_anon_idx   on aphydle.page_visits (anon_id);

alter table aphydle.page_visits enable row level security;

drop policy if exists "insert page visit" on aphydle.page_visits;
create policy "insert page visit"
    on aphydle.page_visits
    for insert
    to anon, authenticated
    with check (anon_id is not null and length(anon_id) between 8 and 128);

grant insert on aphydle.page_visits                        to anon, authenticated;
grant usage, select on sequence aphydle.page_visits_id_seq to anon, authenticated;

-- ── attempts ───────────────────────────────────────────────────────────────
-- One row per (anon_id, puzzle_no) — the client upserts on that key, so
-- subsequent guesses overwrite the same row with the latest attempt_no
-- and outcome instead of stacking up one row per individual guess. Anon
-- ids rotate every UTC day, so this also pins each row to a single
-- player-day-puzzle.
--
-- attempt_no — the player's current 1-based guess count
-- guess_plant_id — last plant id they guessed
-- is_correct — true once they've solved it (locks in the final state)
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

-- Self-heal databases that were created under an earlier schema where the
-- unique key was (anon_id, puzzle_no, attempt_no). The runtime upsert keys
-- on (anon_id, puzzle_no) only — without a matching constraint PostgREST
-- 400s every attempts write and the world histogram stays empty.
alter table aphydle.attempts
    drop constraint if exists attempts_anon_id_puzzle_no_attempt_no_key;

-- The old shape stored one row per individual guess, so a single session
-- can have several rows with the same (anon_id, puzzle_no). Adding the
-- new unique constraint would fail on those duplicates, so collapse them
-- first: keep the highest attempt_no (the final state) and drop the rest.
delete from aphydle.attempts a
using aphydle.attempts b
where a.anon_id = b.anon_id
  and a.puzzle_no = b.puzzle_no
  and (
      a.attempt_no < b.attempt_no
      or (a.attempt_no = b.attempt_no and a.id < b.id)
  );

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
        alter table aphydle.attempts
            add constraint attempts_anon_id_puzzle_no_key
            unique (anon_id, puzzle_no);
    end if;
end $$;

create index if not exists attempts_puzzle_idx on aphydle.attempts (puzzle_no);
create index if not exists attempts_anon_idx   on aphydle.attempts (anon_id);

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

grant insert, update on aphydle.attempts                to anon, authenticated;
grant usage, select  on sequence aphydle.attempts_id_seq to anon, authenticated;

-- ── daily_distribution view ─────────────────────────────────────────────────
-- Buckets 1..10 are wins by attempt_no; bucket_lost is the loss tally
-- (players who used all 10 attempts without solving). The finish screen
-- reads this directly to draw the histogram. Sourced from aphydle.attempts
-- because that's the table the runtime actually writes to on every play —
-- aphydle.puzzle_results only fills in on hosts that finalise results.
-- Mid-game rows (attempt_no < 10 and not is_correct) are excluded so the
-- bars don't shift under the player's marker before they finish.
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

-- ── scheduled daily-log writer ─────────────────────────────────────────────
-- pg_cron backstop so today's row exists before any client refreshes. The
-- runtime still inserts on first visit (RLS-gated), but if no one opens the
-- app right after UTC midnight the table would otherwise stay empty until
-- someone does. This function picks the rotation plant for the current UTC
-- date and inserts it server-side; SECURITY DEFINER + ownership by the
-- migration role bypasses the daily_log RLS policy.
--
-- Rotation mirrors src/lib/data.js exactly:
--   pool   = public.plants with at least one populated public.plant_images.link
--          ordered by plants.id ascending (stable across deploys)
--   epoch  = 2026-04-27 (matches PUZZLE_EPOCH_UTC in src/engine/game.js)
--   index  = ((puzzle_no - 1) mod pool_size + pool_size) mod pool_size
--
-- On Supabase Cloud pg_cron must be enabled once via the dashboard
-- (Database → Extensions → pg_cron); this CREATE EXTENSION is a no-op when
-- it's already on. Self-hosted projects get it from this migration directly.
create extension if not exists pg_cron;

create or replace function aphydle.ensure_daily_log()
returns aphydle.daily_log
language plpgsql
security definer
set search_path = aphydle, public, pg_temp
as $$
declare
    v_today     date    := (now() at time zone 'utc')::date;
    v_epoch     date    := date '2026-04-27';
    v_puzzle_no integer := (v_today - v_epoch) + 1;
    v_pool_size integer;
    v_plant_id  text;
    v_row       aphydle.daily_log;
begin
    -- Already logged for this puzzle? Return the existing row unchanged so
    -- repeated calls (cron retries, manual invocations) are idempotent.
    select * into v_row
    from aphydle.daily_log
    where puzzle_no = v_puzzle_no;
    if found then
        return v_row;
    end if;

    -- Pool size: plants with at least one usable image. Matches the
    -- `plant_images!inner(link)` filter the client applies.
    select count(*) into v_pool_size
    from public.plants p
    where exists (
        select 1 from public.plant_images pi
        where pi.plant_id = p.id and pi.link is not null
    );

    if v_pool_size is null or v_pool_size = 0 then
        return null;
    end if;

    -- Deterministic rotation pick. OFFSET over the same ordered pool the
    -- client uses guarantees the cron and the runtime agree on the answer.
    select p.id::text into v_plant_id
    from public.plants p
    where exists (
        select 1 from public.plant_images pi
        where pi.plant_id = p.id and pi.link is not null
    )
    order by p.id
    offset (((v_puzzle_no - 1) % v_pool_size) + v_pool_size) % v_pool_size
    limit 1;

    if v_plant_id is null then
        return null;
    end if;

    insert into aphydle.daily_log (puzzle_no, puzzle_date, plant_id)
    values (v_puzzle_no, v_today, v_plant_id)
    on conflict (puzzle_no) do nothing
    returning * into v_row;

    return v_row;
end;
$$;

-- Lock the function down: only the owner (and pg_cron, which runs as the
-- database superuser) should invoke it. anon/authenticated keep using the
-- RLS-gated direct insert path.
revoke all on function aphydle.ensure_daily_log() from public;

-- Idempotent schedule: drop the old entry if a previous migration created
-- it, then (re)register at 00:05 UTC daily. The 5-minute offset gives the
-- date boundary a small grace window so the function never lands on the
-- exact tick where (now() at time zone 'utc')::date is still resolving.
do $$
begin
    if exists (select 1 from cron.job where jobname = 'aphydle_ensure_daily_log') then
        perform cron.unschedule('aphydle_ensure_daily_log');
    end if;
    perform cron.schedule(
        'aphydle_ensure_daily_log',
        '5 0 * * *',
        $cron$select aphydle.ensure_daily_log();$cron$
    );
end $$;
