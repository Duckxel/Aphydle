// Aphydle — main app: game screen + screen routing

const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

function GameScreen({ state, dispatch, theme, hintCardStyle, onOpenStats, onOpenArchive, onOpenHowTo }) {
  const T = window.AphydleUI.tokens(theme);
  const { ANSWER_PLANT } = window.APHYDLE_DATA;
  const { MosaicLeaf, MosaicStrip, HintCard, GuessInput, PastGuesses } = window.AphydleUI;

  const attempts = state.guesses.length;
  const attemptsLeft = 10 - attempts;
  const hints = window.APHYDLE_ENGINE.getHints(attempts, ANSWER_PLANT);

  // Mosaic level: 9 at start, 0 when won, decrements per guess.
  // 10 guesses available; level = max(0, 9 - attempts) when playing,
  // or 0 (clear) on win/loss.
  const level = state.outcome ? 0 : Math.max(0, 9 - attempts);

  function onGuess(plant) {
    dispatch({ type: "guess", plant });
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "var(--sans)",
    }}>
      {/* HEADER */}
      <header style={{
        maxWidth: 1200, margin: "0 auto", padding: "20px 40px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MosaicLeaf size={22} theme={theme} />
          <div style={{
            fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "0.04em", fontWeight: 500,
          }}>Aphydle</div>
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, color: T.muted,
          letterSpacing: "0.12em", display: "flex", gap: 18,
        }}>
          <span>WED 26 APR  ·  No. 142</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <NavBtn theme={theme} label="?" onClick={onOpenHowTo} title="How to play" />
          <NavBtn theme={theme} label="◫" onClick={onOpenArchive} title="Archive" />
          <NavBtn theme={theme} label="▤" onClick={onOpenStats} title="Stats" />
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px 80px" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "560px 1fr", gap: 56,
          alignItems: "start",
        }}>
          {/* LEFT: photo + counter */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: "var(--mono)", fontSize: 10, color: T.muted,
              letterSpacing: "0.14em", marginBottom: 10, textTransform: "uppercase",
            }}>
              <span>{state.outcome ? "REVEALED" : `MOSAIC LEVEL ${level}`}</span>
              <span style={{ color: T.text, fontWeight: 600 }}>
                {String(attempts).padStart(2, "0")} / 10
              </span>
            </div>
            <PlantImage src={ANSWER_PLANT.imageUrl} level={level} theme={theme} size={560} />
            <div style={{ marginTop: 14 }}>
              <MosaicStrip theme={theme} height={6} opacity={0.4} />
            </div>
            {state.outcome && (
              <div style={{
                marginTop: 18,
                fontFamily: "var(--serif)", fontSize: 28, fontWeight: 400,
                letterSpacing: "-0.01em",
                color: state.outcome === "won" ? T.accent : T.warm,
              }}>
                {ANSWER_PLANT.commonName}
                <span style={{
                  marginLeft: 10, fontFamily: "var(--sans)", fontSize: 14,
                  fontStyle: "italic", color: T.muted,
                }}>{ANSWER_PLANT.family}</span>
              </div>
            )}
          </div>

          {/* RIGHT: hints + guesses + input */}
          <div style={{
            display: "flex", flexDirection: "column",
            minHeight: 580,
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, color: T.muted,
              letterSpacing: "0.14em", marginBottom: 14, textTransform: "uppercase",
            }}>
              Hints
            </div>
            <div style={{
              display: "flex", flexDirection: "column",
              gap: hintCardStyle === "minimal" ? 0 : 6,
              marginBottom: 28,
            }}>
              {hints.map((h) => (
                <HintCard key={h.key} hint={h} theme={theme} style={hintCardStyle} />
              ))}
            </div>

            {state.guesses.length > 0 && (
              <>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: T.muted,
                  letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase",
                }}>
                  Past guesses
                </div>
                <PastGuesses guesses={state.guesses} theme={theme} />
                <div style={{ height: 24 }} />
              </>
            )}

            <div style={{ marginTop: "auto" }}>
              <GuessInput
                theme={theme}
                onSubmit={onGuess}
                disabled={!!state.outcome}
                attemptsLeft={attemptsLeft}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ theme, label, onClick, title }) {
  const T = window.AphydleUI.tokens(theme);
  return (
    <button onClick={onClick} title={title}
      style={{
        width: 32, height: 32, background: "transparent",
        border: `1px solid ${T.border}`, color: T.muted,
        fontFamily: "var(--mono)", fontSize: 13, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.muted; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
    >{label}</button>
  );
}

// =============== App reducer ===============
function gameReducer(state, action) {
  switch (action.type) {
    case "guess": {
      if (state.outcome) return state;
      const isCorrect = action.plant.id === window.APHYDLE_DATA.ANSWER_PLANT.id;
      const guesses = [...state.guesses, action.plant];
      let outcome = null;
      if (isCorrect) outcome = "won";
      else if (guesses.length >= 10) outcome = "lost";
      return { ...state, guesses, outcome, modalOpen: !!outcome };
    }
    case "closeModal":
      return { ...state, modalOpen: false };
    case "openModal":
      return { ...state, modalOpen: !!state.outcome };
    case "reset":
      return { guesses: [], outcome: null, modalOpen: false };
    default: return state;
  }
}

window.AphydleApp = { GameScreen, gameReducer };
