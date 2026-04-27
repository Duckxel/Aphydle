// Aphydle game engine: hint scheduling, mosaic level math, daily rotation.

// Day 1 = puzzle #1. Anchored to UTC so every player worldwide gets the
// same plant on the same calendar day. Bumping this re-aligns the rotation.
export const PUZZLE_EPOCH_UTC = "2026-04-27";

const MS_PER_DAY = 86_400_000;

function utcDayIndex(date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MS_PER_DAY,
  );
}

// Days since the epoch, +1 so the first day is puzzle #1 (not #0).
// `epochUtc` is overridable so the local fallback can anchor numbering to
// a per-install date — that way a brand-new install sees "No. 1" on day one
// instead of a synthetic large number derived from a hardcoded epoch.
export function getPuzzleNumber(date = new Date(), epochUtc = PUZZLE_EPOCH_UTC) {
  const today = utcDayIndex(date);
  const epoch = utcDayIndex(new Date(`${epochUtc}T00:00:00Z`));
  return today - epoch + 1;
}

// Pick the answer for a given puzzle number from a rotation pool.
export function getDailyAnswer(puzzleNo, pool) {
  if (!pool || pool.length === 0) return null;
  // (puzzleNo - 1) so puzzle #1 → pool[0]. Modulo loops the rotation forever.
  const idx = ((puzzleNo - 1) % pool.length + pool.length) % pool.length;
  return pool[idx];
}

// "WED 26 APR" — matches the typographic header in the design.
export function formatPuzzleDate(date = new Date()) {
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getUTCDay()];
  const month = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ][date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${dow} ${day} ${month}`;
}

// Milliseconds until the next UTC midnight — used to schedule auto-rollover.
export function msUntilNextUtcMidnight(date = new Date()) {
  const next = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  return Math.max(0, next - date.getTime());
}


export const HINT_SCHEDULE = [
  { atAttempt: 1, key: "habitat", label: "Habitat" },
  { atAttempt: 2, key: "growth", label: "Growth form" },
  { atAttempt: 3, key: "colors", label: "Foliage" },
  { atAttempt: 4, key: "care", label: "Care + light" },
  { atAttempt: 5, key: "region", label: "Native to" },
  { atAttempt: 6, key: "family", label: "Family" },
  { atAttempt: 7, key: "toxicity", label: "Toxicity" },
  { atAttempt: 8, key: "name-shape", label: "Name shape" },
  { atAttempt: 9, key: "genus", label: "Genus" },
];

function asText(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return v ?? "";
}

export function buildHint(key, plant) {
  switch (key) {
    case "habitat":
      return asText(plant.habitat);
    case "growth":
      return asText(plant.growthForm);
    case "colors":
      return plant.dominantColors.join(", ");
    case "care":
      return `${"●".repeat(plant.careLevel)}${"○".repeat(5 - plant.careLevel)}  ·  ${asText(plant.lightNeeds)}`;
    case "region":
      return asText(plant.nativeRegion);
    case "family":
      return plant.family;
    case "toxicity":
      return plant.toxicity;
    case "name-shape": {
      const n = plant.commonName.split(" ")[0];
      return `${n[0]} ${"·".repeat(n.length - 1)}  ·  ${plant.commonName.length} characters`;
    }
    case "genus":
      return plant.scientificName.split(" ")[0];
    default:
      return "";
  }
}

export function getHints(attempts, plant) {
  return HINT_SCHEDULE.map((h) => ({
    ...h,
    revealed: attempts >= h.atAttempt,
    value: attempts >= h.atAttempt ? buildHint(h.key, plant) : null,
  }));
}

// Mosaic level: 0 (clear) → 9 (most pixelated). Returns tile count across the image.
export function tileCountForLevel(level) {
  if (level <= 0) return 0;
  const ladder = [0, 64, 48, 36, 28, 22, 16, 12, 8, 4];
  return ladder[Math.min(level, ladder.length - 1)];
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "guess": {
      if (state.outcome) return state;
      if (state.guesses.some((g) => g.id === action.plant.id)) return state;
      const isCorrect = action.plant.id === action.answerId;
      const guesses = [...state.guesses, action.plant];
      let outcome = null;
      if (isCorrect) outcome = "won";
      else if (guesses.length >= 10) outcome = "lost";
      return { ...state, guesses, outcome };
    }
    case "hydrate":
      return {
        guesses: action.state?.guesses || [],
        outcome: action.state?.outcome || null,
        syncedFor: action.puzzleNo,
      };
    case "reset":
      return { guesses: [], outcome: null, syncedFor: state.syncedFor };
    default:
      return state;
  }
}

// `syncedFor` tracks which puzzle the in-memory state belongs to. The
// persistence effect skips saving when it doesn't match the current puzzle —
// that guards against the brief render where puzzleNo has flipped at midnight
// but state still holds yesterday's progress.
export const initialGameState = { guesses: [], outcome: null, syncedFor: null };
