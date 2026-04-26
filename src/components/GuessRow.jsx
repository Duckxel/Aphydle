import { tokens } from "./ui/tokens.js";
import { COMPARE_COLUMNS } from "../data/plants.js";

export function GuessRow({ guess, answer, theme, isAnswer, isLatest }) {
  const T = tokens(theme);
  const matchAccent = "#00D26A";
  const matchAccentLight = "#007F3F";
  const accent = theme === "dark" ? matchAccent : matchAccentLight;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1.2fr) repeat(7, minmax(0, 1fr))",
        gap: 4,
        animation: isLatest ? "aphSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)" : "none",
        marginBottom: 4,
      }}
    >
      <Cell theme={theme} isPlantName isMatch={isAnswer} accent={accent}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 13,
              fontWeight: 500,
              color: isAnswer ? accent : T.text,
              textDecoration: isAnswer ? "none" : "line-through",
              textDecorationColor: isAnswer ? "transparent" : `${T.muted}80`,
              lineHeight: 1.2,
            }}
          >
            {guess.name}
          </div>
          {isAnswer && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 8,
                color: accent,
                letterSpacing: "0.14em",
                fontWeight: 600,
              }}
            >
              ✓ FOUND
            </div>
          )}
        </div>
      </Cell>
      {COMPARE_COLUMNS.map((col) => {
        const guessVal = guess[col.key];
        const answerVal = answer[col.key];
        const match = guessVal && answerVal && guessVal === answerVal;
        return (
          <Cell key={col.key} theme={theme} isMatch={match} accent={accent}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 8,
                letterSpacing: "0.1em",
                color: match ? accent : T.subtle,
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {col.label}
            </div>
            <div
              style={{
                fontFamily: "var(--sans)",
                fontSize: 11,
                color: match ? accent : T.muted,
                textDecoration: match ? "none" : "line-through",
                textDecorationColor: match ? "transparent" : `${T.muted}60`,
                fontWeight: match ? 600 : 400,
                lineHeight: 1.25,
              }}
            >
              {guessVal || "—"}
            </div>
          </Cell>
        );
      })}
    </div>
  );
}

function Cell({ children, theme, isMatch, isPlantName, accent }) {
  const T = tokens(theme);
  return (
    <div
      style={{
        padding: isPlantName ? "10px 12px" : "8px 10px",
        background: isMatch
          ? theme === "dark"
            ? "rgba(0,210,106,0.10)"
            : "rgba(0,127,63,0.08)"
          : theme === "dark"
            ? "rgba(255,255,255,0.02)"
            : "rgba(26,24,20,0.025)",
        border: isMatch ? `1px solid ${accent}` : `1px solid ${T.border}`,
        boxShadow: isMatch ? `inset 0 0 0 1px ${accent}30, 0 0 16px ${accent}30` : "none",
        transition: "all 0.3s",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

export function GuessRowHeader({ theme }) {
  const T = tokens(theme);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1.2fr) repeat(7, minmax(0, 1fr))",
        gap: 4,
        marginBottom: 6,
        paddingLeft: 12,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          color: T.muted,
          letterSpacing: "0.14em",
        }}
      >
        GUESS
      </div>
      {COMPARE_COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: T.muted,
            letterSpacing: "0.1em",
            textAlign: "left",
            paddingLeft: 10,
          }}
        >
          {col.label.toUpperCase()}
        </div>
      ))}
    </div>
  );
}
