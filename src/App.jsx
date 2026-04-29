import { useEffect, useMemo, useReducer, useState } from "react";
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
import { trackVisit } from "./lib/analytics.js";

// `/export` (and `/export/`) is a separate admin entry point that bypasses
// the game state machine entirely — it loads any puzzle by number and renders
// the social export cards. Detected at the URL level so the Aphydle SPA
// fallback (any extensionless path → index.html) lands here without router.
function isExportPath() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "");
  return p === "/export";
}

// Maps the entry URL to an initial in-app intent. `/puzzle` opens the Archive
// sheet over today's game, and `/puzzle/<n>` starts (or, if already finished,
// just shows the archive entry for) puzzle n. The URL is rewritten to `/` on
// mount so a reload doesn't keep re-triggering the same intent.
function readInitialRoute() {
  if (typeof window === "undefined") return { type: "home" };
  const p = window.location.pathname.replace(/\/+$/, "");
  if (p === "/puzzle") return { type: "archive" };
  const m = p.match(/^\/puzzle\/(\d+)$/);
  if (m) return { type: "puzzle", puzzleNo: parseInt(m[1], 10) };
  return { type: "home" };
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

  // Resolved once on mount — `/puzzle` and `/puzzle/<n>` are entry-point
  // URLs, not routes the SPA navigates between.
  const initialRoute = useMemo(readInitialRoute, []);

  // When set, replaces today's puzzle with an archived one — the Archive
  // screen calls onPlayPuzzle() to start a replay session for any puzzle
  // the player hasn't completed yet. Seeded from `/puzzle/<n>` when the
  // requested puzzle is unplayed; otherwise we fall back to opening the
  // Archive sheet so the player can see (but not replay) it.
  const [archivePuzzleNo, setArchivePuzzleNo] = useState(() => {
    if (initialRoute.type === "puzzle" && !isPuzzlePlayed(initialRoute.puzzleNo)) {
      return initialRoute.puzzleNo;
    }
    return null;
  });

  // One-shot signal that opens the Archive overlay on first render of the
  // GameScreen / FinishScreen. Used for `/puzzle` and for `/puzzle/<n>` when
  // n is already finished (replay is locked, so we surface the archive list).
  const initialOverlay =
    initialRoute.type === "archive" ||
    (initialRoute.type === "puzzle" && isPuzzlePlayed(initialRoute.puzzleNo))
      ? "archive"
      : null;

  // Strip the entry path so refreshing the page doesn't keep re-firing the
  // same intent (would re-open the archive every reload, or restart a replay
  // the user already exited).
  useEffect(() => {
    if (initialRoute.type !== "home" && typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
  }, [initialRoute]);

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

  // Anonymized analytics: log a page visit once per puzzle. Per-guess
  // tracking has been retired — the world histogram now sources from
  // aphydle.puzzle_results, which submitResult() writes once at game end.
  useEffect(() => {
    if (puzzleNo != null) trackVisit(puzzleNo);
  }, [puzzleNo]);

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
        initialOverlay={initialOverlay}
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
      initialOverlay={initialOverlay}
    />
  );
}
