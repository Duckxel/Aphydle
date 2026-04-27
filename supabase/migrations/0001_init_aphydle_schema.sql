-- Aphydle initial schema.
-- Lives under its own `aphydle` schema so it can co-exist with the Aphylia
-- host's tables in the same Supabase project without name collisions.

create schema if not exists aphydle;

-- ── plants ──────────────────────────────────────────────────────────────────
-- Mirrors the shape of DAILY_PLANTS in src/data/plants.js. `attributes` and
-- `dominant_colors` are jsonb so the app can extend them without migrations.
create table if not exists aphydle.plants (
    id                text primary key,
    common_name       text not null,
    scientific_name   text not null,
    family            text not null,
    habitat           text not null,
    growth_form       text not null,
    foliage           text not null,
    care_level        smallint not null check (care_level between 0 and 5),
    light_needs       text not null,
    native_region     text not null,
    toxicity          text not null,
    dominant_colors   jsonb not null default '[]'::jsonb,
    image_url         text not null,
    fact              text,
    common_misguess   jsonb,
    attributes        jsonb not null default '{}'::jsonb,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists plants_family_idx       on aphydle.plants (family);
create index if not exists plants_growth_form_idx  on aphydle.plants (growth_form);

-- ── guessable plants ────────────────────────────────────────────────────────
-- Pure autocomplete catalog. Every aphydle.plants.id should also exist here.
create table if not exists aphydle.guessable_plants (
    id              text primary key,
    name            text not null,
    family          text not null,
    habitat         text not null,
    growth_form     text not null,
    foliage         text not null,
    light_needs     text not null,
    native_region   text not null,
    toxicity        text not null,
    created_at      timestamptz not null default now()
);

create index if not exists guessable_name_idx on aphydle.guessable_plants (lower(name));

-- ── daily puzzle rotation ───────────────────────────────────────────────────
-- One row per puzzle number; `puzzle_date` is the UTC date the puzzle is
-- first served. Unique on both so backfills can reference either.
create table if not exists aphydle.daily_puzzles (
    puzzle_no    integer primary key,
    puzzle_date  date not null unique,
    plant_id     text not null references aphydle.plants(id) on delete restrict,
    created_at   timestamptz not null default now()
);

create index if not exists daily_puzzles_plant_idx on aphydle.daily_puzzles (plant_id);

-- ── auto-update updated_at on plants ────────────────────────────────────────
create or replace function aphydle.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists plants_set_updated_at on aphydle.plants;
create trigger plants_set_updated_at
    before update on aphydle.plants
    for each row execute function aphydle.set_updated_at();

-- ── grants ──────────────────────────────────────────────────────────────────
-- The anon key only needs to read the catalog and the daily puzzle pointer.
grant usage on schema aphydle to anon, authenticated;
grant select on aphydle.plants            to anon, authenticated;
grant select on aphydle.guessable_plants  to anon, authenticated;
grant select on aphydle.daily_puzzles     to anon, authenticated;
