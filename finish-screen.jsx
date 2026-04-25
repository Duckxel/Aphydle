// Aphydle — Full-page finish screen (replaces popup result modal)

const { useState: useStateF } = React;

function FinishScreen({ won, plant, guessCount, theme, layout = "album", onPlayAgain, onOpenStats, onOpenArchive, onOpenHowTo }) {
  const T = window.AphydleUI.tokens(theme);
  const dist = window.APHYDLE_DATA.TODAY_DISTRIBUTION;
  const maxBucket = Math.max(...dist);
  const yourBucket = won ? guessCount - 1 : 10;
  const { MosaicLeaf, MosaicStrip } = window.AphydleUI;

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "var(--sans)",
      animation: "aphFadeIn 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <header style={{
        maxWidth: 1200, margin: "0 auto", padding: "20px 40px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MosaicLeaf size={22} theme={theme} />
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "0.04em", fontWeight: 500 }}>Aphydle</div>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.muted, letterSpacing: "0.12em" }}>
          WED 26 APR  ·  No. 142  ·  {won ? "SOLVED" : "REVEALED"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onOpenHowTo} style={navBtnStyle(T)}>?</button>
          <button onClick={onOpenArchive} style={navBtnStyle(T)}>◫</button>
          <button onClick={onOpenStats} style={navBtnStyle(T)}>▤</button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "560px 1fr", gap: 56, alignItems: "start" }}>
          {/* LEFT: hero photo */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: "var(--mono)", fontSize: 10, color: won ? T.accent : T.warm,
              letterSpacing: "0.16em", marginBottom: 10, textTransform: "uppercase", fontWeight: 600,
            }}>
              <span>{won ? `FOUND IN ${guessCount}` : "TODAY WAS A HARD ONE"}</span>
              <span style={{ color: T.muted }}>{String(guessCount).padStart(2, "0")} / 10</span>
            </div>
            <div style={{
              width: 560, aspectRatio: "1", overflow: "hidden", background: "#0a0a0a",
              boxShadow: theme === "dark" ? "0 24px 60px rgba(0,0,0,0.5)" : "0 24px 60px rgba(26,24,20,0.15)",
            }}>
              <img src={plant.imageUrl} alt={plant.commonName}
                style={{
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                  filter: won ? "none" : "saturate(0.75)",
                  animation: "aphFadeIn 0.8s ease",
                }} />
            </div>
            <div style={{ marginTop: 14 }}><MosaicStrip theme={theme} height={6} opacity={0.4} /></div>
          </div>

          {/* RIGHT: name + fact + stats */}
          <div>
            <h1 style={{
              fontFamily: "var(--serif)", fontSize: 56, fontWeight: 400,
              margin: 0, lineHeight: 1.0, letterSpacing: "-0.025em",
              color: won ? T.text : T.text,
            }}>{plant.commonName}</h1>
            <div style={{
              fontFamily: "var(--sans)", fontStyle: "italic", fontSize: 16,
              color: T.muted, marginTop: 8,
            }}>
              {plant.scientificName}  ·  {plant.family}
            </div>

            <div style={{ height: 1, background: T.border, margin: "28px 0" }} />

            <p style={{
              fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22,
              lineHeight: 1.45, margin: 0, color: T.text, textWrap: "pretty",
              maxWidth: 560,
            }}>
              "{plant.fact}"
            </p>

            <div style={{ height: 1, background: T.border, margin: "28px 0" }} />

            {layout === "album" && (
              <>
                <FinishSection label="YOU" theme={theme}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
                    <span style={{
                      fontFamily: "var(--serif)", fontSize: 64, fontWeight: 400,
                      lineHeight: 1, color: won ? T.accent : T.warm,
                    }}>{won ? guessCount : "—"}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: T.muted, letterSpacing: "0.08em" }}>
                      {won ? `OF 10 GUESSES` : "NO SOLVE"}
                    </span>
                  </div>
                </FinishSection>

                <FinishSection label={`THE WORLD  ·  ${dist.reduce((a, b) => a + b, 0).toLocaleString()} PLAYED`} theme={theme}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(11, 1fr)",
                    gap: 4, alignItems: "end", height: 80, marginTop: 10,
                  }}>
                    {dist.map((v, i) => (
                      <div key={i} title={`${i < 10 ? `In ${i + 1}` : "Lost"}: ${v}`}
                        style={{
                          height: `${(v / maxBucket) * 100}%`,
                          background: i === yourBucket ? (won ? T.accent : T.warm)
                            : i === 10 ? T.clay : T.muted,
                          opacity: i === yourBucket ? 1 : 0.5,
                          minHeight: 2,
                        }} />
                    ))}
                  </div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(11, 1fr)", gap: 4,
                    fontFamily: "var(--mono)", fontSize: 9, color: T.subtle,
                    marginTop: 6, letterSpacing: "0.05em", textAlign: "center",
                  }}>
                    {[1,2,3,4,5,6,7,8,9,10,"✗"].map((l, i) => (
                      <span key={l} style={{ color: i === yourBucket ? (won ? T.accent : T.warm) : T.subtle, fontWeight: i === yourBucket ? 600 : 400 }}>{l}</span>
                    ))}
                  </div>
                </FinishSection>

                <FinishSection label="COMMON MISGUESS" theme={theme}>
                  <div style={{ marginTop: 8, fontFamily: "var(--sans)", fontSize: 15, color: T.text, lineHeight: 1.55 }}>
                    <span style={{ color: T.warm, fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600 }}>
                      {plant.commonMisguess.percent}%
                    </span>
                    {" "}of players guessed{" "}
                    <em style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>
                      {plant.commonMisguess.name}
                    </em>
                    {" "}first.
                  </div>
                </FinishSection>
              </>
            )}

            {layout === "compact" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
                <FinishStat label="YOUR GUESSES" value={won ? guessCount : "—"} theme={theme} accent={won} />
                <FinishStat label="WORLD AVG" value="4.6" theme={theme} />
                <FinishStat label="WIN RATE" value="71%" theme={theme} />
                <FinishStat label="STREAK" value="12" theme={theme} accent />
              </div>
            )}

            <div style={{ height: 1, background: T.border, margin: "28px 0 24px" }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{
                flex: 2, padding: "16px 22px",
                background: T.accent, color: "#0A0A0A",
                border: "none", cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em",
                fontWeight: 700,
              }}>SHARE  →</button>
              <button onClick={onPlayAgain} style={{
                flex: 1, padding: "16px 22px",
                background: "transparent", color: T.text,
                border: `1px solid ${T.border}`, cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em",
              }}>PLAY AGAIN  ↻</button>
            </div>

            <div style={{
              marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.12em",
            }}>
              <span>NEXT PLANT IN</span>
              <span style={{ color: T.text }}>14h 23m 04s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinishSection({ label, children, theme }) {
  const T = window.AphydleUI.tokens(theme);
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", color: T.muted, textTransform: "uppercase" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function FinishStat({ label, value, theme, accent }) {
  const T = window.AphydleUI.tokens(theme);
  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", color: T.muted }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 400, color: accent ? T.accent : T.text, marginTop: 4, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function navBtnStyle(T) {
  return {
    width: 32, height: 32, background: "transparent",
    border: `1px solid ${T.border}`, color: T.muted,
    fontFamily: "var(--mono)", fontSize: 13, cursor: "pointer",
  };
}

// Mobile finish screen — simpler, scrollable
function FinishScreenMobile({ won, plant, guessCount, theme, onPlayAgain }) {
  const T = window.AphydleUI.tokens(theme);
  const dist = window.APHYDLE_DATA.TODAY_DISTRIBUTION;
  const maxBucket = Math.max(...dist);
  const yourBucket = won ? guessCount - 1 : 10;
  const { MosaicLeaf } = window.AphydleUI;

  return (
    <div style={{
      width: "100%", height: "100%", overflow: "auto",
      background: T.bg, color: T.text, fontFamily: "var(--sans)",
      animation: "aphFadeIn 0.5s ease",
    }}>
      <div style={{
        padding: "60px 18px 12px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MosaicLeaf size={16} theme={theme} />
          <span style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500 }}>Aphydle</span>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: won ? T.accent : T.warm, letterSpacing: "0.12em", fontWeight: 600 }}>
          {won ? `FOUND IN ${guessCount}` : "REVEALED"}
        </div>
      </div>

      <div style={{ padding: "0", width: "100%", aspectRatio: "1" }}>
        <img src={plant.imageUrl} alt={plant.commonName}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
            filter: won ? "none" : "saturate(0.75)" }} />
      </div>

      <div style={{ padding: "20px 18px 40px" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 400, margin: 0, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          {plant.commonName}
        </h1>
        <div style={{ fontFamily: "var(--sans)", fontStyle: "italic", fontSize: 13, color: T.muted, marginTop: 4 }}>
          {plant.scientificName} · {plant.family}
        </div>

        <div style={{ height: 1, background: T.border, margin: "18px 0" }} />

        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, lineHeight: 1.5, margin: 0, color: T.text, textWrap: "pretty" }}>
          "{plant.fact}"
        </p>

        <div style={{ height: 1, background: T.border, margin: "18px 0" }} />

        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", color: T.muted, marginBottom: 8 }}>THE WORLD</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(11, 1fr)", gap: 2, alignItems: "end", height: 50 }}>
          {dist.map((v, i) => (
            <div key={i} style={{
              height: `${(v / maxBucket) * 100}%`,
              background: i === yourBucket ? (won ? T.accent : T.warm) : i === 10 ? T.clay : T.muted,
              opacity: i === yourBucket ? 1 : 0.5, minHeight: 2,
            }} />
          ))}
        </div>

        <div style={{ marginTop: 24, fontFamily: "var(--sans)", fontSize: 13, color: T.text, lineHeight: 1.5 }}>
          <span style={{ color: T.warm, fontFamily: "var(--mono)", fontWeight: 600 }}>{plant.commonMisguess.percent}%</span>
          {" "}guessed{" "}
          <em style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>{plant.commonMisguess.name}</em>{" "}first.
        </div>

        <button style={{
          marginTop: 24, width: "100%", padding: "14px 16px",
          background: T.accent, color: "#0A0A0A", border: "none", cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", fontWeight: 700,
        }}>SHARE  →</button>
        <button onClick={onPlayAgain} style={{
          marginTop: 8, width: "100%", padding: "14px 16px",
          background: "transparent", color: T.text, border: `1px solid ${T.border}`, cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em",
        }}>PLAY AGAIN  ↻</button>

        <div style={{ marginTop: 20, fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.12em", textAlign: "center" }}>
          NEXT PLANT IN 14h 23m
        </div>
      </div>
    </div>
  );
}

// Attempts segmented bar — better visualization than "03 / 10"
function AttemptsBar({ used, total = 10, theme }) {
  const T = window.AphydleUI.tokens(theme);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const isUsed = i < used;
        return (
          <div key={i} style={{
            width: 18, height: 6,
            background: isUsed ? T.clay : T.accent,
            opacity: isUsed ? 0.7 : 1,
            transition: "background 0.3s",
          }} />
        );
      })}
    </div>
  );
}

window.AphydleFinish = { FinishScreen, FinishScreenMobile, AttemptsBar };
