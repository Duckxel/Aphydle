// Build provenance — the values are baked in at `vite build` time via
// the `define` block in vite.config.js. They let consumers (e.g. the
// Aphylia admin panel, an "about" overlay, sentry tags) tell which
// build of Aphydle is actually running.
//
// Outside a git checkout `sha` falls back to the string "unknown".

export const VERSION = import.meta.env.VITE_APP_VERSION || "0.0.0";
export const BUILD_SHA = import.meta.env.VITE_APP_BUILD_SHA || "unknown";
export const BUILD_TIMESTAMP = import.meta.env.VITE_APP_BUILD_TIMESTAMP || "";

// Pretty single-line label, e.g. "v0.1.0 (sha abc1234, built 2026-04-27T08:30Z)".
export function versionLabel() {
  const shortTs = BUILD_TIMESTAMP
    ? BUILD_TIMESTAMP.replace(/:\d{2}\.\d{3}Z$/, "Z")
    : "";
  const parts = [`v${VERSION}`];
  if (BUILD_SHA && BUILD_SHA !== "unknown") parts.push(`sha ${BUILD_SHA}`);
  if (shortTs) parts.push(`built ${shortTs}`);
  return `${parts[0]} (${parts.slice(1).join(", ")})`;
}
