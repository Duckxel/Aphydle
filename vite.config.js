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

// In dev we bind to 127.0.0.1 by default for safety — `vite dev` is not
// hardened for the open internet. Set APHYDLE_DEV_HOST=0.0.0.0 (or use
// `npm run dev -- --host`) when you really need LAN access. In the
// embedded production layout the systemd unit binds to localhost only
// and nginx fronts the public subdomain.
const DEV_HOST = process.env.APHYDLE_DEV_HOST || "127.0.0.1";

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
  plugins: [react(), healthEndpointPlugin()],
  base: process.env.VITE_APP_BASE_PATH || "/",
  define: {
    "import.meta.env.VITE_APP_BUILD_TIMESTAMP": JSON.stringify(BUILD_TIMESTAMP),
    "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(BUILD_SHA),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(APP_VERSION),
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
