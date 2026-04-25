# Aphydle

A daily plant guessing game — one mystery plant, ten guesses, the picture clears as you go.

Built with **React 18 + Vite**. Designed to be cloned into [PlantSwipe](https://github.com/Duckxel/PlantSwipe) as an embedded game.

## Quick start (development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY

# 3. Start the dev server
npm run dev
```

## Production deploy

One-shot setup script — installs deps, bootstraps `.env`, builds the static
bundle into `./dist`:

```bash
./setup.sh             # install + env + build
./setup.sh --serve     # also start `vite preview` on :4173
./setup.sh --skip-install   # rebuild without re-installing
```

After it runs, `./dist` is a plain static bundle that any web server can host.
A sample nginx config is at `deploy/aphydle.nginx.conf` — point its `root` at
the absolute path of `dist/`, drop it into `sites-enabled/`, and reload nginx.

Hosting under a sub-path (e.g. `/games/aphydle/` inside PlantSwipe)? Set
`VITE_APP_BASE_PATH=/games/aphydle/` before running `./setup.sh` so asset URLs
resolve correctly.

## Environment variables

All client-side variables are prefixed with `VITE_` (a Vite requirement).

| Variable                 | Required | Description                                                  |
| ------------------------ | -------- | ------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | yes\*    | Supabase project URL (Project Settings → API).               |
| `VITE_SUPABASE_ANON_KEY` | yes\*    | Supabase anonymous key (Project Settings → API).             |
| `VITE_APP_BASE_PATH`     | no       | Base path when hosted under a sub-route. Defaults to `/`.    |

\* The app boots without Supabase configured (it falls back to local seed data in `src/data/plants.js`), so you can develop offline. The Supabase client is exported from `src/lib/supabase.js`.

## Project structure

```
.
├── index.html              # Vite entry HTML
├── package.json
├── vite.config.js
├── .env.example
├── public/                 # static assets
└── src/
    ├── main.jsx            # React root
    ├── App.jsx             # Top-level state + screen routing
    ├── lib/
    │   └── supabase.js     # Supabase client (wired to .env)
    ├── data/
    │   └── plants.js       # Plant catalog, columns, archive, stats
    ├── engine/
    │   └── game.js         # Reducer, hint schedule, mosaic math
    ├── components/
    │   ├── GameScreen.jsx
    │   ├── FinishScreen.jsx
    │   ├── PlantImage.jsx
    │   ├── GuessRow.jsx
    │   ├── AttemptsBar.jsx
    │   ├── ui/             # Tokens + small reusable UI
    │   │   ├── tokens.js
    │   │   ├── MosaicLeaf.jsx
    │   │   ├── MosaicStrip.jsx
    │   │   └── GuessInput.jsx
    │   └── screens/        # Overlay sheets (stats, archive, how-to)
    │       ├── Sheet.jsx
    │       ├── StatsScreen.jsx
    │       ├── ArchiveScreen.jsx
    │       └── HowToScreen.jsx
    └── styles/
        └── global.css
```

## Embedding inside PlantSwipe

PlantSwipe will clone this repo and serve the built bundle from a sub-route. To host under e.g. `/games/aphydle`, set `VITE_APP_BASE_PATH=/games/aphydle/` before building.

## How the game works

- 10 guesses per day. The image starts as a chunky pixel mosaic and clears with every wrong guess.
- Each guess is compared cell-by-cell against the answer's attributes (family, habitat, growth form, foliage, light, native region, toxicity). Matching cells highlight green; misses are struck through.
- A hint schedule reveals additional text clues at attempts 1–9 (see `HINT_SCHEDULE` in `src/engine/game.js`).
- Win or lose, the finish screen shows the answer, a fact, world distribution, and the most common misguess.
