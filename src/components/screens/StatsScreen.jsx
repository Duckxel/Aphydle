import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { STATS } from "../../data/plants.js";

export function StatsScreen({ theme, onClose }) {
  const T = tokens(theme);
  const maxDist = Math.max(...STATS.distribution);

  return (
    <Sheet theme={theme} onClose={onClose} title="Statistics">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
          paddingBottom: 28,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: T.muted,
              letterSpacing: "0.14em",
            }}
          >
            CURRENT STREAK
          </div>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 88,
              fontWeight: 400,
              lineHeight: 1,
              color: T.accent,
              marginTop: 8,
              letterSpacing: "-0.03em",
            }}
          >
            {STATS.currentStreak}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: T.muted,
              marginTop: 6,
              letterSpacing: "0.06em",
            }}
          >
            DAYS · MAX {STATS.maxStreak}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)", gap: 8 }}>
          <MiniStat label="PLAYED" value={STATS.played} theme={theme} />
          <MiniStat label="WIN %" value={STATS.winPct} theme={theme} />
          <MiniStat label="MEAN GUESSES" value={STATS.meanGuesses} theme={theme} />
        </div>
      </div>

      <div
        style={{
          paddingTop: 28,
          paddingBottom: 28,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: T.muted,
            letterSpacing: "0.14em",
            marginBottom: 14,
          }}
        >
          GUESS DISTRIBUTION
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {STATS.distribution.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: T.muted,
                  width: 22,
                  textAlign: "right",
                }}
              >
                {i < 10 ? i + 1 : "✗"}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 18,
                  background: T.elevated,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${(v / maxDist) * 100}%`,
                    height: "100%",
                    background: i === 3 ? T.accent : i === 10 ? T.clay : T.muted,
                    opacity: i === 3 ? 1 : 0.55,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: i === 3 ? "#0A0A0A" : T.text,
                    }}
                  >
                    {v || ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 28 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: T.muted,
            letterSpacing: "0.14em",
            marginBottom: 14,
          }}
        >
          LAST 90 DAYS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(15, 1fr)",
            gap: 4,
          }}
        >
          {STATS.heatmap.map((v, i) => {
            const colors = {
              0: T.elevated,
              1: `color-mix(in oklab, ${T.accent} 90%, ${T.bg})`,
              2: `color-mix(in oklab, ${T.accent} 70%, ${T.bg})`,
              3: `color-mix(in oklab, ${T.accent} 55%, ${T.bg})`,
              4: `color-mix(in oklab, ${T.accent} 40%, ${T.bg})`,
              5: `color-mix(in oklab, ${T.accent} 25%, ${T.bg})`,
              6: T.clay,
            };
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  background: colors[v],
                  minHeight: 18,
                }}
                title={v === 0 ? "no play" : v === 6 ? "lost" : `won in ${v}`}
              />
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

function MiniStat({ label, value, theme }) {
  const T = tokens(theme);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        borderBottom: `1px solid ${T.border}`,
        paddingBottom: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: T.muted,
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: "var(--serif)", fontSize: 26, color: T.text }}>{value}</span>
    </div>
  );
}
