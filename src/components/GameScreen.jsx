import { useState } from "react";
import { tokens } from "./ui/tokens.js";
import { MosaicLeaf } from "./ui/MosaicLeaf.jsx";
import { MosaicStrip } from "./ui/MosaicStrip.jsx";
import { GuessInput } from "./ui/GuessInput.jsx";
import { PlantImage } from "./PlantImage.jsx";
import { GuessRow, GuessRowHeader } from "./GuessRow.jsx";
import { AttemptsBar } from "./AttemptsBar.jsx";
import { COMPARE_COLUMNS } from "../data/plants.js";
import { StatsScreen } from "./screens/StatsScreen.jsx";
import { ArchiveScreen } from "./screens/ArchiveScreen.jsx";
import { HowToScreen } from "./screens/HowToScreen.jsx";
import { AphyliaPill } from "./AphyliaLink.jsx";

const LEVEL_LADDER = [7, 6, 5, 4, 4, 3, 2, 1, 0, 0, 0];

export function GameScreen({
  theme,
  state,
  dispatch,
  answer,
  puzzleNo,
  dateLabel,
  onChangeTheme,
}) {
  const T = tokens(theme);
  const [overlay, setOverlay] = useState(null);

  const attempts = state.guesses.length;
  const attemptsLeft = 10 - attempts;
  const level = LEVEL_LADDER[Math.min(attempts, 10)];
  const guessesNewestFirst = [...state.guesses].reverse();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "var(--sans)",
      }}
    >
      <header
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 40px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MosaicLeaf size={22} theme={theme} />
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              letterSpacing: "0.04em",
              fontWeight: 500,
            }}
          >
            Aphydle
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: T.muted,
            letterSpacing: "0.12em",
          }}
        >
          {dateLabel} · No. {puzzleNo}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <AphyliaPill theme={theme} />
          <ThemeToggle theme={theme} onChange={onChangeTheme} />
          <NavBtn theme={theme} label="?" onClick={() => setOverlay("how")} title="How to play" />
          <NavBtn theme={theme} label="◫" onClick={() => setOverlay("archive")} title="Archive" />
          <NavBtn theme={theme} label="▤" onClick={() => setOverlay("stats")} title="Stats" />
        </div>
      </header>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "28px 40px 80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "440px 1fr",
            gap: 48,
            alignItems: "start",
          }}
        >
          <div style={{ position: "sticky", top: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: "0.14em",
                }}
              >
                MOSAIC LEVEL {level}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: T.muted,
                    letterSpacing: "0.12em",
                  }}
                >
                  {attemptsLeft} LEFT
                </span>
                <AttemptsBar used={attempts} total={10} theme={theme} />
              </div>
            </div>
            <PlantImage src={answer.imageUrl} level={level} theme={theme} size={440} />
            <div style={{ marginTop: 14 }}>
              <MosaicStrip theme={theme} height={6} opacity={0.4} />
            </div>
            <div style={{ marginTop: 18 }}>
              <GuessInput
                theme={theme}
                onSubmit={(p) => dispatch({ type: "guess", plant: p, answerId: answer.id })}
                disabled={false}
                attemptsLeft={attemptsLeft}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: "0.14em",
                }}
              >
                ATTRIBUTE COMPARISON
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: "0.12em",
                }}
              >
                {state.guesses.length} / 10 GUESSES
              </div>
            </div>

            {state.guesses.length === 0 ? (
              <EmptyComparison theme={theme} />
            ) : (
              <>
                <GuessRowHeader theme={theme} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {guessesNewestFirst.map((g, i) => (
                    <GuessRow
                      key={`${g.id}-${state.guesses.length - 1 - i}`}
                      guess={g}
                      answer={answer}
                      theme={theme}
                      isAnswer={g.id === answer.id}
                      isLatest={i === 0}
                    />
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: T.muted,
                    letterSpacing: "0.1em",
                    lineHeight: 1.6,
                    borderLeft: `2px solid ${T.border}`,
                  }}
                >
                  GREEN CELLS = ATTRIBUTE MATCHES THE ANSWER · STRUCK-THROUGH = NO MATCH
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {overlay === "stats" && <StatsScreen theme={theme} onClose={() => setOverlay(null)} />}
      {overlay === "archive" && <ArchiveScreen theme={theme} onClose={() => setOverlay(null)} />}
      {overlay === "how" && <HowToScreen theme={theme} onClose={() => setOverlay(null)} />}
    </div>
  );
}

function EmptyComparison({ theme }) {
  const T = tokens(theme);
  return (
    <div
      style={{
        border: `1px dashed ${T.border}`,
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 22,
          lineHeight: 1.3,
          color: T.text,
          maxWidth: 460,
        }}
      >
        Type a plant to begin.
      </div>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 14,
          lineHeight: 1.5,
          color: T.muted,
          maxWidth: 520,
        }}
      >
        Each guess reveals which attributes match the mystery plant. The image clears one step with every wrong try.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COMPARE_COLUMNS.length}, minmax(0, 1fr))`,
          gap: 4,
          marginTop: 8,
        }}
      >
        {COMPARE_COLUMNS.map((c) => (
          <div
            key={c.key}
            style={{
              padding: "10px 8px",
              background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(26,24,20,0.025)",
              border: `1px solid ${T.border}`,
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: T.subtle,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavBtn({ theme, label, onClick, title }) {
  const T = tokens(theme);
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        background: "transparent",
        border: `1px solid ${T.border}`,
        color: T.muted,
        fontFamily: "var(--mono)",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function ThemeToggle({ theme, onChange }) {
  const T = tokens(theme);
  return (
    <div
      style={{
        display: "flex",
        border: `1px solid ${T.border}`,
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
      }}
    >
      {["dark", "light"].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
            background: theme === m ? T.text : "transparent",
            color: theme === m ? T.bg : T.muted,
          }}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
