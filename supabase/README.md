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

A single idempotent sync file does the whole job. Re-running it is safe — on a
fresh database it creates everything; on a database that already has an older
version of the Aphydle schema it drops the retired tables and brings the rest
up to current.

Supabase CLI (recommended — tracks history):

```bash
# from this repo's root
supabase link --project-ref <your-project-ref>
supabase db push                # applies supabase/migrations/0001_aphydle_sync.sql
```

One-off / manual: open the Supabase SQL editor and paste the contents of
`supabase/migrations/0001_aphydle_sync.sql`, then run it.

## What the sync creates

| Object                          | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `aphydle` schema                | Namespace for everything below; isolates Aphydle from the host project.   |
| `aphydle.puzzle_results`        | Per-(puzzle, player) outcome rows with RLS so users only insert their own.|
| `aphydle.daily_distribution`    | View aggregating `puzzle_results` into the histogram on the finish screen.|
| `aphydle.daily_log`             | Append-only record of which `plant_id` was served on which puzzle day.    |

## What the sync drops (if present from older migrations)

- `aphydle.plants` — the runtime reads `public.plants` from PlantSwipe instead.
- `aphydle.guessable_plants` — autocomplete is served from `public.plants`.
- `aphydle.daily_puzzles` — replaced by the simpler `aphydle.daily_log`.

These drops cascade, which strips the legacy
`puzzle_results.puzzle_no → daily_puzzles.puzzle_no` foreign key. Existing rows
in `puzzle_results` are preserved; only the constraint goes away.
