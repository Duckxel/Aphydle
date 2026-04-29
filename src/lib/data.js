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
import {
  getInstallEpoch,
  loadLocalDailyLog,
  appendLocalDailyLog,
} from "./storage.js";

// Aphydle-specific tables (puzzle_results, page_visits, daily_log) live in
// a separate `aphydle` schema. When that schema isn't exposed in the
// project, these queries fail and the relevant features (server-side
// stats, result logging) silently degrade — the core game still runs
// from public.plants.
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

// habitat / plant_habit / foliage_persistence / sunlight / origin are text[]
// enums. Return every entry tidied so the match grid can do per-element
// comparison (any-of) and only render the items that matter.
function arrAll(v) {
  if (Array.isArray(v)) {
    return v.map(tidy).filter(Boolean);
  }
  const s = tidy(v);
  return s ? [s] : [];
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
    variety: tr?.variety || "",
    scientificName: r.name || tr?.name || "",
    family: r.family || "",
    habitat: arrAll(r.habitat),
    growthForm: arrAll(r.plant_habit),
    foliage: arrAll(r.foliage_persistence),
    careLevel: 0,
    lightNeeds: arrAll(r.sunlight),
    nativeRegion: arrAll(tr?.origin),
    toxicity: worstToxicity(r.toxicity_human, r.toxicity_pets),
    dominantColors: [],
    imageUrl: pickImage(r.plant_images),
    fact: tr?.presentation || tr?.description || tr?.summary || null,
    commonMisguess: null,
  };
}

function rowToGuessable(r) {
  const tr = firstTranslation(r.plant_translations);
  return {
    id: r.id,
    name: tr?.name || r.name || "",
    variety: tr?.variety || "",
    family: r.family || "",
    habitat: arrAll(r.habitat),
    growthForm: arrAll(r.plant_habit),
    foliage: arrAll(r.foliage_persistence),
    lightNeeds: arrAll(r.sunlight),
    nativeRegion: arrAll(tr?.origin),
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
  plant_translations!inner ( name, variety, origin, presentation )
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
  appendLocalDailyLog({
    puzzleNo,
    puzzleDate: todayDateUtc(now),
    plantId: plant?.id,
  });
  return { puzzleNo, plant, source: "local" };
}

// Read today's stored pick from the server log, if any. Returns the plant
// id we previously recorded for `puzzleNo`, or null when nothing has been
// logged yet (or Supabase isn't reachable). Used so a redeploy / rotation
// change can never reshuffle an already-played day.
async function fetchStoredDailyPlantId(puzzleNo) {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await aph()
      .from("daily_log")
      .select("plant_id")
      .eq("puzzle_no", puzzleNo)
      .maybeSingle();
    if (error || !data) return null;
    return data.plant_id || null;
  } catch {
    return null;
  }
}

// Best-effort write of today's pick to the server log. The RLS policy only
// allows inserts when puzzle_date is today's UTC date, and the primary key
// on puzzle_no makes it idempotent — duplicate inserts simply fail and are
// swallowed here. Always mirrors locally so the trace survives offline.
async function recordDailyPick(puzzleNo, dateUtc, plantId) {
  appendLocalDailyLog({ puzzleNo, puzzleDate: dateUtc, plantId });
  if (!isSupabaseConfigured || !plantId) return;
  try {
    await aph()
      .from("daily_log")
      .insert({ puzzle_no: puzzleNo, puzzle_date: dateUtc, plant_id: plantId });
  } catch {
    // ignore — already logged or RLS rejected (e.g. clock skew)
  }
}

// Full append-only log of every daily pick, ordered by puzzle number.
// Prefers the Supabase log; falls back to the localStorage mirror so the
// archive view still shows something on a fresh install with no backend.
export async function loadDailyPuzzleLog(limit = 1000) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await aph()
        .from("daily_log")
        .select("puzzle_no, puzzle_date, plant_id, recorded_at")
        .order("puzzle_no", { ascending: true })
        .limit(limit);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r) => ({
          puzzleNo: r.puzzle_no,
          puzzleDate: r.puzzle_date,
          plantId: r.plant_id,
          recordedAt: r.recorded_at || null,
          source: "supabase",
        }));
      }
    } catch {
      // fall through to local mirror
    }
  }
  return loadLocalDailyLog().map((e) => ({ ...e, source: "local" }));
}

// Plain-text serialisation for the "download trace" action. One row per
// puzzle, columns aligned for human reading.
export function formatDailyLogText(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "# Aphydle daily plant log\n# (empty)\n";
  }
  const header = "# Aphydle daily plant log\n# puzzle_no\tpuzzle_date\tplant_id\n";
  const rows = entries
    .slice()
    .sort((a, b) => a.puzzleNo - b.puzzleNo)
    .map(
      (e) =>
        `${String(e.puzzleNo).padStart(4, "0")}\t${e.puzzleDate || "         "}\t${e.plantId}`,
    )
    .join("\n");
  return `${header}${rows}\n`;
}

// Fetches the stable list of plant ids the daily rotation indexes into.
// Ordered by id so every client picks the same plant for a given puzzle no.
// The `plant_images!inner(link)` hint asks PostgREST to drop any plant that
// has zero rows in plant_images — the puzzle ends with a FinishScreen image,
// so an imageless plant would render a broken card and we'd rather skip it.
async function fetchPlantIds() {
  try {
    const { data, error } = await supabase
      .from("plants")
      .select("id, plant_images!inner(link)")
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
    const dateUtc = todayDateUtc(now);

    // Prefer the previously-recorded pick so changes to the rotation pool
    // (re-orderings, additions, deletions) never reshuffle a played day.
    // Fall back to the deterministic rotation only when nothing is logged
    // yet — and stamp the result so subsequent loads stay stable.
    const storedId = await fetchStoredDailyPlantId(puzzleNo);
    const chosenId = storedId || ids[rotationIndex(puzzleNo, ids.length)];

    const data = await runWithFallback((sel) =>
      supabase
        .from("plants")
        .select(sel)
        .eq("id", chosenId)
        .eq("plant_translations.language", PLANT_LANG)
        .maybeSingle(),
    );
    if (!data) return localDailyPuzzle(now);

    if (!storedId) await recordDailyPick(puzzleNo, dateUtc, chosenId);

    return {
      puzzleNo,
      plant: rowToPlant(data),
      source: "supabase",
    };
  } catch {
    return localDailyPuzzle(now);
  }
}

// Short queries cap the dropdown so it stays scannable; once the user
// has typed enough to be specific, surface the full result set so they
// can scroll/arrow through every match.
const SEARCH_SHORT_LIMIT = 6;
const SEARCH_FULL_LIMIT = 500;
const SEARCH_LONG_THRESHOLD = 5;

function searchLimit(q) {
  return q.length > SEARCH_LONG_THRESHOLD ? SEARCH_FULL_LIMIT : SEARCH_SHORT_LIMIT;
}

// Stable sort: surface the base form (no variety) before any cultivar so
// the user typing "monstera" lands on Monstera deliciosa first instead of
// "Monstera deliciosa 'Thai Constellation'".
function prioritizeBaseForm(rows) {
  return rows
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const va = a.p.variety ? 1 : 0;
      const vb = b.p.variety ? 1 : 0;
      if (va !== vb) return va - vb;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

function localSearch(q) {
  const lower = q.toLowerCase();
  const hits = GUESSABLE.filter((p) => p.name.toLowerCase().includes(lower));
  return prioritizeBaseForm(hits).slice(0, searchLimit(q));
}

// Loads the answer plant for an arbitrary puzzle number — used by the
// Archive replay flow. Identical lookup logic to loadDailyPuzzle (prefer
// the recorded daily_log pick, fall back to the deterministic rotation),
// but never writes to daily_log since the puzzle is historical.
export async function loadArchivedPuzzle(puzzleNo) {
  if (puzzleNo == null) return null;
  if (!isSupabaseConfigured) {
    const plant = getDailyAnswer(puzzleNo, DAILY_PLANTS) || ANSWER_PLANT;
    return { puzzleNo, plant, source: "local" };
  }
  try {
    const storedId = await fetchStoredDailyPlantId(puzzleNo);
    let chosenId = storedId;
    if (!chosenId) {
      const ids = await fetchPlantIds();
      if (ids && ids.length) chosenId = ids[rotationIndex(puzzleNo, ids.length)];
    }
    if (!chosenId) {
      const plant = getDailyAnswer(puzzleNo, DAILY_PLANTS) || ANSWER_PLANT;
      return { puzzleNo, plant, source: "local" };
    }
    const data = await runWithFallback((sel) =>
      supabase
        .from("plants")
        .select(sel)
        .eq("id", chosenId)
        .eq("plant_translations.language", PLANT_LANG)
        .maybeSingle(),
    );
    if (!data) {
      const plant = getDailyAnswer(puzzleNo, DAILY_PLANTS) || ANSWER_PLANT;
      return { puzzleNo, plant, source: "local" };
    }
    return { puzzleNo, plant: rowToPlant(data), source: "supabase" };
  } catch {
    const plant = getDailyAnswer(puzzleNo, DAILY_PLANTS) || ANSWER_PLANT;
    return { puzzleNo, plant, source: "local" };
  }
}

export async function searchGuessable(q, { signal } = {}) {
  const trimmed = (q || "").trim();
  if (!trimmed) return [];
  if (!isSupabaseConfigured) return localSearch(trimmed);

  const limit = searchLimit(trimmed);
  for (const sel of [PLANT_SELECT_FULL, PLANT_SELECT_FALLBACK]) {
    try {
      let builder = supabase
        .from("plants")
        .select(sel)
        .eq("plant_translations.language", PLANT_LANG)
        .ilike("plant_translations.name", `%${trimmed}%`)
        .limit(limit);
      if (signal && typeof builder.abortSignal === "function") {
        builder = builder.abortSignal(signal);
      }
      const { data, error } = await builder;
      if (error || !Array.isArray(data)) continue;
      if (data.length === 0) return [];
      return prioritizeBaseForm(data.map(rowToGuessable));
    } catch {
      /* try fallback select */
    }
  }
  return localSearch(trimmed);
}

let loggedDistributionError = false;
export async function loadDistribution(puzzleNo) {
  if (!isSupabaseConfigured || !puzzleNo) return null;
  try {
    // Pull the raw finished rows for this puzzle and bucket them on the
    // client. There's at most one row per player per day, so the payload
    // is tiny — and reading the source table directly avoids the drift
    // that a cached server-side aggregate view would introduce.
    const { data, error } = await aph()
      .from("puzzle_results")
      .select("outcome,guess_count")
      .eq("puzzle_no", puzzleNo);
    if (error) {
      if (!loggedDistributionError) {
        loggedDistributionError = true;
        // Surface the actual PostgREST error once. Without this, a 401/403
        // on the world histogram looks identical to "no plays yet" — the
        // chart silently falls back to showing only the local player.
        // eslint-disable-next-line no-console
        console.warn(
          `[Aphydle] aphydle.puzzle_results read rejected by Supabase. ` +
            `code=${error.code || "?"} message=${error.message || "?"}`,
          error,
        );
      }
      return null;
    }
    if (!Array.isArray(data)) return null;
    const buckets = Array(11).fill(0);
    for (const row of data) {
      if (row.outcome === "won") {
        const n = Number(row.guess_count);
        if (n >= 1 && n <= 10) buckets[n - 1] += 1;
      } else if (row.outcome === "lost") {
        buckets[10] += 1;
      }
    }
    return buckets;
  } catch {
    return null;
  }
}

export async function submitResult(puzzleNo, outcome, guessCount) {
  if (!isSupabaseConfigured) return false;
  try {
    let playerId = null;
    try {
      const userResp = await supabase.auth.getUser();
      playerId = userResp?.data?.user?.id || null;
    } catch {
      // ignore — will fall back to anon id below
    }
    if (!playerId) {
      // No auth session: tag the result with the per-day anon id used by
      // page_visits so admins can join visit → final score.
      const { getDailyAnonId } = await import("./analytics.js");
      playerId = getDailyAnonId();
    }
    if (!playerId) return false;
    // Upsert with ignoreDuplicates so the effect re-firing on the finish
    // screen doesn't 409 against the (puzzle_no, player_id) unique key.
    // First write wins; subsequent calls are no-ops at the database level.
    const { error } = await aph().from("puzzle_results").upsert(
      {
        puzzle_no: puzzleNo,
        player_id: playerId,
        outcome,
        guess_count: guessCount,
      },
      { onConflict: "puzzle_no,player_id", ignoreDuplicates: true },
    );
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
        variety: tr?.variety || "",
        imageUrl: r ? pickImage(r.plant_images) : null,
      };
    });
  } catch {
    return null;
  }
}
