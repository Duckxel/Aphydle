// Per-day game state, cumulative stats, and play history persistence.
// Stored in localStorage, namespaced by puzzle number where appropriate
// so a new day starts with a clean slate automatically.

const STATE_KEY = "aphydle:state:v1";
const STATS_KEY = "aphydle:stats:v1";
const HISTORY_KEY = "aphydle:history:v1";
const INSTALL_KEY = "aphydle:install:v1";

const HISTORY_MAX = 365;

function safeWindow() {
  return typeof window !== "undefined" && window.localStorage ? window : null;
}

export function loadGameState(puzzleNo) {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.puzzleNo !== puzzleNo) return null;
    return {
      guesses: Array.isArray(parsed.guesses) ? parsed.guesses : [],
      outcome: parsed.outcome === "won" || parsed.outcome === "lost" ? parsed.outcome : null,
    };
  } catch {
    return null;
  }
}

export function saveGameState(puzzleNo, state) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(
      STATE_KEY,
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

export function clearGameState() {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
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
