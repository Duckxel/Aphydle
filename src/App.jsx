import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { GameScreen } from "./components/GameScreen.jsx";
import { FinishScreen } from "./components/FinishScreen.jsx";
import { ExportPage } from "./components/screens/ExportPage.jsx";
import {
  gameReducer,
  initialGameState,
  formatPuzzleDate,
  msUntilNextUtcMidnight,
} from "./engine/game.js";
import { loadDailyPuzzle, loadArchivedPuzzle, submitResult } from "./lib/data.js";
import { preloadImage } from "./lib/imageCache.js";
import {
  loadGameState,
  saveGameState,
  recordResult,
  isPuzzlePlayed,
} from "./lib/storage.js";
import { trackVisit, trackAttempt } from "./lib/analytics.js";

// `/export` (and `/export/`) is a separate admin entry point that bypasses
// the game state machine entirely — it loads any puzzle by number and renders
// the social export cards. Detected at the URL level so the Aphydle SPA
// fallback (any extensionless path → index.html) lands here without router.
function isExportPath() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "");
  return p === "/export";
}

// Standalone admin entry — owns its own theme state so the host App's
// hooks never run on the export path. Switching paths requires a full
// reload (no client-side router), so the choice between roots is stable
// for a given mount and rules of hooks aren't a concern.
function ExportApp() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("aphydle:theme") || "dark";
  });
  useEffect(() => {
    localStorage.setItem("aphydle:theme", theme);
  }, [theme]);
  // setTheme is intentionally unused — the export page has no theme picker.
  void setTheme;
  return <ExportPage theme={theme} />;
}

export default function App() {
  if (isExportPath()) return <ExportApp />;

  // Theme — persisted independently of game state.
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("aphydle:theme") || "dark";
  });
  useEffect(() => {
    localStorage.setItem("aphydle:theme", theme);
  }, [theme]);

  // `now` ticks forward when UTC midnight rolls over so the app reaches
  // the new puzzle without a manual reload.
  const [now, setNow] = useState(() => new Date());
  const dateLabel = useMemo(() => formatPuzzleDate(now), [now]);

  // When set, replaces today's puzzle with an archived one — the Archive
  // screen calls onPlayPuzzle() to start a replay session for any puzzle
  // the player hasn't completed yet.
  const [archivePuzzleNo, setArchivePuzzleNo] = useState(null);

  // The active puzzle (today's by default, or an archive replay). Until
  // it resolves we render nothing — the whole app is gated on an answer.
  const [puzzle, setPuzzle] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setPuzzle(null);
    const loader =
      archivePuzzleNo != null
        ? loadArchivedPuzzle(archivePuzzleNo)
        : loadDailyPuzzle(now);
    loader.then((p) => {
      if (!cancelled) setPuzzle(p);
    });
    return () => {
      cancelled = true;
    };
  }, [now, archivePuzzleNo]);

  const puzzleNo = puzzle?.puzzleNo ?? null;
  const answer = puzzle?.plant ?? null;

  // Warm the image cache the moment the URL is known so the canvas mosaic
  // and the FinishScreen <img> both paint instantly when they mount —
  // including across navigation between the two and after a page reload.
  useEffect(() => {
    if (answer?.imageUrl) preloadImage(answer.imageUrl);
  }, [answer?.imageUrl]);

  // Schedule a refresh at the next UTC midnight.
  useEffect(() => {
    const ms = msUntilNextUtcMidnight(new Date()) + 250;
    const t = setTimeout(() => setNow(new Date()), ms);
    return () => clearTimeout(t);
  }, [now]);

  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  // Hydrate game state once we know which puzzle we're on. Re-hydrates
  // whenever the puzzle number flips (midnight rollover or stale tab).
  useEffect(() => {
    if (puzzleNo == null) return;
    if (state.syncedFor === puzzleNo) return;
    dispatch({ type: "hydrate", state: loadGameState(puzzleNo), puzzleNo });
  }, [puzzleNo, state.syncedFor]);

  // Persist on every state change — but only once state has been hydrated
  // for the current puzzle, so we never write yesterday's progress under
  // today's key during the one-render rollover transient.
  useEffect(() => {
    if (puzzleNo == null) return;
    if (state.syncedFor !== puzzleNo) return;
    saveGameState(puzzleNo, state);
  }, [puzzleNo, state]);

  // Record the result once when a puzzle ends. The local stats writer is
  // idempotent per puzzleNo. The Supabase submission is best-effort.
  useEffect(() => {
    if (puzzleNo == null || !answer) return;
    if (!state.outcome) return;
    recordResult(puzzleNo, state.outcome, state.guesses.length, answer);
    submitResult(puzzleNo, state.outcome, state.guesses.length);
  }, [puzzleNo, answer, state.outcome, state.guesses.length]);

  // Anonymized analytics: log a page visit once per puzzle, and stream a
  // row per individual guess so admins can inspect play patterns.
  useEffect(() => {
    if (puzzleNo != null) trackVisit(puzzleNo);
  }, [puzzleNo]);

  const lastTrackedAttemptRef = useRef({ puzzleNo: null, count: 0 });
  useEffect(() => {
    if (puzzleNo == null || !answer) return;
    const tracker = lastTrackedAttemptRef.current;
    if (tracker.puzzleNo !== puzzleNo) {
      tracker.puzzleNo = puzzleNo;
      tracker.count = 0;
    }
    while (tracker.count < state.guesses.length) {
      const idx = tracker.count;
      const g = state.guesses[idx];
      trackAttempt({
        puzzleNo,
        attemptNo: idx + 1,
        plantId: g?.id,
        isCorrect: g?.id === answer.id,
      });
      tracker.count = idx + 1;
    }
  }, [puzzleNo, answer, state.guesses.length]);

  if (!answer || puzzleNo == null) return null;

  // The Archive owns the replay-puzzle picker. A null puzzleNo from the
  // archive means "back to today".
  function handlePlayPuzzle(no) {
    if (no == null) {
      setArchivePuzzleNo(null);
      return;
    }
    if (isPuzzlePlayed(no)) return; // local lock — never replay a finished puzzle
    setArchivePuzzleNo(no);
  }

  if (state.outcome) {
    return (
      <FinishScreen
        won={state.outcome === "won"}
        plant={answer}
        guessCount={state.guesses.length}
        theme={theme}
        layout="album"
        puzzleNo={puzzleNo}
        dateLabel={dateLabel}
        onPlayPuzzle={handlePlayPuzzle}
        isArchiveSession={archivePuzzleNo != null}
        onChangeTheme={setTheme}
      />
    );
  }

  return (
    <GameScreen
      theme={theme}
      state={state}
      dispatch={dispatch}
      answer={answer}
      puzzleNo={puzzleNo}
      dateLabel={dateLabel}
      onPlayPuzzle={handlePlayPuzzle}
      isArchiveSession={archivePuzzleNo != null}
      onChangeTheme={setTheme}
    />
  );
}
