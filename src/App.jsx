import { useEffect, useMemo, useReducer, useState } from "react";
import { GameScreen } from "./components/GameScreen.jsx";
import { FinishScreen } from "./components/FinishScreen.jsx";
import {
  gameReducer,
  initialGameState,
  formatPuzzleDate,
  msUntilNextUtcMidnight,
} from "./engine/game.js";
import { loadDailyPuzzle, submitResult } from "./lib/data.js";
import { preloadImage } from "./lib/imageCache.js";
import { loadGameState, saveGameState, recordResult } from "./lib/storage.js";

export default function App() {
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

  // Today's puzzle is loaded from Supabase (with a local fallback inside
  // the data layer). Until it resolves we render nothing — the whole app
  // is gated on having an answer.
  const [puzzle, setPuzzle] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadDailyPuzzle(now).then((p) => {
      if (!cancelled) setPuzzle(p);
    });
    return () => {
      cancelled = true;
    };
  }, [now]);

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
  // idempotent per puzzleNo. The Supabase submission is best-effort —
  // it's a no-op when the player isn't authenticated.
  useEffect(() => {
    if (puzzleNo == null || !answer) return;
    if (!state.outcome) return;
    recordResult(puzzleNo, state.outcome, state.guesses.length, answer);
    submitResult(puzzleNo, state.outcome, state.guesses.length);
  }, [puzzleNo, answer, state.outcome, state.guesses.length]);

  if (!answer || puzzleNo == null) return null;

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
        onPlayAgain={() => dispatch({ type: "reset" })}
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
      onChangeTheme={setTheme}
    />
  );
}
