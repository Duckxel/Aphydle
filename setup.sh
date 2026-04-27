#!/usr/bin/env bash
# Aphydle production setup script.
# Installs dependencies, ensures .env is configured, and builds the static
# bundle into ./dist for any static host (nginx, Caddy, S3+CloudFront, etc.).
#
# Usage:
#   ./setup.sh                # full setup: install + env + build
#   ./setup.sh --serve        # full setup, then start `vite preview` on port 4173
#   ./setup.sh --skip-install # skip npm install (use existing node_modules)
#   ./setup.sh --skip-build   # skip the production build (env + install only)
#   ./setup.sh --help

set -euo pipefail

cd "$(dirname "$0")"

# ── flags ────────────────────────────────────────────────────────────────────
SERVE=0
SKIP_INSTALL=0
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --serve)        SERVE=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-build)   SKIP_BUILD=1 ;;
    -h|--help)
      sed -n '2,11p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 2 ;;
  esac
done

if [ "$SKIP_BUILD" -eq 1 ] && [ "$SERVE" -eq 1 ]; then
  echo "--skip-build cannot be combined with --serve (nothing to preview)." >&2
  exit 2
fi

# ── helpers ──────────────────────────────────────────────────────────────────
say()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[!] \033[0m%s\n' "$*" >&2; }
fail() { printf '\n\033[1;31m[x] \033[0m%s\n' "$*" >&2; exit 1; }

# ── prerequisites ────────────────────────────────────────────────────────────
say "Checking prerequisites"

command -v node >/dev/null 2>&1 || fail "node is required. Install Node.js >= 18 (https://nodejs.org)."
command -v npm  >/dev/null 2>&1 || fail "npm is required (ships with Node.js)."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18 or newer required (found $(node -v))."
fi
echo "  node $(node -v) · npm $(npm -v)"

# ── env ──────────────────────────────────────────────────────────────────────
say "Configuring environment"

if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then
    fail ".env.example missing — cannot bootstrap .env."
  fi
  cp .env.example .env
  warn ".env created from .env.example."
  warn "Edit .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before serving in production."
else
  echo "  .env present"
fi

# Soft validation: warn (do not fail) if Supabase vars still look like placeholders.
# The app falls back to local seed data when Supabase is not configured, so
# building should not block on this.
if grep -qE '^VITE_SUPABASE_URL=https://your-project-ref' .env 2>/dev/null \
   || grep -qE '^VITE_SUPABASE_ANON_KEY=your-anon-key' .env 2>/dev/null; then
  warn "Supabase env vars still hold placeholder values — the app will run with local seed data only."
fi

# ── install ──────────────────────────────────────────────────────────────────
if [ "$SKIP_INSTALL" -eq 0 ]; then
  say "Installing dependencies"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
else
  say "Skipping npm install (--skip-install)"
fi

# ── build ────────────────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" -eq 1 ]; then
  say "Skipping production build (--skip-build)"
  cat <<EOF

  Aphydle is configured but not built.

  To build now:           ./setup.sh --skip-install
  To build and preview:   ./setup.sh --skip-install --serve

EOF
  exit 0
fi

say "Building production bundle"
npm run build

if [ ! -d dist ]; then
  fail "Build did not produce ./dist — check the output above."
fi

DIST_BYTES="$(du -sb dist | awk '{print $1}')"
DIST_HUMAN="$(du -sh dist | awk '{print $1}')"
say "Build complete · ./dist (${DIST_HUMAN}, ${DIST_BYTES} bytes)"

# ── done ─────────────────────────────────────────────────────────────────────
cat <<EOF

  Aphydle is built and ready to serve.

  Static output:   $(pwd)/dist
  Entry point:     dist/index.html

  Serve options:
    nginx     — point root at $(pwd)/dist (sample at deploy/aphydle.nginx.conf)
    caddy     — file_server /aphydle/* root $(pwd)/dist
    preview   — npm run preview   (vite preview on port 4173)
    static    — npx serve dist    (any static file server works)

  Hosting under a sub-path? Re-build with VITE_APP_BASE_PATH=/your/path/.

EOF

if [ "$SERVE" -eq 1 ]; then
  say "Starting vite preview on http://0.0.0.0:4173"
  exec npm run preview -- --host 0.0.0.0 --port 4173
fi
