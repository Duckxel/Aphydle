import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { COMPARE_COLUMNS } from "../../data/plants.js";

export function HowToScreen({ theme, onClose }) {
  const T = tokens(theme);

  const steps = [
    [
      "1.",
      "One mystery plant per day.",
      "Same plant for everyone, refreshing at midnight UTC.",
    ],
    [
      "2.",
      "You have ten guesses.",
      "Type a plant name and pick from the suggestions to commit a guess.",
    ],
    [
      "3.",
      "The picture clears as you go.",
      "Each wrong guess steps the mosaic down a level — the plant comes into focus over time.",
    ],
    [
      "4.",
      "Each guess is compared on seven traits.",
      "Cells that match the answer turn green. Cells that don't are struck through.",
    ],
    [
      "5.",
      "Use the comparisons to narrow it down.",
      "Family, habitat, growth form, foliage, light, native region, and toxicity — every match rules out a lot of the remaining catalog.",
    ],
    [
      "6.",
      "Win on a correct guess. Otherwise reveal at ten.",
      "Either way you'll see the plant, its scientific name, and one fact worth keeping.",
    ],
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

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {steps.map(([n, title, body]) => (
          <div key={n} style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: T.muted,
                width: 18,
                letterSpacing: "0.06em",
                flexShrink: 0,
              }}
            >
              {n}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 15,
                  color: T.text,
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  color: T.muted,
                  lineHeight: 1.5,
                  marginTop: 3,
                }}
              >
                {body}
              </div>
            </div>
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
        ATTRIBUTES COMPARED EACH GUESS
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COMPARE_COLUMNS.length}, minmax(0, 1fr))`,
          gap: 4,
          marginBottom: 18,
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: T.muted,
          letterSpacing: "0.06em",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              background: theme === "dark" ? "rgba(0,210,106,0.25)" : "rgba(0,127,63,0.18)",
              border: `1px solid ${theme === "dark" ? "#00D26A" : "#007F3F"}`,
            }}
          />
          GREEN — attribute matches the answer
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              textDecoration: "line-through",
              textDecorationColor: T.muted,
              color: T.muted,
              fontFamily: "var(--sans)",
              fontSize: 12,
              minWidth: 64,
              display: "inline-block",
            }}
          >
            no match
          </span>
          STRUCK-THROUGH — attribute does not match
        </div>
      </div>
    </Sheet>
  );
}
