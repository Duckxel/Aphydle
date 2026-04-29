// Production front-server for Aphydle.
//
// Replaces `vite preview` so we can return crawler-tailored SEO HTML for
// /puzzle/ and /puzzle/<n>/ without writing per-puzzle HTML files at build
// time. Humans get the SPA shell (dist/index.html) and React routes the
// puzzle client-side; bots get a fully-rendered shell with the right
// <title>, meta tags, OG/Twitter, JSON-LD, canonical, and prev/next links.

import express from "express";
import compression from "compression";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildPuzzleShell, buildArchiveShell } from "./seo/puzzle-pages.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "dist");
const INDEX_HTML_PATH = join(DIST_DIR, "index.html");

const PORT = Number(process.env.APHYDLE_PORT || 4173);
const HOST = process.env.APHYDLE_HOST || "127.0.0.1";

const SITE_URL = (process.env.VITE_APP_SITE_URL || "https://aphydle.aphylia.com")
  .trim()
  .replace(/\/+$/, "");
const OG_IMAGE = (process.env.VITE_APP_OG_IMAGE || `${SITE_URL}/og-image.png`).trim();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

const ARCHIVE_TTL_MS = 5 * 60 * 1000;
const SUPABASE_TIMEOUT_MS = 8000;

// Mirrors PlantSwipe's allowlist (plant-swipe/server.js:32054). The terms are
// substrings, not whole tokens — `bot` catches Googlebot/Bingbot/etc., `http`
// catches go-http-client, etc. Rare false positives (real users on exotic UAs)
// just get a slightly different first paint; the SPA hydrates over it anyway.
const CRAWLER_UA_NEEDLES = [
  "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "applebot", "seznambot",
  "discordbot", "facebookexternalhit", "facebot", "twitterbot", "linkedinbot",
  "slackbot", "slack-imgproxy", "whatsapp", "telegrambot", "vkshare",
  "pinterestbot", "redditbot", "skypeuripreview", "embedly", "quora link preview",
  "outbrain", "w3c_validator", "viber", "line-poker", "kakaotalk-scrap",
  "opengraph", "iframely", "unfurl", "preview", "crawler", "spider", "bot",
  "fetch", "http", "link", "card", "meta", "og", "scraper",
  "headless", "phantom", "puppeteer", "playwright", "selenium", "chrome-lighthouse",
  "ia_archiver", "archive.org_bot",
  "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "rogerbot", "screaming frog",
  "petalbot", "bytespider", "ccbot",
  "wget", "curl", "python-requests", "python-urllib", "python/", "go-http-client",
  "axios", "node-fetch", "undici", "httpie", "insomnia", "postman",
  "java/", "okhttp", "apache-httpclient", "guzzle", "restsharp",
];

function isCrawler(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return CRAWLER_UA_NEEDLES.some((n) => lower.includes(n));
}

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-ref")) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.warn("[aphydle] supabase init failed:", err?.message || err);
  }
} else {
  console.warn("[aphydle] VITE_SUPABASE_URL/KEY not set — crawler SSR will return 503 for /puzzle/* routes");
}

if (!existsSync(INDEX_HTML_PATH)) {
  console.error(`[aphydle] dist/index.html not found at ${INDEX_HTML_PATH} — run \`npm run build\` first`);
  process.exit(1);
}

const baseHtml = await readFile(INDEX_HTML_PATH, "utf8");

let archiveCache = { at: 0, data: [] };

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[aphydle] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchArchive() {
  if (!supabase) return [];
  const now = Date.now();
  if (now - archiveCache.at < ARCHIVE_TTL_MS && archiveCache.data.length > 0) {
    return archiveCache.data;
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .schema("aphydle")
        .from("daily_log")
        .select("puzzle_no, puzzle_date")
        .lt("puzzle_date", todayUtcIso())
        .order("puzzle_no", { ascending: true })
        .limit(5000),
      SUPABASE_TIMEOUT_MS,
      "daily_log fetch",
    );
    if (error) throw error;
    const rows = (data || [])
      .filter((r) => r && Number.isFinite(r.puzzle_no) && r.puzzle_date)
      .map((r) => ({ puzzleNo: r.puzzle_no, puzzleDate: r.puzzle_date }));
    archiveCache = { at: now, data: rows };
    return rows;
  } catch (err) {
    console.warn("[aphydle] archive fetch failed:", err?.message || err);
    if (archiveCache.data.length > 0) return archiveCache.data;
    throw err;
  }
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(compression());

// Long-cache hashed assets, then fall through to the catch-all for anything
// that isn't a real file (so SPA paths don't get a static 404 here).
app.use(
  express.static(DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${join(DIST_DIR, "assets")}/`) || filePath.includes(`\\assets\\`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith("health.json")) {
        res.setHeader("Cache-Control", "no-store");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  }),
);

function sendSpaShell(res, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.send(baseHtml);
}

function sendCrawlerHtml(res, html, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (status === 503) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Retry-After", "600");
  } else if (status === 404) {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.setHeader("X-Robots-Tag", "noindex, follow");
  } else {
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.setHeader("X-Robots-Tag", "index, follow");
  }
  res.send(html);
}

async function renderPuzzlePage(puzzleNo) {
  const archive = await fetchArchive();
  const sorted = archive.slice().sort((a, b) => a.puzzleNo - b.puzzleNo);
  const idx = sorted.findIndex((p) => p.puzzleNo === puzzleNo);
  if (idx === -1) return { status: 404, html: null };
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const html = buildPuzzleShell({
    baseHtml,
    puzzleNo: cur.puzzleNo,
    puzzleDate: cur.puzzleDate,
    prev,
    next,
    siteUrl: SITE_URL,
    ogImage: OG_IMAGE,
  });
  return { status: 200, html };
}

async function renderArchivePage() {
  const archive = await fetchArchive();
  const sorted = archive.slice().sort((a, b) => a.puzzleNo - b.puzzleNo);
  const html = buildArchiveShell({
    baseHtml,
    puzzles: sorted,
    siteUrl: SITE_URL,
    ogImage: OG_IMAGE,
  });
  return { status: 200, html };
}

app.get(/^\/puzzle\/(\d+)\/?$/, async (req, res) => {
  const puzzleNo = parseInt(req.params[0], 10);
  if (!isCrawler(req.get("user-agent"))) return sendSpaShell(res);
  try {
    const { status, html } = await renderPuzzlePage(puzzleNo);
    if (status === 404) return sendCrawlerHtml(res, baseHtml, 404);
    return sendCrawlerHtml(res, html, 200);
  } catch (err) {
    console.error(`[aphydle] /puzzle/${puzzleNo}/ render failed:`, err?.message || err);
    return sendCrawlerHtml(res, baseHtml, 503);
  }
});

app.get(/^\/puzzle\/?$/, async (req, res) => {
  if (!isCrawler(req.get("user-agent"))) return sendSpaShell(res);
  try {
    const { status, html } = await renderArchivePage();
    return sendCrawlerHtml(res, html, status);
  } catch (err) {
    console.error("[aphydle] /puzzle/ render failed:", err?.message || err);
    return sendCrawlerHtml(res, baseHtml, 503);
  }
});

// Catch-all SPA fallback. The home page's index.html already carries the
// site-level SEO (title, OG, JSON-LD with placeholders resolved by Vite's
// build step), so we serve the same shell to bots and humans here.
app.get(/.*/, (req, res) => {
  const ext = extname(req.path);
  if (ext) return res.status(404).send("Not found");
  return sendSpaShell(res);
});

app.listen(PORT, HOST, () => {
  console.log(`[aphydle] server listening on http://${HOST}:${PORT}`);
  console.log(`[aphydle] site URL: ${SITE_URL}`);
  console.log(`[aphydle] supabase: ${supabase ? "configured" : "DISABLED (no env)"}`);
});
