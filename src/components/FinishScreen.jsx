import { useEffect, useState } from "react";
import { tokens } from "./ui/tokens.js";
import { MosaicLeaf } from "./ui/MosaicLeaf.jsx";
import { MosaicStrip } from "./ui/MosaicStrip.jsx";
import { msUntilNextUtcMidnight } from "../engine/game.js";
import { loadDistribution } from "../lib/data.js";
import {
  AphyliaPill,
  AphyliaBackLink,
  APHYLIA_HOST_URL,
  PoweredByAphylia,
} from "./AphyliaLink.jsx";
import { NavBtn, ThemeToggle } from "./ui/HeaderControls.jsx";
import { StatsScreen } from "./screens/StatsScreen.jsx";
import { ArchiveScreen } from "./screens/ArchiveScreen.jsx";
import { HowToScreen } from "./screens/HowToScreen.jsx";
import { ExportScreen } from "./screens/ExportScreen.jsx";

const APHYLIA_PLANT_URL_BASE = "https://aphylia.app/plants/";

export function FinishScreen({
  won,
  plant,
  guessCount,
  theme,
  layout = "album",
  puzzleNo = 1,
  dateLabel = "",
  onPlayPuzzle,
  isArchiveSession = false,
  onChangeTheme,
}) {
  const T = tokens(theme);
  const [dist, setDist] = useState(null);
  // The export overlay is intentionally not exposed via any visible control.
  // Only people who know the secret URL (?export=open) can open it.
  const [overlay, setOverlay] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("export") === "open") return "export";
    return null;
  });
  useEffect(() => {
    let cancelled = false;
    loadDistribution(puzzleNo).then((d) => {
      if (!cancelled) setDist(d);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleNo]);
  const yourBucket = won ? guessCount - 1 : 10;
  // Always render an 11-slot histogram. If the remote distribution hasn't
  // arrived yet (or hasn't picked up this player's row yet), fall back to
  // zeros and add the player's own contribution so they always see at
  // least themselves placed on the chart.
  const displayDist = (() => {
    const base = Array.isArray(dist) && dist.length === 11
      ? [...dist]
      : Array(11).fill(0);
    const ownAlreadyCounted = Array.isArray(dist) && (dist[yourBucket] || 0) > 0;
    if (!ownAlreadyCounted) base[yourBucket] = (base[yourBucket] || 0) + 1;
    return base;
  })();
  const maxBucket = Math.max(1, ...displayDist);
  const totalPlayed = displayDist.reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "var(--sans)",
        animation: "aphFadeIn 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <header
        className="aph-header"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px 40px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MosaicLeaf size={36} theme={theme} />
          <div
            className="aph-title"
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              letterSpacing: "0.04em",
              fontWeight: 700,
            }}
          >
            Aphydle
          </div>
        </div>
        <div
          className="aph-header-meta"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: T.muted,
            letterSpacing: "0.12em",
          }}
        >
          {dateLabel} · No. {puzzleNo} · {won ? "SOLVED" : "REVEALED"}
        </div>
        <div className="aph-header-controls" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {APHYLIA_HOST_URL ? <AphyliaBackLink theme={theme} /> : <AphyliaPill theme={theme} />}
          {onChangeTheme && <ThemeToggle theme={theme} onChange={onChangeTheme} />}
          <NavBtn theme={theme} label="?" onClick={() => setOverlay("how")} title="How to play" />
          <NavBtn theme={theme} label="◫" onClick={() => setOverlay("archive")} title="Archive" />
          <NavBtn theme={theme} label="▤" onClick={() => setOverlay("stats")} title="Stats" />
        </div>
      </header>

      <div className="aph-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px 80px" }}>
        <div
          className="aph-main-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "560px 1fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: won ? T.accent : T.warm,
                letterSpacing: "0.16em",
                marginBottom: 10,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              <span>{won ? `FOUND IN ${guessCount}` : "TODAY WAS A HARD ONE"}</span>
              <span style={{ color: T.muted }}>{String(guessCount).padStart(2, "0")} / 10</span>
            </div>
            <div
              className="aph-finish-image"
              style={{
                width: "100%",
                maxWidth: 560,
                aspectRatio: "1",
                overflow: "hidden",
                background: "#0a0a0a",
                boxShadow:
                  theme === "dark"
                    ? "0 24px 60px rgba(0,0,0,0.5)"
                    : "0 24px 60px rgba(26,24,20,0.15)",
              }}
            >
              <img
                src={plant.imageUrl}
                alt={plant.commonName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  filter: won ? "none" : "saturate(0.75)",
                  animation: "aphFadeIn 0.8s ease",
                }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <MosaicStrip theme={theme} height={6} opacity={0.4} />
            </div>
          </div>

          <div>
            <h1
              className="aph-finish-title"
              style={{
                fontFamily: "var(--serif)",
                fontSize: 56,
                fontWeight: 400,
                margin: 0,
                lineHeight: 1.0,
                letterSpacing: "-0.025em",
                color: T.text,
              }}
            >
              {plant.commonName}
            </h1>
            <div
              className="aph-finish-subtitle"
              style={{
                fontFamily: "var(--sans)",
                fontStyle: "italic",
                fontSize: 16,
                color: T.muted,
                marginTop: 8,
              }}
            >
              {plant.variety ? `${plant.variety} · ` : ""}
              {plant.scientificName} · {plant.family}
            </div>

            {plant.fact ? (
              <>
                <div style={{ height: 1, background: T.border, margin: "28px 0" }} />
                <p
                  className="aph-finish-fact"
                  style={{
                    fontFamily: "var(--serif)",
                    fontStyle: "italic",
                    fontSize: 22,
                    lineHeight: 1.45,
                    margin: 0,
                    color: T.text,
                    maxWidth: 560,
                  }}
                >
                  &ldquo;{plant.fact}&rdquo;
                </p>
              </>
            ) : null}

            <div style={{ height: 1, background: T.border, margin: "28px 0" }} />

            {layout === "album" && (
              <>
                <Section label="YOU" theme={theme}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
                    <span
                      className="aph-finish-yougot"
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 64,
                        fontWeight: 400,
                        lineHeight: 1,
                        color: won ? T.accent : T.warm,
                      }}
                    >
                      {won ? guessCount : "—"}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: T.muted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {won ? "OF 10 GUESSES" : "NO SOLVE"}
                    </span>
                  </div>
                </Section>

                <Section
                  label={`THE WORLD · ${totalPlayed.toLocaleString()} PLAYED`}
                  theme={theme}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(11, 1fr)",
                      gap: 4,
                      alignItems: "end",
                      height: 96,
                      marginTop: 10,
                    }}
                  >
                    {displayDist.map((v, i) => {
                      const isYou = i === yourBucket;
                      const pct = (v / maxBucket) * 100;
                      return (
                        <div
                          key={i}
                          title={`${i < 10 ? `In ${i + 1}` : "Lost"}: ${v}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            height: "100%",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: 10,
                              color: isYou ? (won ? T.accent : T.warm) : T.muted,
                              fontWeight: isYou ? 700 : 500,
                            }}
                          >
                            {v}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: `${pct}%`,
                              background: isYou
                                ? won
                                  ? T.accent
                                  : T.warm
                                : i === 10
                                  ? T.clay
                                  : T.muted,
                              opacity: isYou ? 1 : 0.5,
                              minHeight: 2,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(11, 1fr)",
                      gap: 4,
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      color: T.subtle,
                      marginTop: 6,
                      letterSpacing: "0.05em",
                      textAlign: "center",
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "✗"].map((l, i) => (
                      <span
                        key={l}
                        style={{
                          color: i === yourBucket ? (won ? T.accent : T.warm) : T.subtle,
                          fontWeight: i === yourBucket ? 600 : 400,
                        }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </Section>

                {plant.commonMisguess && plant.commonMisguess.name && (
                  <Section label="COMMON MISGUESS" theme={theme}>
                    <div
                      style={{
                        marginTop: 8,
                        fontFamily: "var(--sans)",
                        fontSize: 15,
                        color: T.text,
                        lineHeight: 1.55,
                      }}
                    >
                      <span
                        style={{
                          color: T.warm,
                          fontFamily: "var(--mono)",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {plant.commonMisguess.percent}%
                      </span>{" "}
                      of players guessed{" "}
                      <em style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>
                        {plant.commonMisguess.name}
                      </em>{" "}
                      first.
                    </div>
                  </Section>
                )}
              </>
            )}

            <div style={{ height: 1, background: T.border, margin: "28px 0 24px" }} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`${APHYLIA_PLANT_URL_BASE}${plant.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 2,
                  minWidth: 220,
                  padding: "16px 22px",
                  background: T.accent,
                  color: "#0A0A0A",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                VIEW ON APHYLIA →
              </a>
              <button
                onClick={() => setOverlay("archive")}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: "16px 22px",
                  background: "transparent",
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                }}
                title="Replay any puzzle you haven't played yet"
              >
                PLAY ANOTHER ↻
              </button>
              {isArchiveSession && onPlayPuzzle && (
                <button
                  onClick={() => onPlayPuzzle(null)}
                  style={{
                    minWidth: 120,
                    padding: "16px 18px",
                    background: "transparent",
                    color: T.muted,
                    border: `1px solid ${T.border}`,
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                  }}
                  title="Return to today's puzzle"
                >
                  ← TODAY
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: `1px solid ${T.border}`,
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: T.muted,
                letterSpacing: "0.12em",
              }}
            >
              <NextPlantCountdown theme={theme} />
            </div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <PoweredByAphylia theme={theme} />
            </div>
          </div>
        </div>
      </div>

      {overlay === "stats" && <StatsScreen theme={theme} onClose={() => setOverlay(null)} />}
      {overlay === "archive" && (
        <ArchiveScreen
          theme={theme}
          onClose={() => setOverlay(null)}
          currentPuzzleNo={puzzleNo}
          onPlayPuzzle={(no) => {
            setOverlay(null);
            if (onPlayPuzzle) onPlayPuzzle(no);
          }}
        />
      )}
      {overlay === "how" && <HowToScreen theme={theme} onClose={() => setOverlay(null)} />}
      {overlay === "export" && (
        <ExportScreen
          theme={theme}
          onClose={() => setOverlay(null)}
          plant={plant}
          puzzleNo={puzzleNo}
        />
      )}
    </div>
  );
}

function Section({ label, children, theme }) {
  const T = tokens(theme);
  return (
    <div style={{ marginBottom: 26 }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: T.muted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function NextPlantCountdown({ theme }) {
  const T = tokens(theme);
  const [ms, setMs] = useState(() => msUntilNextUtcMidnight(new Date()));
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextUtcMidnight(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const fmt = (n) => String(n).padStart(2, "0");
  return (
    <span>
      NEXT PLANT IN{" "}
      <span style={{ color: T.text }}>
        {fmt(h)}h {fmt(m)}m {fmt(s)}s
      </span>
    </span>
  );
}
