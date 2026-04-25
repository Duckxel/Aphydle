import { useEffect, useReducer, useState } from "react";
import { GameScreen } from "./components/GameScreen.jsx";
import { FinishScreen } from "./components/FinishScreen.jsx";
import { gameReducer, initialGameState } from "./engine/game.js";
import { ANSWER_PLANT } from "./data/plants.js";

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("aphydle:theme") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("aphydle:theme", theme);
  }, [theme]);

  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const isFinished = !!state.outcome;

  if (isFinished) {
    return (
      <FinishScreen
        won={state.outcome === "won"}
        plant={ANSWER_PLANT}
        guessCount={state.guesses.length}
        theme={theme}
        layout="album"
        onPlayAgain={() => dispatch({ type: "reset" })}
      />
    );
  }

  return (
    <GameScreen
      theme={theme}
      state={state}
      dispatch={dispatch}
      answer={ANSWER_PLANT}
      onChangeTheme={setTheme}
    />
  );
}
