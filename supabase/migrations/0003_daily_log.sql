-- Permanent server-side log of which plant was served on which puzzle
-- day. Independent of `daily_puzzles` so it works regardless of which
-- plants table (aphydle.plants vs public.plants) the runtime is reading
-- from — `plant_id` here is just an opaque string. Append-only: clients
-- can record today's pick but can't rewrite historical entries.

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
-- UTC date so the log can't be backfilled or rewritten by a malicious client.
-- The unique key on puzzle_no makes inserts idempotent — first writer wins.
drop policy if exists "insert today's daily log" on aphydle.daily_log;
create policy "insert today's daily log"
    on aphydle.daily_log
    for insert
    to anon, authenticated
    with check (puzzle_date = (now() at time zone 'utc')::date);

grant select, insert on aphydle.daily_log to anon, authenticated;
