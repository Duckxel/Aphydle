# Supabase setup

Aphydle's runtime falls back to the seed catalog in `src/data/plants.js` when
Supabase is not configured, so the app boots without any backend. The objects
defined here become load-bearing once you wire `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` and start serving the daily puzzle from the database.

Aphydle reads plant content (taxonomy, names, images, translations, toxicity,
sunlight, etc.) directly from PlantSwipe's `public.plants`,
`public.plant_images`, `public.plant_translations`. **None of those tables are
created or modified here** — Aphydle assumes the PlantSwipe schema is already
present in the same project. This migration only encodes the Aphydle-private
bookkeeping that PlantSwipe doesn't own.

## Applying

The migration files are idempotent. Re-running them is safe — on a fresh
database they create everything; on a database that already has an older
version of the Aphydle schema they drop the retired tables and bring the
rest up to current.

Supabase CLI (recommended — tracks history):

```bash
# from this repo's root
supabase link --project-ref <your-project-ref>
supabase db push                # applies every supabase/migrations/*.sql
```

One-off / manual: open the Supabase SQL editor and paste the contents of
each file in `supabase/migrations/` in order, then run them.

## What the sync creates

| Object                          | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `aphydle` schema                | Namespace for everything below; isolates Aphydle from the host project.   |
| `aphydle.puzzle_results`        | Per-(puzzle, player) outcome rows with RLS. Authenticated users insert under their `auth.uid()`; unauthenticated players insert under their per-day anon id. |
| `aphydle.daily_distribution`    | View aggregating `puzzle_results` into the histogram on the finish screen.|
| `aphydle.daily_log`             | Append-only record of which `plant_id` was served on which puzzle day.    |
| `aphydle.ensure_daily_log()`    | SECURITY DEFINER fn that picks the rotation plant for today and inserts it; bypasses RLS. |
| `cron` job `aphydle_ensure_daily_log` | pg_cron schedule (`5 0 * * *` UTC) that calls `ensure_daily_log()` so today's row exists before any client visits. |
| `aphydle.page_visits`           | One row per app load. Anon insert / admin-only select. Useful for daily active counts. |
| `aphydle.attempts`              | One row per individual guess (puzzle + attempt no + plant id + correctness). Anon insert / admin-only select. Joins to `puzzle_results` via `(puzzle_no, anon_id ↔ player_id)`. |

### Anonymized analytics

The `page_visits` and `attempts` tables are tagged with a fresh random uuid
that the client mints every UTC day and stores locally — no IP, no user
agent, no cross-day identifier. RLS lets `anon` insert but never select,
so individual rows are only visible to project admins (service role / SQL
editor / dashboard). Useful queries:

```sql
-- daily unique players + total guesses
select puzzle_no,
       count(distinct anon_id) as players,
       count(*)                as guesses
from aphydle.attempts
group by puzzle_no
order by puzzle_no desc;

-- most frequent wrong guesses by puzzle
select puzzle_no, guess_plant_id, count(*) as picks
from aphydle.attempts
where is_correct = false and guess_plant_id is not null
group by puzzle_no, guess_plant_id
order by puzzle_no desc, picks desc;

-- visits vs. completions per puzzle
select v.puzzle_no,
       count(distinct v.anon_id)   as visitors,
       count(distinct r.player_id) as finishers
from aphydle.page_visits v
left join aphydle.puzzle_results r
       on r.puzzle_no = v.puzzle_no
      and r.player_id = v.anon_id
group by v.puzzle_no
order by v.puzzle_no desc;
```

> **pg_cron note:** on Supabase Cloud the `pg_cron` extension must be
> enabled once via the dashboard (Database → Extensions). This migration's
> `create extension if not exists pg_cron` is a no-op when it's already on,
> but it can't enable the extension on a project where the dashboard
> toggle is off. Self-hosted Postgres installs get it from the migration
> directly.

## What the sync drops (if present from older migrations)

- `aphydle.plants` — the runtime reads `public.plants` from PlantSwipe instead.
- `aphydle.guessable_plants` — autocomplete is served from `public.plants`.
- `aphydle.daily_puzzles` — replaced by the simpler `aphydle.daily_log`.

These drops cascade, which strips the legacy
`puzzle_results.puzzle_no → daily_puzzles.puzzle_no` foreign key. Existing rows
in `puzzle_results` are preserved; only the constraint goes away.

## Troubleshooting

**`POST /rest/v1/attempts … 401 (Unauthorized)` on every guess**, and the
finish-screen world histogram shows only the local player. The migration ran
successfully but the analytics writes still fail. Three things to check, in
order:

1. **`aphydle` is in the project's exposed schemas list.** Supabase →
   Project Settings → API → "Exposed schemas". `aphydle` must be in the
   comma-separated list (typically alongside `public, graphql_public`).
   Without it, PostgREST refuses every aphydle-schema call regardless of
   grants. Edit, save, and the change takes effect immediately.

2. **The `VITE_SUPABASE_ANON_KEY` matches the project.** If the project's
   API keys were rotated (Project Settings → API → "Reset anon key"), every
   deployment with the old key starts 401-ing. Update the env var and
   redeploy. To check: open the deployed site, paste the anon key into
   <https://jwt.io>, and confirm the `ref` claim matches your project ref.

3. **No stale `sb-*-auth-token` in localStorage.** Aphydle has no sign-in
   flow, so the client now disables session persistence (see
   `src/lib/supabase.js`). If you're testing an old build that still had
   `persistSession: true`, clear site data once for the deployed origin
   and reload; afterwards every request goes as `anon` with a fresh JWT.

The runtime now logs the underlying PostgREST error code (`code=...`,
`message=...`) once per table to the browser console, so you can match the
symptom to the cause: `PGRST106` ⇒ schema not exposed (#1), `PGRST301` /
`JWS verification failed` ⇒ wrong or expired key (#2 or #3), `42501` ⇒
grants/RLS — apply `0002_repair_attempts_grants.sql` (see below).

### `42501 permission denied for table attempts`

This is the most common cause of the 401 + empty histogram, and it's sticky:
once the table exists without `grant insert, update on aphydle.attempts to
anon`, no amount of editing `0001_aphydle_sync.sql` brings it back, because
Supabase tracks applied migrations by filename and won't re-run a file it has
already recorded. (Original cause: an early version of `0001` ran a raw
`create extension pg_cron` that aborts on locked-down Cloud projects, which
rolled back every grant that came after it in the same transaction.)

`0002_repair_attempts_grants.sql` is a fresh migration that re-applies the
RLS policies and grants on every aphydle analytics table. It is idempotent
and safe to run on any state. Apply it with:

```bash
supabase db push                # picks up 0002 + 0003
```

Or paste each file's contents into the Supabase SQL editor and run them once.

If 0002 still doesn't fix it (which has happened on at least one project for
reasons we never pinned down), `0003_attempt_rpc.sql` removes the table-level
grant from the equation entirely. It defines `aphydle.record_attempt(...)` and
`aphydle.record_visit(...)` as `SECURITY DEFINER` functions and the runtime
calls them via `supabase-js .rpc(...)` instead of writing to the table
directly. The function body runs with the OWNER's privileges (typically
`postgres`), so the upsert succeeds even when `anon` somehow ends up without
INSERT on `aphydle.attempts`. After 0003 lands, the
`[Aphydle] aphydle.attempts write rejected` warning stops appearing and the
world histogram fills in on the next guess.
