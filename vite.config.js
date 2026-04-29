import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { renderPuzzlePage, renderPuzzleIndexPage } from "./seo/render.mjs";
import { fetchPuzzleArchive } from "./seo/puzzle-fetch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function shortGitSha() {
  if (process.env.VITE_APP_BUILD_SHA) return process.env.VITE_APP_BUILD_SHA;
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf8"),
);
const APP_VERSION = pkg.version || "0.0.0";

// These are computed once at module load with whatever env is in process.env
// at that moment, then reassigned inside the defineConfig callback after
// loadEnv has merged in .env files. Plugins capture the bindings by closure,
// so they read the post-loadEnv values at request time.
let BUILD_SHA = shortGitSha();
let BUILD_TIMESTAMP = process.env.VITE_APP_BUILD_TIMESTAMP || new Date().toISOString();

// Canonical site URL used by SEO artefacts (canonical link, OG/Twitter URLs,
// JSON-LD, robots.txt, sitemap.xml). Override via env when deploying to a
// different host. Trailing slash is stripped so we can compose paths cleanly.
let SITE_URL = (process.env.VITE_APP_SITE_URL || "https://aphydle.aphylia.com")
  .trim()
  .replace(/\/+$/, "");
let OG_IMAGE = (process.env.VITE_APP_OG_IMAGE || `${SITE_URL}/og-image.png`).trim();

// In dev we bind to 127.0.0.1 by default for safety — `vite dev` is not
// hardened for the open internet. Set APHYDLE_DEV_HOST=0.0.0.0 (or use
// `npm run dev -- --host`) when you really need LAN access. In the
// embedded production layout the systemd unit binds to localhost only
// and nginx fronts the public subdomain.
let DEV_HOST = process.env.APHYDLE_DEV_HOST || "127.0.0.1";

// Emits robots.txt and sitemap.xml with absolute URLs derived from
// SITE_URL, and substitutes %VITE_APP_SITE_URL% / %VITE_APP_OG_IMAGE%
// placeholders in index.html so the canonical link, OG tags, and
// JSON-LD point at the configured deploy host. Vite only auto-replaces
// HTML env tokens that resolve through import.meta.env, so we do the
// substitution here to keep a sensible default when no env is set.
function seoArtifactsPlugin() {
  // Resolved at configResolved() so we honour the user's `base` (sub-path
  // hosting). `/` default keeps dev middleware functional before Vite has
  // a chance to call us.
  let basePath = process.env.VITE_APP_BASE_PATH || "/";
  if (!basePath.endsWith("/")) basePath += "/";

  // Past-puzzle archive populated once at build start. Empty when env vars
  // aren't set, the network is down, or the schema is unreachable — in that
  // case we just emit no /puzzle/<n>/ pages and the build still ships.
  let archive = [];
  let archiveFetched = false;

  // Lightweight per-process cache so dev middleware doesn't hit Supabase
  // on every request. Refreshes on a TTL so newly-played puzzles surface
  // without a server restart.
  let devArchive = [];
  let devArchiveAt = 0;
  const DEV_TTL_MS = 60_000;

  async function getArchiveForDev() {
    const now = Date.now();
    if (now - devArchiveAt < DEV_TTL_MS && devArchive.length > 0) return devArchive;
    try {
      devArchive = await fetchPuzzleArchive({ logger: { info: () => {}, warn: () => {} } });
      devArchiveAt = now;
    } catch {
      // keep stale cache on error
    }
    return devArchive;
  }

  const robotsTxt = () =>
    [
      "# Aphydle — daily plant guessing game",
      "User-agent: *",
      "Allow: /",
      "",
      "# Block the build/health probe from being indexed.",
      "Disallow: /health.json",
      "# Admin-only social export entry point.",
      "Disallow: /export",
      "",
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
    ].join("\n");

  const sitemapXml = (archiveOverride) => {
    const archiveForMap = archiveOverride ?? archive;
    const lastmod = (process.env.VITE_APP_BUILD_TIMESTAMP || new Date().toISOString()).slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}${basePath}`, changefreq: "daily", priority: "1.0", lastmod },
    ];
    if (archiveForMap.length > 0) {
      urls.push({
        loc: `${SITE_URL}${basePath}puzzle/`,
        changefreq: "daily",
        priority: "0.8",
        lastmod,
      });
      for (const p of archiveForMap) {
        urls.push({
          loc: `${SITE_URL}${basePath}puzzle/${p.puzzleNo}/`,
          // Past puzzles don't change. The lastmod stays at puzzle_date so
          // crawlers know they've already indexed the final state.
          changefreq: "yearly",
          priority: "0.5",
          lastmod: p.puzzleDate || lastmod,
        });
      }
    }
    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join("\n");
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${body}\n` +
      `</urlset>\n`
    );
  };

  const replacePlaceholders = (html) =>
    html
      .replaceAll("%VITE_APP_SITE_URL%", SITE_URL)
      .replaceAll("%VITE_APP_OG_IMAGE%", OG_IMAGE);

  function findNeighbours(puzzleNo, list) {
    const sorted = [...list].sort((a, b) => a.puzzleNo - b.puzzleNo);
    const idx = sorted.findIndex((p) => p.puzzleNo === puzzleNo);
    if (idx < 0) return { prev: null, next: null };
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }

  return {
    name: "aphydle-seo-artifacts",
    apply: () => true,
    configResolved(cfg) {
      basePath = cfg.base || "/";
      if (!basePath.endsWith("/")) basePath += "/";
    },
    async buildStart() {
      // Only fetch on the actual production build pass. Dev uses the
      // middleware path with its own TTL cache.
      if (archiveFetched) return;
      try {
        archive = await fetchPuzzleArchive({ logger: this });
      } catch (err) {
        this.warn?.(`[seo] puzzle archive fetch failed: ${err?.message || err}`);
        archive = [];
      }
      archiveFetched = true;
      const n = archive.length;
      this.info?.(
        n === 0
          ? "[seo] no past puzzles found — /puzzle/* pages will not be emitted"
          : `[seo] emitting ${n} past-puzzle archive page${n === 1 ? "" : "s"}`,
      );
    },
    transformIndexHtml: {
      order: "pre",
      handler: replacePlaceholders,
    },
    configureServer(server) {
      const text = (res, type, body, cache = "public, max-age=3600") => {
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", cache);
        res.end(body);
      };
      server.middlewares.use("/robots.txt", (_req, res) => text(res, "text/plain; charset=utf-8", robotsTxt()));
      server.middlewares.use("/sitemap.xml", async (_req, res) => {
        const a = await getArchiveForDev();
        text(res, "application/xml; charset=utf-8", sitemapXml(a));
      });

      // Render the archive index + each past puzzle on demand so we can
      // QA the exact HTML Google will see without running a full build.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = req.url.split("?")[0];
        if (url === "/puzzle" || url === "/puzzle/") {
          const a = await getArchiveForDev();
          return text(
            res,
            "text/html; charset=utf-8",
            renderPuzzleIndexPage({ puzzles: a, siteUrl: SITE_URL, base: basePath, ogImage: OG_IMAGE }),
            "no-store",
          );
        }
        const m = url.match(/^\/puzzle\/(\d+)\/?$/);
        if (m) {
          const puzzleNo = parseInt(m[1], 10);
          const a = await getArchiveForDev();
          const puzzle = a.find((p) => p.puzzleNo === puzzleNo);
          if (!puzzle) return next();
          const { prev, next: nx } = findNeighbours(puzzleNo, a);
          return text(
            res,
            "text/html; charset=utf-8",
            renderPuzzlePage({ puzzle, prev, next: nx, siteUrl: SITE_URL, base: basePath, ogImage: OG_IMAGE }),
            "no-store",
          );
        }
        return next();
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt() });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
      if (archive.length > 0) {
        this.emitFile({
          type: "asset",
          fileName: "puzzle/index.html",
          source: renderPuzzleIndexPage({ puzzles: archive, siteUrl: SITE_URL, base: basePath, ogImage: OG_IMAGE }),
        });
        for (const puzzle of archive) {
          const { prev, next } = findNeighbours(puzzle.puzzleNo, archive);
          this.emitFile({
            type: "asset",
            fileName: `puzzle/${puzzle.puzzleNo}/index.html`,
            source: renderPuzzlePage({ puzzle, prev, next, siteUrl: SITE_URL, base: basePath, ogImage: OG_IMAGE }),
          });
        }
      }
    },
  };
}

// Emits /health.json into the built bundle and also serves it during
// `vite dev`, so the Aphylia host / external monitoring can probe a
// deployed instance and verify the build identity (sha, timestamp,
// version).
function healthEndpointPlugin() {
  const payload = () =>
    JSON.stringify(
      {
        status: "ok",
        app: "aphydle",
        version: APP_VERSION,
        sha: BUILD_SHA,
        builtAt: BUILD_TIMESTAMP,
      },
      null,
      2,
    ) + "\n";

  return {
    name: "aphydle-health-endpoint",
    apply: () => true,
    configureServer(server) {
      server.middlewares.use("/health.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(payload());
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "health.json",
        source: payload(),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.<mode>, .env.<mode>.local from
  // the project root. Empty-prefix means "load every var", not just VITE_*,
  // so seo/puzzle-fetch.mjs can read VITE_SUPABASE_URL via process.env at
  // buildStart() time the same way client code reads it via import.meta.env.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  // Refresh module-level bindings now that .env files are merged in. The
  // plugin closures capture these by reference, so reassigning here
  // propagates the resolved values to robots.txt / sitemap.xml / index.html
  // placeholders without restructuring the plugin.
  BUILD_SHA = shortGitSha();
  BUILD_TIMESTAMP = process.env.VITE_APP_BUILD_TIMESTAMP || BUILD_TIMESTAMP;
  SITE_URL = (process.env.VITE_APP_SITE_URL || "https://aphydle.aphylia.com")
    .trim()
    .replace(/\/+$/, "");
  OG_IMAGE = (process.env.VITE_APP_OG_IMAGE || `${SITE_URL}/og-image.png`).trim();
  DEV_HOST = process.env.APHYDLE_DEV_HOST || DEV_HOST;

  return {
    plugins: [react(), seoArtifactsPlugin(), healthEndpointPlugin()],
    base: process.env.VITE_APP_BASE_PATH || "/",
    define: {
      "import.meta.env.VITE_APP_BUILD_TIMESTAMP": JSON.stringify(BUILD_TIMESTAMP),
      "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(BUILD_SHA),
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(APP_VERSION),
      "import.meta.env.VITE_APP_SITE_URL": JSON.stringify(SITE_URL),
      "import.meta.env.VITE_APP_OG_IMAGE": JSON.stringify(OG_IMAGE),
    },
    server: {
      port: 5173,
      host: DEV_HOST,
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
