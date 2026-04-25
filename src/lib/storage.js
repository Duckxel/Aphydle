// Per-day game state persistence. Stored in localStorage, namespaced by
// puzzle number so a new day starts with a clean state automatically.

const KEY = "aphydle:state:v1";
const STATS_KEY = "aphydle:stats:v1";

function safeWindow() {
  return typeof window !== "undefined" && window.localStorage ? window : null;
}

export function loadGameState(puzzleNo) {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(KEY);
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
      KEY,
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
    w.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// Cumulative stats across days (recorded at game completion).
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
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordResult(puzzleNo, outcome, guessCount) {
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
  return stats;
}
