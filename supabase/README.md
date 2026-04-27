# Supabase setup

Aphydle's runtime falls back to the seed catalog in `src/data/plants.js` when
Supabase is not configured, so the app boots without these tables. They become
load-bearing once you wire `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and
start serving the daily puzzle from the database.

The Aphylia host shares its Supabase project with Aphydle — these migrations
are designed to land in that shared project without colliding with the host's
own tables (everything lives in the `aphydle` schema).

## Applying migrations

Using the Supabase CLI (recommended — keeps history reproducible):

```bash
# from this repo's root
supabase link --project-ref <your-project-ref>
supabase db push                # applies anything in supabase/migrations/
```

Or, for one-off / manual application: open the Supabase SQL editor and paste
each file under `supabase/migrations/` in order.

## What the migrations create

| File                                            | Creates                                                      |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `0001_init_aphydle_schema.sql`                  | `aphydle` schema, `plants`, `guessable_plants`, `daily_puzzles`. |
| `0002_results_and_distribution.sql`             | `puzzle_results` table + `daily_distribution` view; row-level security policies. |

After applying, seed your `aphydle.plants` table from the same shape as
`DAILY_PLANTS` in `src/data/plants.js`. The keys map 1:1 (snake_cased).
