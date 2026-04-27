import { useEffect, useMemo, useState } from "react";
import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { loadStats, loadHistory } from "../../lib/storage.js";

const HEATMAP_DAYS = 90;

function buildHeatmap(history) {
  // 90 cells, oldest → newest. Each cell either 0 (no play), 1..10 (won
  // in N), or 'L' (lost). Anchored to today's UTC date.
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const byDay = new Map();
  for (const h of history) {
    if (!h.finishedAt) continue;
    const d = new Date(h.finishedAt);
    const key = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    byDay.set(key, h);
  }
  const cells = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const dayKey = todayUtc - i * 86_400_000;
    const entry = byDay.get(dayKey);
    if (!entry) cells.push({ value: 0, label: "no play" });
    else if (entry.outcome === "won")
      cells.push({ value: entry.guessCount, label: `won in ${entry.guessCount}` });
    else cells.push({ value: "L", label: "lost" });
  }
  return cells;
}

export function StatsScreen({ theme, onClose }) {
  const T = tokens(theme);
  const [stats, setStats] = useState(() => loadStats());
  const [history, setHistory] = useState(() => loadHistory());

  useEffect(() => {
    setStats(loadStats());
    setHistory(loadHistory());
  }, []);

  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const meanGuesses = useMemo(() => {
    if (stats.won === 0) return 0;
    let total = 0;
    for (let i = 0; i < 10; i++) total += stats.distribution[i] * (i + 1);
    return Math.round((total / stats.won) * 10) / 10;
  }, [stats]);
  const heatmap = useMemo(() => buildHeatmap(history), [history]);
  const maxDist = Math.max(1, ...stats.distribution);

  if (stats.played === 0) {
    return (
      <Sheet theme={theme} onClose={onClose} title="Statistics">
        <div
          style={{
            border: `1px dashed ${T.border}`,
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              color: T.text,
              marginBottom: 10,
              lineHeight: 1.3,
            }}
          >
            No games played yet.
          </div>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: T.muted,
              maxWidth: 360,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Finish today's puzzle and your streak, win rate, and history will start filling in here.
          </div>
        </div>
      </Sheet>
    );
  }

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
            {stats.currentStreak}
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
            DAYS · MAX {stats.maxStreak}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)", gap: 8 }}>
          <MiniStat label="PLAYED" value={stats.played} theme={theme} />
          <MiniStat label="WIN %" value={winPct} theme={theme} />
          <MiniStat label="MEAN GUESSES" value={meanGuesses || "—"} theme={theme} />
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
          {stats.distribution.map((v, i) => (
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
                    background: i === 10 ? T.clay : T.accent,
                    opacity: v === 0 ? 0 : 0.85,
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
                      color: i === 10 ? T.text : "#0A0A0A",
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
          LAST {HEATMAP_DAYS} DAYS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(15, 1fr)",
            gap: 4,
          }}
        >
          {heatmap.map((cell, i) => {
            let bg = T.elevated;
            if (cell.value === "L") bg = T.clay;
            else if (typeof cell.value === "number" && cell.value > 0) {
              const intensity = Math.min(1, 1 - (cell.value - 1) / 10);
              bg = `color-mix(in oklab, ${T.accent} ${Math.round(20 + intensity * 70)}%, ${T.bg})`;
            }
            return (
              <div
                key={i}
                style={{ aspectRatio: "1", background: bg, minHeight: 18 }}
                title={cell.label}
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
