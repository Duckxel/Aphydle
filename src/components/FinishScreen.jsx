import { tokens } from "./ui/tokens.js";
import { MosaicLeaf } from "./ui/MosaicLeaf.jsx";
import { MosaicStrip } from "./ui/MosaicStrip.jsx";
import { TODAY_DISTRIBUTION } from "../data/plants.js";

export function FinishScreen({
  won,
  plant,
  guessCount,
  theme,
  layout = "album",
  onPlayAgain,
}) {
  const T = tokens(theme);
  const dist = TODAY_DISTRIBUTION;
  const maxBucket = Math.max(...dist);
  const yourBucket = won ? guessCount - 1 : 10;

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
          DAILY · No. 142 · {won ? "SOLVED" : "REVEALED"}
        </div>
        <div style={{ width: 120 }} />
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px 80px" }}>
        <div
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
              style={{
                fontFamily: "var(--sans)",
                fontStyle: "italic",
                fontSize: 16,
                color: T.muted,
                marginTop: 8,
              }}
            >
              {plant.scientificName} · {plant.family}
            </div>

            <div style={{ height: 1, background: T.border, margin: "28px 0" }} />

            <p
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
              "{plant.fact}"
            </p>

            <div style={{ height: 1, background: T.border, margin: "28px 0" }} />

            {layout === "album" && (
              <>
                <Section label="YOU" theme={theme}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
                    <span
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
                  label={`THE WORLD · ${dist.reduce((a, b) => a + b, 0).toLocaleString()} PLAYED`}
                  theme={theme}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(11, 1fr)",
                      gap: 4,
                      alignItems: "end",
                      height: 80,
                      marginTop: 10,
                    }}
                  >
                    {dist.map((v, i) => (
                      <div
                        key={i}
                        title={`${i < 10 ? `In ${i + 1}` : "Lost"}: ${v}`}
                        style={{
                          height: `${(v / maxBucket) * 100}%`,
                          background:
                            i === yourBucket
                              ? won
                                ? T.accent
                                : T.warm
                              : i === 10
                                ? T.clay
                                : T.muted,
                          opacity: i === yourBucket ? 1 : 0.5,
                          minHeight: 2,
                        }}
                      />
                    ))}
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
              </>
            )}

            <div style={{ height: 1, background: T.border, margin: "28px 0 24px" }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{
                  flex: 2,
                  padding: "16px 22px",
                  background: T.accent,
                  color: "#0A0A0A",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                }}
              >
                SHARE →
              </button>
              <button
                onClick={onPlayAgain}
                style={{
                  flex: 1,
                  padding: "16px 22px",
                  background: "transparent",
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                }}
              >
                PLAY AGAIN ↻
              </button>
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: `1px solid ${T.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: T.muted,
                letterSpacing: "0.12em",
              }}
            >
              <span>NEXT PLANT IN</span>
              <span style={{ color: T.text }}>14h 23m 04s</span>
            </div>
          </div>
        </div>
      </div>
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
