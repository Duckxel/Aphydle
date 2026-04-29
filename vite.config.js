import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { fetchPuzzleArchive } from "./seo/puzzle-fetch.mjs";
import { buildPuzzleShell, buildArchiveShell } from "./seo/puzzle-pages.mjs";

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
//
// `puzzleListRef` is a thunk that returns the most recently fetched
// puzzle archive (puzzle_no + puzzle_date). It is called lazily so the
// asynchronous Supabase fetch can run alongside config resolution
// without blocking module load. Empty list → only the home URL is
// emitted, just like before.
function seoArtifactsPlugin(puzzleListRef) {
  // Resolved at configResolved() so we honour the user's `base` (sub-path
  // hosting). `/` default keeps dev middleware functional before Vite has
  // a chance to call us.
  let basePath = process.env.VITE_APP_BASE_PATH || "/";
  if (!basePath.endsWith("/")) basePath += "/";

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

  const sitemapXml = () => {
    const lastmod = (process.env.VITE_APP_BUILD_TIMESTAMP || new Date().toISOString()).slice(0, 10);
    const puzzles = (puzzleListRef && puzzleListRef()) || [];
    const urls = [
      { loc: `${SITE_URL}${basePath}`, changefreq: "daily", priority: "1.0", lastmod },
    ];
    if (puzzles.length > 0) {
      urls.push({
        loc: `${SITE_URL}/puzzle/`,
        changefreq: "daily",
        priority: "0.7",
        lastmod,
      });
      for (const p of puzzles) {
        urls.push({
          loc: `${SITE_URL}/puzzle/${p.puzzleNo}/`,
          changefreq: "yearly",
          priority: "0.5",
          lastmod: p.puzzleDate,
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

  return {
    name: "aphydle-seo-artifacts",
    apply: () => true,
    configResolved(cfg) {
      basePath = cfg.base || "/";
      if (!basePath.endsWith("/")) basePath += "/";
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
      server.middlewares.use("/sitemap.xml", (_req, res) =>
        text(res, "application/xml; charset=utf-8", sitemapXml()),
      );
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt() });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
    },
  };
}

// Emits per-puzzle SEO shells under /puzzle/<n>/index.html and a /puzzle/
// archive landing. Runs in `closeBundle` (after Vite has finished writing
// its own assets) so we can read the freshly transformed dist/index.html
// off disk — that way every shell references the same hashed asset
// bundle Vite just produced. Skipped entirely when the puzzle list is
// empty (no Supabase env in dev / fresh checkout).
function puzzlePagesPlugin(puzzleListRef) {
  let outDir = "dist";
  return {
    name: "aphydle-puzzle-pages",
    apply: "build",
    enforce: "post",
    configResolved(cfg) {
      outDir = cfg.build?.outDir || "dist";
    },
    async closeBundle() {
      const puzzles = (puzzleListRef && puzzleListRef()) || [];
      if (puzzles.length === 0) return;

      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const root = process.cwd();
      const indexPath = path.resolve(root, outDir, "index.html");

      let baseHtml;
      try {
        baseHtml = await fs.readFile(indexPath, "utf8");
      } catch (err) {
        this.warn(`[seo] could not read ${indexPath}: ${err.message} — skipping puzzle shells`);
        return;
      }

      const sorted = puzzles.slice().sort((a, b) => a.puzzleNo - b.puzzleNo);

      for (let i = 0; i < sorted.length; i++) {
        const cur = sorted[i];
        const prev = i > 0 ? sorted[i - 1] : null;
        const next = i < sorted.length - 1 ? sorted[i + 1] : null;
        const html = buildPuzzleShell({
          baseHtml,
          puzzleNo: cur.puzzleNo,
          puzzleDate: cur.puzzleDate,
          prev,
          next,
          siteUrl: SITE_URL,
          ogImage: OG_IMAGE,
        });
        const dir = path.resolve(root, outDir, "puzzle", String(cur.puzzleNo));
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
      }

      const archiveDir = path.resolve(root, outDir, "puzzle");
      await fs.mkdir(archiveDir, { recursive: true });
      await fs.writeFile(
        path.join(archiveDir, "index.html"),
        buildArchiveShell({
          baseHtml,
          puzzles: sorted,
          siteUrl: SITE_URL,
          ogImage: OG_IMAGE,
        }),
        "utf8",
      );

      console.log(`[seo] wrote ${sorted.length + 1} puzzle SEO shells to ${outDir}/puzzle/`);
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

export default defineConfig(async ({ mode, command }) => {
  // loadEnv reads .env, .env.local, .env.<mode>, .env.<mode>.local from
  // the project root. Empty-prefix means "load every var", not just VITE_*.
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

  // Pull the past-puzzle list at build time so the SEO shells and
  // sitemap can enumerate every /puzzle/<n>/. We only fetch for `vite
  // build` — dev doesn't need shells, and a slow Supabase response
  // would be an annoying hang on every `vite dev` startup.
  let puzzleList = [];
  if (command === "build") {
    try {
      puzzleList = await fetchPuzzleArchive();
      if (puzzleList.length > 0) {
        console.log(`[seo] fetched ${puzzleList.length} past puzzle(s) for SEO shells`);
      }
    } catch (err) {
      console.warn("[seo] puzzle archive fetch failed:", err?.message || err);
      puzzleList = [];
    }
  }
  const puzzleListRef = () => puzzleList;

  return {
    plugins: [
      react(),
      seoArtifactsPlugin(puzzleListRef),
      puzzlePagesPlugin(puzzleListRef),
      healthEndpointPlugin(),
    ],
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
