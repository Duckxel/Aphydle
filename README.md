# Aphydle

A daily plant guessing game — one mystery plant, ten guesses, the picture clears as you go.

Built with **React 18 + Vite**. Designed to be cloned into the Aphylia host stack as an embedded game.

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

Hosting under a sub-path? Set `VITE_APP_BASE_PATH` (e.g. `/aphydle/`) before
running `./setup.sh` so asset URLs resolve correctly. Note: this is _not_ the
default Aphylia host layout — see "Embedding inside the Aphylia host" below.

## Environment variables

All client-side variables are prefixed with `VITE_` (a Vite requirement).

| Variable                  | Required | Description                                                                  |
| ------------------------- | -------- | ---------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`       | yes\*    | Supabase project URL (Project Settings → API).                               |
| `VITE_SUPABASE_ANON_KEY`  | yes\*    | Supabase anonymous key (Project Settings → API).                             |
| `VITE_APP_BASE_PATH`      | no       | Base path when hosted under a sub-route. Defaults to `/`.                    |
| `VITE_APHYLIA_API_URL`    | no       | Origin of the Aphylia host API, when Aphydle should record results upstream. |
| `VITE_APHYLIA_HOST_URL`   | no       | URL of the Aphylia host; renders a "← back to Aphylia" footer link.         |

\* The app boots without Supabase configured (it falls back to local seed data in `src/data/plants.js`), so you can develop offline. The Supabase client is exported from `src/lib/supabase.js`.

If you set `VITE_APHYLIA_API_URL` and the embedding host enforces a strict
Content-Security-Policy, make sure the API origin appears in the page's
`connect-src` directive (the Aphylia host's nginx fronts this — see its
deploy tooling for the canonical CSP).

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

## Embedding inside the Aphylia host

The Aphylia host clones this repo and serves the built bundle from its **own
subdomain** — typically `aphydle.<primary-domain>` — with the application base
path left at `/`. The host's deploy tooling takes care of:

- writing a real `.env` (this repo's `.env.example` is overwritten at deploy
  time — do not put production secrets in it),
- running `bun install && bun run build`,
- pointing nginx at the resulting `dist/` from `aphydle.<primary>`,
- supplying the systemd unit that binds the (optional) preview server to
  `127.0.0.1` only.

So the canonical embedded layout is:

```
https://aphylia.example          → Aphylia host
https://aphydle.aphylia.example  → Aphydle (this app, base "/")
```

Sub-path hosting (e.g. `/games/aphydle/`) is still supported — set
`VITE_APP_BASE_PATH=/games/aphydle/` before building — but it's not the
default wiring.

### Health check

The build ships `/health.json` at the bundle root. The host (or any external
monitoring) can probe it to distinguish a stale build from a fresh one — the
file embeds the build timestamp and git SHA so a 200 with the expected SHA
proves the deploy reached the box.

### Build provenance

Each build embeds:

- `VITE_APP_BUILD_TIMESTAMP` — UTC ISO-8601 timestamp at `vite build` time,
- `VITE_APP_BUILD_SHA` — short (7-char) git SHA of `HEAD`, or `unknown`
  outside a git checkout.

These are exposed at runtime via `src/lib/version.js` so the Aphylia admin
panel (or any consumer) can render `Aphydle: v0.1.0 (sha abc1234, built …)`.

## How the game works

- 10 guesses per day. The image starts as a chunky pixel mosaic and clears with every wrong guess.
- Each guess is compared cell-by-cell against the answer's attributes (family, habitat, growth form, foliage, light, native region, toxicity). Matching cells highlight green; misses are struck through.
- A hint schedule reveals additional text clues at attempts 1–9 (see `HINT_SCHEDULE` in `src/engine/game.js`).
- Win or lose, the finish screen shows the answer, a fact, world distribution, and the most common misguess.
