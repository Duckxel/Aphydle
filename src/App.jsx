import { useEffect, useMemo, useReducer, useState } from "react";
import { GameScreen } from "./components/GameScreen.jsx";
import { FinishScreen } from "./components/FinishScreen.jsx";
import {
  gameReducer,
  initialGameState,
  getPuzzleNumber,
  getDailyAnswer,
  formatPuzzleDate,
  msUntilNextUtcMidnight,
} from "./engine/game.js";
import { DAILY_PLANTS } from "./data/plants.js";
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

  // Today's puzzle. `now` ticks forward when UTC midnight rolls over so the
  // app reaches the new puzzle without a manual reload.
  const [now, setNow] = useState(() => new Date());
  const puzzleNo = useMemo(() => getPuzzleNumber(now), [now]);
  const dateLabel = useMemo(() => formatPuzzleDate(now), [now]);
  const answer = useMemo(() => getDailyAnswer(puzzleNo, DAILY_PLANTS), [puzzleNo]);

  // Schedule a refresh at the next UTC midnight.
  useEffect(() => {
    const ms = msUntilNextUtcMidnight(new Date()) + 250;
    const t = setTimeout(() => setNow(new Date()), ms);
    return () => clearTimeout(t);
  }, [now]);

  // Game state, hydrated from localStorage on first mount and re-hydrated
  // whenever the puzzle number flips (midnight rollover or a stale tab).
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const n = getPuzzleNumber(new Date());
    return {
      ...initialGameState,
      ...(loadGameState(n) || {}),
      syncedFor: n,
    };
  });

  useEffect(() => {
    if (state.syncedFor === puzzleNo) return;
    dispatch({ type: "hydrate", state: loadGameState(puzzleNo), puzzleNo });
  }, [puzzleNo, state.syncedFor]);

  // Persist on every state change — but only once state has been hydrated
  // for the current puzzle, so we never write yesterday's progress under
  // today's key during the one-render rollover transient.
  useEffect(() => {
    if (state.syncedFor !== puzzleNo) return;
    saveGameState(puzzleNo, state);
  }, [puzzleNo, state]);

  // Record the result once when a puzzle ends. Stats are de-duped by puzzleNo
  // inside `recordResult` so this is safe across re-renders / strict mode.
  useEffect(() => {
    if (state.outcome) {
      recordResult(puzzleNo, state.outcome, state.guesses.length);
    }
  }, [puzzleNo, state.outcome, state.guesses.length]);

  if (!answer) return null;

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
