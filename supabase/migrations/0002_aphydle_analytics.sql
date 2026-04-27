-- Aphydle anonymized analytics. Idempotent.
--
-- Adds two append-only tables for product analytics that admins can query
-- from the SQL editor:
--   aphydle.page_visits — one row per page load
--   aphydle.attempts    — one row per individual guess
-- and loosens aphydle.puzzle_results so unauthenticated players can also
-- record their final outcome under the same per-day anonymous id.
--
-- Privacy posture:
--   * The client mints a fresh random uuid every UTC day (stored locally,
--     never sent to the server unhashed across days). There is therefore
--     no stable cross-day identifier, no IP capture here, no UA capture.
--   * Anon role can INSERT but never SELECT — individual rows are visible
--     to project admins only (service role, SQL editor, dashboard).

-- ── page_visits ────────────────────────────────────────────────────────────
-- One row every time the app loads. `puzzle_no` is null when the visit
-- lands before today's puzzle has resolved; otherwise it pins the visit
-- to the day the user saw.
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

grant insert on aphydle.page_visits                 to anon, authenticated;
grant usage, select on sequence aphydle.page_visits_id_seq to anon, authenticated;

-- ── attempts ───────────────────────────────────────────────────────────────
-- One row per individual guess. `attempt_no` is the 1-based index inside
-- the current puzzle. `is_correct` is the win flag for that single guess
-- (true means the player solved on this attempt).
create table if not exists aphydle.attempts (
    id              bigserial primary key,
    anon_id         text not null,
    puzzle_no       integer not null,
    attempt_no      smallint not null check (attempt_no between 1 and 10),
    guess_plant_id  text,
    is_correct      boolean not null default false,
    attempted_at    timestamptz not null default now(),
    -- Idempotency: re-submitting the same attempt is a no-op.
    unique (anon_id, puzzle_no, attempt_no)
);

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

grant insert on aphydle.attempts                 to anon, authenticated;
grant usage, select on sequence aphydle.attempts_id_seq to anon, authenticated;

-- ── puzzle_results: allow anon submissions ─────────────────────────────────
-- The original migration only let authenticated users insert their result
-- (player_id = auth.uid()). Add a parallel anon path so unauthenticated
-- players can record their final outcome under the same per-day anon id
-- the analytics tables use. The unique (puzzle_no, player_id) constraint
-- still makes this idempotent.
drop policy if exists "insert anon result" on aphydle.puzzle_results;
create policy "insert anon result"
    on aphydle.puzzle_results
    for insert
    to anon
    with check (player_id is not null and length(player_id) between 8 and 128);

grant insert on aphydle.puzzle_results to anon;
