// Build-time fetcher for the past-puzzle archive.
//
// Pulls every row from aphydle.daily_log dated strictly before today (UTC),
// joins each one to its plant in public.plants, and shapes the result into
// the structure the puzzle-page templates consume.
//
// Failure mode is soft: if the env vars aren't set, the network is down,
// the schema is unreachable, or the query takes too long, we return an
// empty array. The build still succeeds — there just won't be any
// /puzzle/<n>/ pages in this output (and no <url> entries in the sitemap
// for them). That matches the rest of the data layer's "never throw"
// contract and means a Supabase outage can't take down the deploy.

import { createClient } from "@supabase/supabase-js";

const FETCH_TIMEOUT_MS = 8000;
const MAX_PUZZLES = 5000;

function pickImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  for (const use of ["card", "cover", "hero", "thumbnail"]) {
    const m = images.find((i) => i?.use === use && i?.link);
    if (m) return m.link;
  }
  return images.find((i) => i?.link)?.link || null;
}

function firstTr(t) {
  if (!t) return null;
  return Array.isArray(t) ? t[0] || null : t;
}

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10);
}

function tidyArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  return [String(v).trim()].filter(Boolean);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[seo] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// Returns an array of { puzzleNo, puzzleDate, plantId, commonName,
// scientificName, family, nativeRegion, fact, imageUrl, distribution }
// sorted ascending by puzzle_no. Empty array on any failure.
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

  let log;
  try {
    const today = todayUtcIso();
    const { data, error } = await withTimeout(
      supabase
        .schema("aphydle")
        .from("daily_log")
        .select("puzzle_no, puzzle_date, plant_id")
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
    log = Array.isArray(data) ? data.filter((r) => r && r.plant_id) : [];
  } catch (err) {
    logger.warn?.("[seo] daily_log fetch failed:", err?.message || err);
    return [];
  }

  if (log.length === 0) {
    logger.info?.("[seo] daily_log empty — no puzzle archive pages will be emitted");
    return [];
  }

  // Batch-fetch every plant referenced by the log in one round-trip.
  const plantIds = [...new Set(log.map((r) => r.plant_id))];
  let plantsById = new Map();
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("plants")
        .select(`
          id,
          name,
          family,
          plant_images ( link, use ),
          plant_translations!inner ( name, variety, origin, presentation, language )
        `)
        .in("id", plantIds)
        .eq("plant_translations.language", "en"),
      FETCH_TIMEOUT_MS,
      "plants fetch",
    );
    if (error) {
      logger.warn?.("[seo] plants fetch error:", error.message || error);
    } else if (Array.isArray(data)) {
      plantsById = new Map(data.map((p) => [p.id, p]));
    }
  } catch (err) {
    logger.warn?.("[seo] plants fetch failed:", err?.message || err);
  }

  // Optional: pull aggregate stats for each puzzle. Failure here doesn't
  // block emission — we just render the page without the stat snapshot.
  let distByPuzzle = new Map();
  try {
    const { data, error } = await withTimeout(
      supabase
        .schema("aphydle")
        .from("daily_distribution")
        .select("puzzle_no, bucket_1, bucket_2, bucket_3, bucket_4, bucket_5, bucket_6, bucket_7, bucket_8, bucket_9, bucket_10, bucket_lost, total_played")
        .in("puzzle_no", log.map((r) => r.puzzle_no)),
      FETCH_TIMEOUT_MS,
      "daily_distribution fetch",
    );
    if (!error && Array.isArray(data)) {
      distByPuzzle = new Map(data.map((d) => [d.puzzle_no, d]));
    }
  } catch (err) {
    logger.info?.("[seo] daily_distribution unavailable:", err?.message || err);
  }

  return log
    .map((r) => {
      const plant = plantsById.get(r.plant_id);
      const tr = firstTr(plant?.plant_translations);
      const commonName = (tr?.name || plant?.name || "").trim();
      if (!commonName) return null;
      return {
        puzzleNo: r.puzzle_no,
        puzzleDate: r.puzzle_date,
        plantId: r.plant_id,
        commonName,
        scientificName: (plant?.name || tr?.name || "").trim(),
        variety: (tr?.variety || "").trim(),
        family: (plant?.family || "").trim(),
        nativeRegion: tidyArr(tr?.origin),
        fact: (tr?.presentation || "").trim(),
        imageUrl: pickImage(plant?.plant_images),
        distribution: distByPuzzle.get(r.puzzle_no) || null,
      };
    })
    .filter(Boolean);
}
