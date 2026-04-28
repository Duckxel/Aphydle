-- Bypass the table-level GRANT path entirely by exposing an RPC.
--
-- Background: 0001 grants `insert, update on aphydle.attempts to anon`, and
-- 0002 re-applies the same grant in a separate migration that's guaranteed
-- to run via `supabase db push`. Both should fix the 401 / SQLSTATE 42501
-- ("permission denied for table attempts") that empties the world histogram
-- — but on this project they don't, and we've run out of guesses about why
-- the table grant won't take. The RPC below sidesteps the question entirely.
--
-- `aphydle.record_attempt` is SECURITY DEFINER, owned by the migration role
-- (typically `postgres` on Supabase). Inside the function body the upsert
-- runs with the OWNER's privileges, not the caller's, so it works even if
-- `anon` has zero direct access to `aphydle.attempts`. The only privilege
-- the caller needs is EXECUTE on the function, which we grant explicitly.
--
-- The runtime (src/lib/analytics.js#trackAttempt) calls this via supabase-js
-- `.rpc('record_attempt', { p_anon_id, p_puzzle_no, … })`, so the request
-- never hits PostgREST's table endpoint and the 42501 path can't trigger.

-- ── attempts table backstop ────────────────────────────────────────────────
-- The function references aphydle.attempts; if 0001 + 0002 both rolled back,
-- the table wouldn't exist and the function definition would fail. Make sure
-- the table is here with the shape the function expects. Idempotent.
create schema if not exists aphydle;
grant usage on schema aphydle to anon, authenticated;

create table if not exists aphydle.attempts (
    id              bigserial primary key,
    anon_id         text not null,
    puzzle_no       integer not null,
    attempt_no      smallint not null check (attempt_no between 1 and 10),
    guess_plant_id  text,
    is_correct      boolean not null default false,
    attempted_at    timestamptz not null default now()
);

alter table aphydle.attempts
    drop constraint if exists attempts_anon_id_puzzle_no_attempt_no_key;

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

-- ── record_attempt(...) ────────────────────────────────────────────────────
-- One row per (anon_id, puzzle_no), upserted. Validation mirrors the RLS
-- check in 0001 so a malformed call fails fast with a useful error code
-- instead of slipping a garbage row into the table.
create or replace function aphydle.record_attempt(
    p_anon_id        text,
    p_puzzle_no      integer,
    p_attempt_no     integer,
    p_guess_plant_id text,
    p_is_correct     boolean
)
returns void
language plpgsql
security definer
set search_path = aphydle, pg_temp
as $$
begin
    if p_anon_id is null or length(p_anon_id) < 8 or length(p_anon_id) > 128 then
        raise exception 'invalid anon_id' using errcode = '22023';
    end if;
    if p_puzzle_no is null then
        raise exception 'invalid puzzle_no' using errcode = '22023';
    end if;
    if p_attempt_no is null or p_attempt_no < 1 or p_attempt_no > 10 then
        raise exception 'invalid attempt_no' using errcode = '22023';
    end if;

    insert into aphydle.attempts (
        anon_id, puzzle_no, attempt_no, guess_plant_id, is_correct, attempted_at
    )
    values (
        p_anon_id,
        p_puzzle_no,
        p_attempt_no::smallint,
        p_guess_plant_id,
        coalesce(p_is_correct, false),
        now()
    )
    on conflict (anon_id, puzzle_no) do update
    set attempt_no     = excluded.attempt_no,
        guess_plant_id = excluded.guess_plant_id,
        is_correct     = excluded.is_correct,
        attempted_at   = excluded.attempted_at;
end;
$$;

-- Lock the function down: only anon/authenticated can call it. PUBLIC is
-- revoked first so a default `EXECUTE TO PUBLIC` grant from a fresh function
-- never widens access beyond what's intended.
revoke all on function aphydle.record_attempt(text, integer, integer, text, boolean) from public;
grant execute on function aphydle.record_attempt(text, integer, integer, text, boolean) to anon, authenticated;

-- ── record_visit(...) ──────────────────────────────────────────────────────
-- Same treatment for page_visits so the visit-tracking write doesn't 42501
-- if the page_visits table grant is in the same broken state as attempts.
create table if not exists aphydle.page_visits (
    id          bigserial primary key,
    anon_id     text not null,
    puzzle_no   integer,
    visited_at  timestamptz not null default now()
);

create or replace function aphydle.record_visit(
    p_anon_id   text,
    p_puzzle_no integer
)
returns void
language plpgsql
security definer
set search_path = aphydle, pg_temp
as $$
begin
    if p_anon_id is null or length(p_anon_id) < 8 or length(p_anon_id) > 128 then
        raise exception 'invalid anon_id' using errcode = '22023';
    end if;

    insert into aphydle.page_visits (anon_id, puzzle_no, visited_at)
    values (p_anon_id, p_puzzle_no, now());
end;
$$;

revoke all on function aphydle.record_visit(text, integer) from public;
grant execute on function aphydle.record_visit(text, integer) to anon, authenticated;
