// Build-time fetcher for the past-puzzle archive.
//
// Pulls every row from aphydle.daily_log dated strictly before today (UTC)
// and returns just (puzzle_no, puzzle_date). We deliberately do NOT join
// to plants — the per-puzzle SEO shells must never leak the answer.
//
// Failure mode is soft: if env vars aren't set, the network is down, or the
// query times out, we return an empty array. The build still succeeds; there
// just won't be any /puzzle/<n>/ pages or sitemap entries this run.

import { createClient } from "@supabase/supabase-js";

const FETCH_TIMEOUT_MS = 8000;
const MAX_PUZZLES = 5000;

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[seo] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// Returns `[{ puzzleNo, puzzleDate }]` sorted ascending by puzzle_no.
// Empty array on any failure.
export async function fetchPuzzleArchive({ logger = console } = {}) {
  const url = process.env.VITE_SUPABASE_URL || "";
  const key = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key || url.includes("your-project-ref")) {
    logger.info?.("[seo] VITE_SUPABASE_URL/KEY not set — skipping puzzle archive fetch");
    return [];
  }

  let supabase;
  try {
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    logger.warn?.("[seo] Supabase client init failed:", err?.message || err);
    return [];
  }

  try {
    const today = todayUtcIso();
    const { data, error } = await withTimeout(
      supabase
        .schema("aphydle")
        .from("daily_log")
        .select("puzzle_no, puzzle_date")
        .lt("puzzle_date", today)
        .order("puzzle_no", { ascending: true })
        .limit(MAX_PUZZLES),
      FETCH_TIMEOUT_MS,
      "daily_log fetch",
    );
    if (error) {
      logger.warn?.("[seo] daily_log fetch error:", error.message || error);
      return [];
    }
    return (data || [])
      .filter((r) => r && Number.isFinite(r.puzzle_no) && r.puzzle_date)
      .map((r) => ({ puzzleNo: r.puzzle_no, puzzleDate: r.puzzle_date }));
  } catch (err) {
    logger.warn?.("[seo] daily_log fetch failed:", err?.message || err);
    return [];
  }
}
