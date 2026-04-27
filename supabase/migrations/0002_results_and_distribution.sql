-- Per-result recording + an aggregate view that powers the
-- "THE WORLD" distribution chart on the finish screen.

-- ── puzzle_results ──────────────────────────────────────────────────────────
-- One row per (puzzle, player) attempt. `player_id` is whatever stable
-- identifier the host has — typically auth.uid() when the user is signed in
-- to Supabase, otherwise a hashed Aphylia session id.
create table if not exists aphydle.puzzle_results (
    id           bigserial primary key,
    puzzle_no    integer not null references aphydle.daily_puzzles(puzzle_no) on delete cascade,
    player_id    text not null,
    outcome      text not null check (outcome in ('won', 'lost')),
    guess_count  smallint not null check (guess_count between 1 and 10),
    finished_at  timestamptz not null default now(),
    -- Idempotency: one result per puzzle per player. Inserts retry safely.
    unique (puzzle_no, player_id)
);

create index if not exists puzzle_results_puzzle_idx on aphydle.puzzle_results (puzzle_no);
create index if not exists puzzle_results_player_idx on aphydle.puzzle_results (player_id);

-- ── daily_distribution view ─────────────────────────────────────────────────
-- Buckets 1..10 are wins by guess count. Bucket 11 ("lost") is losses.
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

-- ── row-level security ──────────────────────────────────────────────────────
alter table aphydle.puzzle_results enable row level security;

-- Anyone can insert their own result (the `with check` enforces it). The
-- anon key uses 'anon' as auth.uid(), so the host is expected to either:
--   a) sign players in (Supabase auth) and pass auth.uid() as player_id, or
--   b) write results via a service-role function on its own backend.
-- The catch-all "insert your own row" policy below covers case (a).
drop policy if exists "insert own result" on aphydle.puzzle_results;
create policy "insert own result"
    on aphydle.puzzle_results
    for insert
    to authenticated
    with check (player_id = auth.uid()::text);

-- Reads are always allowed (the histogram is public information).
drop policy if exists "read all results" on aphydle.puzzle_results;
create policy "read all results"
    on aphydle.puzzle_results
    for select
    to anon, authenticated
    using (true);

grant select, insert on aphydle.puzzle_results to authenticated;
grant select         on aphydle.puzzle_results to anon;
grant usage, select  on sequence aphydle.puzzle_results_id_seq to authenticated;
grant select         on aphydle.daily_distribution to anon, authenticated;
