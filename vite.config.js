import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
const BUILD_SHA = shortGitSha();
const BUILD_TIMESTAMP = process.env.VITE_APP_BUILD_TIMESTAMP || new Date().toISOString();
const APP_VERSION = pkg.version || "0.0.0";

// Canonical site URL used by SEO artefacts (canonical link, OG/Twitter URLs,
// JSON-LD, robots.txt, sitemap.xml). Override via env when deploying to a
// different host. Trailing slash is stripped so we can compose paths cleanly.
const SITE_URL = (process.env.VITE_APP_SITE_URL || "https://aphydle.aphylia.com")
  .trim()
  .replace(/\/+$/, "");
const OG_IMAGE = (process.env.VITE_APP_OG_IMAGE || `${SITE_URL}/og-image.png`).trim();

// In dev we bind to 127.0.0.1 by default for safety — `vite dev` is not
// hardened for the open internet. Set APHYDLE_DEV_HOST=0.0.0.0 (or use
// `npm run dev -- --host`) when you really need LAN access. In the
// embedded production layout the systemd unit binds to localhost only
// and nginx fronts the public subdomain.
const DEV_HOST = process.env.APHYDLE_DEV_HOST || "127.0.0.1";

// Emits robots.txt and sitemap.xml with absolute URLs derived from
// SITE_URL, and substitutes %VITE_APP_SITE_URL% / %VITE_APP_OG_IMAGE%
// placeholders in index.html so the canonical link, OG tags, and
// JSON-LD point at the configured deploy host. Vite only auto-replaces
// HTML env tokens that resolve through import.meta.env, so we do the
// substitution here to keep a sensible default when no env is set.
function seoArtifactsPlugin() {
  const robotsTxt = () =>
    [
      "# Aphydle — daily plant guessing game",
      "User-agent: *",
      "Allow: /",
      "",
      "# Block the build/health probe from being indexed.",
      "Disallow: /health.json",
      "",
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      "",
    ].join("\n");

  const sitemapXml = () => {
    const lastmod = (process.env.VITE_APP_BUILD_TIMESTAMP || new Date().toISOString()).slice(0, 10);
    const urls = [
      { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
    ];
    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
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
    transformIndexHtml: {
      order: "pre",
      handler: replacePlaceholders,
    },
    configureServer(server) {
      server.middlewares.use("/robots.txt", (_req, res) => {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.end(robotsTxt());
      });
      server.middlewares.use("/sitemap.xml", (_req, res) => {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.end(sitemapXml());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt() });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
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

export default defineConfig({
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
});
