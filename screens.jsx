// Aphydle — Result modal, stats, archive, how-to-play

const { useState: useStateR } = React;
const { tokens: tokensR, MosaicStrip: MStrip, MosaicLeaf: MLeaf } = window.AphydleUI;

function ResultModal({ open, won, plant, guessCount, theme, onClose, layout = "album" }) {
  if (!open) return null;
  const T = tokensR(theme);
  const dist = window.APHYDLE_DATA.TODAY_DISTRIBUTION;
  const maxBucket = Math.max(...dist);
  const yourBucket = won ? guessCount - 1 : 10;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: theme === "light" ? "rgba(26,24,20,0.5)" : "rgba(0,0,0,0.78)",
      backdropFilter: "blur(8px)",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "60px 24px 24px", overflow: "auto",
      animation: "aphFadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{
        width: "100%", maxWidth: 520,
        background: T.bg, color: T.text,
        border: `1px solid ${T.border}`,
        animation: "aphSlideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
      }}>
        <button onClick={onClose} aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 2,
            width: 30, height: 30, border: "none", background: "rgba(0,0,0,0.4)",
            color: "#fff", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>

        {/* Hero photo, full bleed */}
        <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "#0a0a0a" }}>
          <img src={plant.imageUrl} alt={plant.commonName}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
              filter: won ? "none" : "saturate(0.7)" }} />
        </div>

        <div style={{ padding: "28px 32px 32px" }}>
          {/* Outcome label */}
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.16em",
            color: won ? T.accent : T.warm, marginBottom: 14, textTransform: "uppercase",
          }}>
            {won ? `Found in ${guessCount}` : "Today was a hard one"}
          </div>

          <h2 style={{
            fontFamily: "var(--serif)", fontSize: 36, fontWeight: 400,
            margin: 0, lineHeight: 1.05, letterSpacing: "-0.02em",
          }}>{plant.commonName}</h2>
          <div style={{
            fontFamily: "var(--sans)", fontStyle: "italic", fontSize: 14,
            color: T.muted, marginTop: 6,
          }}>
            {plant.scientificName}  ·  {plant.family}
          </div>

          <div style={{ height: 1, background: T.border, margin: "24px 0" }} />

          {/* The fact */}
          <p style={{
            fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18,
            lineHeight: 1.5, margin: 0, color: T.text, textWrap: "pretty",
          }}>
            "{plant.fact}"
          </p>

          <div style={{ height: 1, background: T.border, margin: "24px 0" }} />

          {layout === "album" && (
            <>
              <Section label="YOU" theme={theme}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
                  <span style={{
                    fontFamily: "var(--serif)", fontSize: 44, fontWeight: 400,
                    lineHeight: 1, color: won ? T.accent : T.warm,
                  }}>{won ? guessCount : "—"}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.muted }}>
                    {won ? `of 10 guesses` : "no solve"}
                  </span>
                </div>
              </Section>

              <Section label={`THE WORLD  ·  ${dist.reduce((a, b) => a + b, 0).toLocaleString()} PLAYED`} theme={theme}>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(11, 1fr)",
                  gap: 3, alignItems: "end", height: 70, marginTop: 10,
                }}>
                  {dist.map((v, i) => (
                    <div key={i} title={`${i < 10 ? `In ${i + 1}` : "Lost"}: ${v}`}
                      style={{
                        height: `${(v / maxBucket) * 100}%`,
                        background: i === yourBucket ? T.accent
                          : i === 10 ? T.clay : T.muted,
                        opacity: i === yourBucket ? 1 : 0.55,
                        minHeight: 2,
                      }} />
                  ))}
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(11, 1fr)", gap: 3,
                  fontFamily: "var(--mono)", fontSize: 9, color: T.subtle,
                  marginTop: 6, letterSpacing: "0.05em", textAlign: "center",
                }}>
                  {[1,2,3,4,5,6,7,8,9,10,"✗"].map((l) => <span key={l}>{l}</span>)}
                </div>
              </Section>

              <Section label="COMMON MISGUESS" theme={theme}>
                <div style={{ marginTop: 8, fontFamily: "var(--sans)", fontSize: 14, color: T.text, lineHeight: 1.55 }}>
                  <span style={{ color: T.warm, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {plant.commonMisguess.percent}%
                  </span>
                  {" "}of players guessed{" "}
                  <em style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>
                    {plant.commonMisguess.name}
                  </em>
                  {" "}first.
                </div>
              </Section>
            </>
          )}

          {layout === "compact" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Stat label="YOUR GUESSES" value={won ? guessCount : "—"} theme={theme} accent={won} />
              <Stat label="WORLD AVG" value="4.6" theme={theme} />
              <Stat label="WIN RATE" value="71%" theme={theme} />
              <Stat label="STREAK" value="12" theme={theme} accent />
            </div>
          )}

          <div style={{ height: 1, background: T.border, margin: "28px 0 20px" }} />

          <button style={{
            width: "100%", padding: "14px 20px",
            background: T.accent, color: "#0A0A0A",
            border: "none", cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em",
            fontWeight: 700, marginBottom: 10,
          }}>SHARE RESULT  →</button>
          <button style={{
            width: "100%", padding: "14px 20px",
            background: "transparent", color: T.text,
            border: `1px solid ${T.border}`, cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em",
          }}>READ MORE ON APHYLIA  →</button>

          <div style={{
            marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.1em",
          }}>
            <span>NEXT PLANT</span>
            <span>14h 23m 04s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children, theme }) {
  const T = tokensR(theme);
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
        color: T.muted, textTransform: "uppercase",
      }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, theme, accent }) {
  const T = tokensR(theme);
  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", color: T.muted }}>{label}</div>
      <div style={{
        fontFamily: "var(--serif)", fontSize: 36, fontWeight: 400,
        color: accent ? T.accent : T.text, marginTop: 4, lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

// =============================================================
// Stats screen
// =============================================================
function StatsScreen({ theme, onClose }) {
  const T = tokensR(theme);
  const S = window.APHYDLE_DATA.STATS;
  const maxDist = Math.max(...S.distribution);

  return (
    <Sheet theme={theme} onClose={onClose} title="Statistics">
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
        paddingBottom: 28, borderBottom: `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.14em" }}>CURRENT STREAK</div>
          <div style={{
            fontFamily: "var(--serif)", fontSize: 88, fontWeight: 400,
            lineHeight: 1, color: T.accent, marginTop: 8, letterSpacing: "-0.03em",
          }}>{S.currentStreak}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.muted, marginTop: 6, letterSpacing: "0.06em" }}>
            DAYS  ·  MAX {S.maxStreak}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)", gap: 8 }}>
          <MiniStat label="PLAYED" value={S.played} theme={theme} />
          <MiniStat label="WIN %" value={S.winPct} theme={theme} />
          <MiniStat label="MEAN GUESSES" value={S.meanGuesses} theme={theme} />
        </div>
      </div>

      <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 14 }}>
          GUESS DISTRIBUTION
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {S.distribution.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11, color: T.muted,
                width: 22, textAlign: "right",
              }}>{i < 10 ? i + 1 : "✗"}</span>
              <div style={{ flex: 1, height: 18, background: T.elevated, position: "relative" }}>
                <div style={{
                  width: `${(v / maxDist) * 100}%`, height: "100%",
                  background: i === 3 ? T.accent : i === 10 ? T.clay : T.muted,
                  opacity: i === 3 ? 1 : 0.55,
                  display: "flex", alignItems: "center", justifyContent: "flex-end",
                  paddingRight: 8,
                }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
                    color: i === 3 ? "#0A0A0A" : T.text,
                  }}>{v || ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 28 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 14 }}>
          LAST 90 DAYS
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(15, 1fr)", gap: 4,
        }}>
          {S.heatmap.map((v, i) => {
            const colors = {
              0: T.elevated,
              1: `color-mix(in oklab, ${T.accent} 90%, ${T.bg})`,
              2: `color-mix(in oklab, ${T.accent} 70%, ${T.bg})`,
              3: `color-mix(in oklab, ${T.accent} 55%, ${T.bg})`,
              4: `color-mix(in oklab, ${T.accent} 40%, ${T.bg})`,
              5: `color-mix(in oklab, ${T.accent} 25%, ${T.bg})`,
              6: T.clay,
            };
            return <div key={i} style={{
              aspectRatio: "1", background: colors[v], minHeight: 18,
            }} title={v === 0 ? "no play" : v === 6 ? "lost" : `won in ${v}`}/>;
          })}
        </div>
      </div>
    </Sheet>
  );
}

function MiniStat({ label, value, theme }) {
  const T = tokensR(theme);
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      borderBottom: `1px solid ${T.border}`, paddingBottom: 6,
    }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.12em" }}>{label}</span>
      <span style={{ fontFamily: "var(--serif)", fontSize: 26, color: T.text }}>{value}</span>
    </div>
  );
}

// =============================================================
// Archive
// =============================================================
function ArchiveScreen({ theme, onClose }) {
  const T = tokensR(theme);
  const A = window.APHYDLE_DATA.ARCHIVE;
  return (
    <Sheet theme={theme} onClose={onClose} title="Archive">
      <div style={{
        fontFamily: "var(--sans)", fontSize: 14, color: T.muted,
        marginBottom: 24, lineHeight: 1.5, maxWidth: 380,
      }}>
        Past plants. Replay any in practice mode — doesn't affect your streak.
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
      }}>
        {A.map((p) => (
          <div key={p.no} style={{
            cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{
              aspectRatio: "1 / 1", background: T.elevated,
              backgroundImage: `url(${p.img})`, backgroundSize: "cover",
              backgroundPosition: "center", position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 8, left: 8,
                fontFamily: "var(--mono)", fontSize: 10, color: "#fff",
                background: "rgba(0,0,0,0.6)", padding: "3px 6px",
                letterSpacing: "0.08em",
              }}>#{p.no}</div>
              {p.you !== "today" && (
                <div style={{
                  position: "absolute", bottom: 8, right: 8,
                  fontFamily: "var(--mono)", fontSize: 10, color: "#fff",
                  background: p.you === "won" ? "rgba(0,210,106,0.85)" : "rgba(140,111,77,0.9)",
                  padding: "3px 7px", letterSpacing: "0.06em", fontWeight: 600,
                }}>{p.you === "won" ? `✓ ${p.guesses}` : `✗ 10`}</div>
              )}
              {p.you === "today" && (
                <div style={{
                  position: "absolute", bottom: 8, right: 8,
                  fontFamily: "var(--mono)", fontSize: 9, color: "#0A0A0A",
                  background: T.accent,
                  padding: "3px 7px", letterSpacing: "0.1em", fontWeight: 700,
                }}>TODAY</div>
              )}
            </div>
            <div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 9, color: T.muted, letterSpacing: "0.08em",
              }}>{p.date}</div>
              <div style={{
                fontFamily: "var(--serif)", fontSize: 16, color: T.text, marginTop: 2,
              }}>{p.name}</div>
              {p.winRate !== null && (
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: T.muted, marginTop: 3, letterSpacing: "0.04em",
                }}>{p.winRate}% solved</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

// =============================================================
// How to play
// =============================================================
function HowToScreen({ theme, onClose }) {
  const T = tokensR(theme);
  const rows = [
    ["1.", "One mystery plant. Every day. Same plant for everyone."],
    ["2.", "Ten guesses. The picture clears as you go."],
    ["3.", "Each wrong guess unlocks a new text hint — habitat, growth form, family…"],
    ["4.", "Win or lose, you'll learn one thing about today's plant."],
    ["5.", "A new plant arrives at midnight UTC."],
  ];
  return (
    <Sheet theme={theme} onClose={onClose} title="How to play">
      <div style={{
        fontFamily: "var(--serif)", fontSize: 22, lineHeight: 1.4, color: T.text,
        marginBottom: 32, fontStyle: "italic", maxWidth: 460, textWrap: "pretty",
      }}>
        "One mystery plant. Ten guesses. The picture clears as you go."
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map(([n, t]) => (
          <div key={n} style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.muted, width: 18, letterSpacing: "0.06em" }}>{n}</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 16, color: T.text, lineHeight: 1.5, flex: 1 }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: T.border, margin: "32px 0" }} />
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.14em", marginBottom: 14 }}>
        HINT SCHEDULE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {window.APHYDLE_ENGINE.HINT_SCHEDULE.map((h) => (
          <div key={h.key} style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 0", borderBottom: `1px solid ${T.border}`,
            fontFamily: "var(--sans)", fontSize: 13,
          }}>
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

function Sheet({ theme, onClose, title, children }) {
  const T = tokensR(theme);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90, background: T.bg, color: T.text,
      overflow: "auto", animation: "aphFadeIn 0.3s ease",
    }}>
      <div style={{
        position: "sticky", top: 0, background: T.bg,
        borderBottom: `1px solid ${T.border}`, zIndex: 2,
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          padding: "20px 32px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MLeaf size={18} theme={theme} />
            <span style={{
              fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em", color: T.muted,
            }}>{title.toUpperCase()}</span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: T.muted, cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
          }}>CLOSE  ✕</button>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px 80px" }}>
        {children}
      </div>
    </div>
  );
}

window.AphydleScreens = { ResultModal, StatsScreen, ArchiveScreen, HowToScreen };
