// Data layer. Supabase-first with a hardcoded local fallback so the app
// still works in a fresh checkout without any environment configured.
//
// All exported functions are async. They never throw — on any failure
// (network, RLS, missing schema) they return the local fallback so the
// UI never breaks.
//
// Plant data lives in the shared `public.plants` table populated by
// PlantSwipe. The badge labels in src/data/plants.js#COMPARE_COLUMNS map
// to these columns:
//   FAMILY    → plants.family               (text)
//   HABITAT   → plants.habitat              (text[])
//   GROWTH    → plants.plant_habit          (text[])
//   FOLIAGE   → plants.foliage_persistence  (text[])
//   LIGHT     → plants.sunlight             (text[])
//   NATIVE TO → plant_translations.origin   (joined, language-keyed)
//   TOXICITY  → max(toxicity_human, toxicity_pets) — UI shows worst case
//   NAME      → plant_translations.name overrides plants.name
//   IMAGE     → plant_images.link (matched by `use`)

import { supabase, isSupabaseConfigured } from "./supabase.js";
import {
  DAILY_PLANTS,
  GUESSABLE,
  ANSWER_PLANT,
} from "../data/plants.js";
import { getPuzzleNumber, getDailyAnswer } from "../engine/game.js";
import { getInstallEpoch } from "./storage.js";

// Aphydle-specific tables (puzzle_results, daily_distribution) live in a
// separate `aphydle` schema. When that schema isn't exposed in the project,
// these queries fail and the relevant features (server-side stats, result
// logging) silently degrade — the core game still runs from public.plants.
function aph() {
  if (!isSupabaseConfigured) return null;
  if (typeof supabase.schema === "function") return supabase.schema("aphydle");
  return supabase;
}

// All player-facing strings on Aphydle are English today. The translations
// table is still language-keyed (cf. PlantSwipe's i18n), so we always pin
// the join to 'en'. Swap this when Aphydle starts shipping localised UI.
const PLANT_LANG = "en";

function todayDateUtc(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Order toxicity values from safest to most dangerous so the badge can
// surface the worst case across the human and pets columns. Unknown values
// rank below "none" so a populated value always wins.
const TOXICITY_RANK = {
  unknown: -1,
  none: 0,
  non_toxic: 0,
  "non-toxic": 0,
  safe: 0,
  low: 1,
  mild: 1,
  mildly_toxic: 1,
  "mildly-toxic": 1,
  moderate: 2,
  medium: 2,
  toxic: 3,
  high: 3,
  severe: 4,
  highly_toxic: 4,
  "highly-toxic": 4,
};

function tidy(s) {
  if (!s) return "";
  return String(s)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function worstToxicity(human, pets) {
  const a = TOXICITY_RANK[(human || "").toLowerCase()] ?? -2;
  const b = TOXICITY_RANK[(pets || "").toLowerCase()] ?? -2;
  const winner = a >= b ? human : pets;
  return tidy(winner) || "Unknown";
}

// habitat / plant_habit / foliage_persistence / sunlight are text[] enums.
// The match grid only renders one string per cell, so surface the first.
function arrPick(v) {
  if (Array.isArray(v)) return v.length ? tidy(v[0]) : "";
  return tidy(v);
}

// plant_images is one-to-many. PlantSwipe tags rows with a `use` (e.g. card,
// cover, thumbnail) — try the most likely card-shaped uses first, then any.
function pickImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  for (const use of ["card", "cover", "hero", "thumbnail"]) {
    const m = images.find((i) => i?.use === use && i?.link);
    if (m) return m.link;
  }
  return images.find((i) => i?.link)?.link || null;
}

function firstTranslation(t) {
  if (!t) return null;
  return Array.isArray(t) ? t[0] || null : t;
}

function rowToPlant(r) {
  if (!r) return null;
  const tr = firstTranslation(r.plant_translations);
  return {
    id: r.id,
    commonName: tr?.name || r.name || "",
    scientificName: r.name || tr?.name || "",
    family: r.family || "",
    habitat: arrPick(r.habitat),
    growthForm: arrPick(r.plant_habit),
    foliage: arrPick(r.foliage_persistence),
    careLevel: 0,
    lightNeeds: arrPick(r.sunlight),
    nativeRegion: arrPick(tr?.origin),
    toxicity: worstToxicity(r.toxicity_human, r.toxicity_pets),
    dominantColors: [],
    imageUrl: pickImage(r.plant_images),
    fact: tr?.description || tr?.summary || null,
    commonMisguess: null,
  };
}

function rowToGuessable(r) {
  const tr = firstTranslation(r.plant_translations);
  return {
    id: r.id,
    name: tr?.name || r.name || "",
    family: r.family || "",
    habitat: arrPick(r.habitat),
    growthForm: arrPick(r.plant_habit),
    foliage: arrPick(r.foliage_persistence),
    lightNeeds: arrPick(r.sunlight),
    nativeRegion: arrPick(tr?.origin),
    toxicity: worstToxicity(r.toxicity_human, r.toxicity_pets),
  };
}

// One round-trip select that pulls every column the badge grid needs.
const PLANT_SELECT_FULL = `
  id,
  name,
  family,
  habitat,
  plant_habit,
  foliage_persistence,
  sunlight,
  toxicity_human,
  toxicity_pets,
  plant_images ( link, use ),
  plant_translations!inner ( name, origin )
`;

// Fallback select for projects where one of the columns above doesn't exist
// (PostgREST 400s the entire request if a single column is missing). Keeps
// the app usable with a reduced badge set instead of black-holing the row.
const PLANT_SELECT_FALLBACK = `
  id,
  name,
  family,
  plant_translations!inner ( name )
`;

async function runWithFallback(buildQuery) {
  if (!isSupabaseConfigured) return null;
  for (const sel of [PLANT_SELECT_FULL, PLANT_SELECT_FALLBACK]) {
    try {
      const { data, error } = await buildQuery(sel);
      if (!error && data !== null && data !== undefined) return data;
    } catch {
      /* try next select */
    }
  }
  return null;
}

function localDailyPuzzle(now) {
  const epoch = getInstallEpoch() || todayDateUtc(now);
  const puzzleNo = getPuzzleNumber(now, epoch);
  const plant = getDailyAnswer(puzzleNo, DAILY_PLANTS) || ANSWER_PLANT;
  return { puzzleNo, plant, source: "local" };
}

// Fetches the stable list of plant ids the daily rotation indexes into.
// Ordered by id so every client picks the same plant for a given puzzle no.
async function fetchPlantIds() {
  try {
    const { data, error } = await supabase
      .from("plants")
      .select("id")
      .order("id", { ascending: true });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data.map((r) => r.id);
  } catch {
    return null;
  }
}

function rotationIndex(puzzleNo, len) {
  return (((puzzleNo - 1) % len) + len) % len;
}

export async function loadDailyPuzzle(now = new Date()) {
  if (!isSupabaseConfigured) return localDailyPuzzle(now);
  try {
    const ids = await fetchPlantIds();
    if (!ids) return localDailyPuzzle(now);

    const puzzleNo = getPuzzleNumber(now);
    const chosenId = ids[rotationIndex(puzzleNo, ids.length)];

    const data = await runWithFallback((sel) =>
      supabase
        .from("plants")
        .select(sel)
        .eq("id", chosenId)
        .eq("plant_translations.language", PLANT_LANG)
        .maybeSingle(),
    );
    if (!data) return localDailyPuzzle(now);

    return {
      puzzleNo,
      plant: rowToPlant(data),
      source: "supabase",
    };
  } catch {
    return localDailyPuzzle(now);
  }
}

function localSearch(q) {
  const lower = q.toLowerCase();
  return GUESSABLE.filter((p) => p.name.toLowerCase().includes(lower)).slice(0, 6);
}

export async function searchGuessable(q, { signal } = {}) {
  const trimmed = (q || "").trim();
  if (!trimmed) return [];
  if (!isSupabaseConfigured) return localSearch(trimmed);

  for (const sel of [PLANT_SELECT_FULL, PLANT_SELECT_FALLBACK]) {
    try {
      let builder = supabase
        .from("plants")
        .select(sel)
        .eq("plant_translations.language", PLANT_LANG)
        .ilike("plant_translations.name", `%${trimmed}%`)
        .limit(6);
      if (signal && typeof builder.abortSignal === "function") {
        builder = builder.abortSignal(signal);
      }
      const { data, error } = await builder;
      if (error || !Array.isArray(data)) continue;
      if (data.length === 0) return [];
      return data.map(rowToGuessable);
    } catch {
      /* try fallback select */
    }
  }
  return localSearch(trimmed);
}

export async function loadDistribution(puzzleNo) {
  if (!isSupabaseConfigured || !puzzleNo) return null;
  try {
    const { data, error } = await aph()
      .from("daily_distribution")
      .select("*")
      .eq("puzzle_no", puzzleNo)
      .maybeSingle();
    if (error || !data) return null;
    return [
      data.bucket_1 || 0,
      data.bucket_2 || 0,
      data.bucket_3 || 0,
      data.bucket_4 || 0,
      data.bucket_5 || 0,
      data.bucket_6 || 0,
      data.bucket_7 || 0,
      data.bucket_8 || 0,
      data.bucket_9 || 0,
      data.bucket_10 || 0,
      data.bucket_lost || 0,
    ];
  } catch {
    return null;
  }
}

export async function submitResult(puzzleNo, outcome, guessCount) {
  if (!isSupabaseConfigured) return false;
  try {
    const userResp = await supabase.auth.getUser();
    const user = userResp?.data?.user;
    if (!user) return false;
    const { error } = await aph().from("puzzle_results").insert({
      puzzle_no: puzzleNo,
      player_id: user.id,
      outcome,
      guess_count: guessCount,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadRecentPuzzles(limit = 12) {
  if (!isSupabaseConfigured) return null;
  try {
    const ids = await fetchPlantIds();
    if (!ids) return null;

    const today = new Date();
    const puzzleNoToday = getPuzzleNumber(today);
    const wanted = Math.min(limit, Math.max(1, puzzleNoToday));
    const picks = [];
    for (let i = 0; i < wanted; i++) {
      const pn = puzzleNoToday - i;
      if (pn < 1) break;
      picks.push({ puzzleNo: pn, plantId: ids[rotationIndex(pn, ids.length)] });
    }

    const data = await runWithFallback((sel) =>
      supabase
        .from("plants")
        .select(sel)
        .in("id", picks.map((p) => p.plantId))
        .eq("plant_translations.language", PLANT_LANG),
    );
    const byId = new Map(Array.isArray(data) ? data.map((r) => [r.id, r]) : []);

    return picks.map((p) => {
      const r = byId.get(p.plantId);
      const tr = r ? firstTranslation(r.plant_translations) : null;
      return {
        puzzleNo: p.puzzleNo,
        date: null,
        plantId: p.plantId,
        name: tr?.name || r?.name || null,
        imageUrl: r ? pickImage(r.plant_images) : null,
      };
    });
  } catch {
    return null;
  }
}
