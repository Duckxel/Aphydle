// Per-day game state, cumulative stats, and play history persistence.
// Stored in localStorage, namespaced by puzzle number where appropriate
// so a new day starts with a clean slate automatically.

// State is keyed per-puzzle so an Archive replay never clobbers today's
// in-progress slot. Legacy single-key state is migrated on first read.
const STATE_KEY_PREFIX = "aphydle:state:v1:";
const LEGACY_STATE_KEY = "aphydle:state:v1";
const STATS_KEY = "aphydle:stats:v1";
const HISTORY_KEY = "aphydle:history:v1";
const INSTALL_KEY = "aphydle:install:v1";
const DAILY_LOG_KEY = "aphydle:daily_log:v1";

const HISTORY_MAX = 365;

function safeWindow() {
  return typeof window !== "undefined" && window.localStorage ? window : null;
}

function readPuzzleState(w, puzzleNo) {
  const raw = w.localStorage.getItem(`${STATE_KEY_PREFIX}${puzzleNo}`);
  if (raw) return JSON.parse(raw);
  // Legacy single-key fallback: read once and migrate so older sessions
  // don't appear unfinished.
  const legacy = w.localStorage.getItem(LEGACY_STATE_KEY);
  if (!legacy) return null;
  try {
    const parsed = JSON.parse(legacy);
    if (!parsed || parsed.puzzleNo !== puzzleNo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadGameState(puzzleNo) {
  const w = safeWindow();
  if (!w) return null;
  try {
    const parsed = readPuzzleState(w, puzzleNo);
    if (parsed) {
      return {
        guesses: Array.isArray(parsed.guesses) ? parsed.guesses : [],
        outcome:
          parsed.outcome === "won" || parsed.outcome === "lost" ? parsed.outcome : null,
      };
    }
    // Fallback: synthesize a finished state from history so a puzzle
    // already played on this device stays locked even after the per-
    // puzzle state slot has been cleared.
    const history = loadHistory();
    const past = history.find((h) => h.puzzleNo === puzzleNo);
    if (past && (past.outcome === "won" || past.outcome === "lost")) {
      const count = Math.max(0, Math.min(past.guessCount || 0, 10));
      return {
        guesses: Array.from({ length: count }, () => ({})),
        outcome: past.outcome,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveGameState(puzzleNo, state) {
  const w = safeWindow();
  if (!w || puzzleNo == null) return;
  try {
    w.localStorage.setItem(
      `${STATE_KEY_PREFIX}${puzzleNo}`,
      JSON.stringify({
        puzzleNo,
        guesses: state.guesses,
        outcome: state.outcome,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // quota exceeded or storage disabled — silently ignore
  }
}

export function clearGameState(puzzleNo) {
  const w = safeWindow();
  if (!w) return;
  try {
    if (puzzleNo == null) {
      // Wipe every per-puzzle slot + legacy key.
      const keys = [];
      for (let i = 0; i < w.localStorage.length; i++) {
        const k = w.localStorage.key(i);
        if (k && k.startsWith(STATE_KEY_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => w.localStorage.removeItem(k));
      w.localStorage.removeItem(LEGACY_STATE_KEY);
    } else {
      w.localStorage.removeItem(`${STATE_KEY_PREFIX}${puzzleNo}`);
    }
  } catch {
    // ignore
  }
}

export function isPuzzlePlayed(puzzleNo) {
  if (puzzleNo == null) return false;
  return loadHistory().some((h) => h.puzzleNo === puzzleNo);
}

// Anchors fallback puzzle numbering. The first time the app runs without
// Supabase configured we record today's UTC date — so the player sees
// "No. 1" on their first puzzle, "No. 2" the next day, and so on.
export function getInstallEpoch() {
  const w = safeWindow();
  if (!w) return null;
  try {
    let v = w.localStorage.getItem(INSTALL_KEY);
    if (!v) {
      const today = new Date();
      v = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
      w.localStorage.setItem(INSTALL_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

const DEFAULT_STATS = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPuzzleNo: null,
  // distribution[i] = number of wins in i+1 guesses; index 10 = losses.
  distribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export function loadStats() {
  const w = safeWindow();
  if (!w) return { ...DEFAULT_STATS };
  try {
    const raw = w.localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATS,
      ...parsed,
      distribution: Array.isArray(parsed.distribution)
        ? parsed.distribution.concat(DEFAULT_STATS.distribution).slice(0, 11)
        : [...DEFAULT_STATS.distribution],
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function loadHistory() {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(-HISTORY_MAX)),
    );
  } catch {
    // ignore
  }
}

export function recordResult(puzzleNo, outcome, guessCount, plant = null) {
  const w = safeWindow();
  if (!w) return loadStats();
  const stats = loadStats();
  if (stats.lastPuzzleNo === puzzleNo) return stats; // already recorded
  stats.played += 1;
  if (outcome === "won") {
    stats.won += 1;
    const bucket = Math.min(Math.max(guessCount - 1, 0), 9);
    stats.distribution[bucket] += 1;
    stats.currentStreak =
      stats.lastPuzzleNo === puzzleNo - 1 ? stats.currentStreak + 1 : 1;
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
  } else {
    stats.distribution[10] += 1;
    stats.currentStreak = 0;
  }
  stats.lastPuzzleNo = puzzleNo;
  try {
    w.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }

  const history = loadHistory();
  if (!history.some((h) => h.puzzleNo === puzzleNo)) {
    history.push({
      puzzleNo,
      outcome,
      guessCount,
      plantId: plant?.id || null,
      plantName: plant?.commonName || null,
      imageUrl: plant?.imageUrl || null,
      finishedAt: Date.now(),
    });
    saveHistory(history);
  }

  return stats;
}

// ── Daily plant log (local mirror of aphydle.daily_log) ──────────────────────
// Every resolved daily puzzle is stamped here so the client always has a
// trace of which plant was served on which day, even when Supabase isn't
// reachable. Each entry: { puzzleNo, puzzleDate (YYYY-MM-DD UTC), plantId }.
export function loadLocalDailyLog() {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(DAILY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendLocalDailyLog(entry) {
  const w = safeWindow();
  if (!w || !entry || entry.puzzleNo == null || !entry.plantId) return;
  try {
    const log = loadLocalDailyLog();
    if (log.some((e) => e.puzzleNo === entry.puzzleNo)) return;
    log.push({
      puzzleNo: entry.puzzleNo,
      puzzleDate: entry.puzzleDate || null,
      plantId: entry.plantId,
      recordedAt: Date.now(),
    });
    log.sort((a, b) => a.puzzleNo - b.puzzleNo);
    w.localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch {
    // ignore
  }
}
