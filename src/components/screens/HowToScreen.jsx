import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { HINT_SCHEDULE } from "../../engine/game.js";

export function HowToScreen({ theme, onClose }) {
  const T = tokens(theme);
  const rows = [
    ["1.", "One mystery plant. Every day. Same plant for everyone."],
    ["2.", "Ten guesses. The picture clears as you go."],
    ["3.", "Each wrong guess unlocks a new text hint — habitat, growth form, family…"],
    ["4.", "Win or lose, you'll learn one thing about today's plant."],
    ["5.", "A new plant arrives at midnight UTC."],
  ];
  return (
    <Sheet theme={theme} onClose={onClose} title="How to play">
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 22,
          lineHeight: 1.4,
          color: T.text,
          marginBottom: 32,
          fontStyle: "italic",
          maxWidth: 460,
        }}
      >
        "One mystery plant. Ten guesses. The picture clears as you go."
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map(([n, t]) => (
          <div key={n} style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: T.muted,
                width: 18,
                letterSpacing: "0.06em",
              }}
            >
              {n}
            </span>
            <span
              style={{
                fontFamily: "var(--sans)",
                fontSize: 16,
                color: T.text,
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: T.border, margin: "32px 0" }} />
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: T.muted,
          letterSpacing: "0.14em",
          marginBottom: 14,
        }}
      >
        HINT SCHEDULE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {HINT_SCHEDULE.map((h) => (
          <div
            key={h.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: `1px solid ${T.border}`,
              fontFamily: "var(--sans)",
              fontSize: 13,
            }}
          >
            <span style={{ color: T.text }}>{h.label}</span>
            <span style={{ fontFamily: "var(--mono)", color: T.muted, fontSize: 11 }}>
              UNLOCKS AT {h.atAttempt + 1}/10
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
