// Aphydle — Game screen (used in both desktop + mobile contexts)

const { useEffect: useEffectG, useRef: useRefG, useState: useStateG, useMemo: useMemoG } = React;

function tokens(theme) {
  if (theme === "light") {
    return {
      bg: "#F5F1E8", elevated: "#FFFFFF", border: "#E5DFD0",
      text: "#1A1814", muted: "#6B6760", subtle: "#8A8580",
      accent: "#007F3F", accentSoft: "rgba(0,127,63,0.12)",
      warm: "#B87B0D", clay: "#8C6F4D",
      stripe: "#EFE9D6",
    };
  }
  return {
    bg: "#0A0A0A", elevated: "#141414", border: "#1F1F1F",
    text: "#F5F1E8", muted: "#8A8A85", subtle: "#5A5A55",
    accent: "#00D26A", accentSoft: "rgba(0,210,106,0.15)",
    warm: "#F5A524", clay: "#8C6F4D",
    stripe: "#101010",
  };
}

// Mosaic strip divider — used per the brief
function MosaicStrip({ theme, height = 10, opacity = 0.5 }) {
  const T = tokens(theme);
  const cells = 60;
  return (
    <div style={{ display: "flex", height, gap: 2, opacity }}>
      {Array.from({ length: cells }).map((_, i) => {
        const v = (Math.sin(i * 1.3) + 1) / 2;
        const bg = i % 9 === 0 ? T.accent
          : i % 7 === 0 ? T.warm
          : `color-mix(in oklab, ${T.muted} ${20 + v * 40}%, ${T.bg})`;
        return <div key={i} style={{ flex: 1, background: bg }} />;
      })}
    </div>
  );
}

function MosaicLeaf({ size = 22, theme }) {
  const T = tokens(theme);
  // 6x6 mosaic leaf glyph
  const grid = [
    "..GG..",
    ".GGGG.",
    "GGGGGG",
    "GGGGG.",
    ".GGG..",
    "..G...",
  ];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(6, ${size / 6}px)`,
      gridTemplateRows: `repeat(6, ${size / 6}px)`,
      gap: 1,
    }}>
      {grid.flatMap((row, r) => row.split("").map((c, x) => (
        <div key={`${r}-${x}`} style={{
          background: c === "G" ? T.accent : "transparent",
        }} />
      )))}
    </div>
  );
}

function HintCard({ hint, theme, style: cardStyle }) {
  const T = tokens(theme);
  const locked = !hint.revealed;
  const styles = cardStyle || "default";

  if (styles === "minimal") {
    return (
      <div style={{
        display: "flex", alignItems: "baseline", gap: 14,
        padding: "10px 0",
        borderTop: `1px solid ${T.border}`,
        opacity: locked ? 0.35 : 1,
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em",
          color: T.muted, width: 90, textTransform: "uppercase",
        }}>{hint.label}</span>
        <span style={{
          fontFamily: locked ? "var(--mono)" : "var(--sans)",
          fontSize: locked ? 11 : 14, color: locked ? T.subtle : T.text,
          letterSpacing: locked ? "0.05em" : 0,
        }}>
          {locked ? `Unlocks at attempt ${hint.atAttempt}` : hint.value}
        </span>
      </div>
    );
  }

  // default — bordered cards
  return (
    <div style={{
      border: `1px solid ${locked ? T.border : T.border}`,
      background: locked ? "transparent" : T.elevated,
      padding: "10px 14px",
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      gap: 14,
      opacity: locked ? 0.5 : 1,
      transition: "opacity 0.3s ease",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em",
          color: T.muted, textTransform: "uppercase",
        }}>{hint.label}</span>
        <span style={{
          fontFamily: "var(--sans)", fontSize: 14, color: locked ? T.subtle : T.text,
          fontWeight: locked ? 400 : 500,
        }}>
          {locked ? `Unlocks at ${hint.atAttempt}/9` : hint.value}
        </span>
      </div>
      {!locked && <span style={{
        fontFamily: "var(--mono)", fontSize: 10, color: T.accent,
      }}>●</span>}
    </div>
  );
}

function GuessInput({ theme, onSubmit, disabled, attemptsLeft }) {
  const T = tokens(theme);
  const [q, setQ] = useStateG("");
  const [open, setOpen] = useStateG(false);
  const [activeIdx, setActiveIdx] = useStateG(0);
  const inputRef = useRefG(null);

  const matches = useMemoG(() => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    return window.APHYDLE_DATA.GUESSABLE
      .filter((p) => p.name.toLowerCase().includes(lower))
      .slice(0, 6);
  }, [q]);

  useEffectG(() => { setActiveIdx(0); }, [q]);

  function submit(plant) {
    if (!plant || disabled) return;
    onSubmit(plant);
    setQ("");
    setOpen(false);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(matches.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[activeIdx]) submit(matches[activeIdx]);
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
          background: T.elevated, border: `1px solid ${T.border}`,
          maxHeight: 240, overflow: "auto", zIndex: 10,
          boxShadow: theme === "dark"
            ? "0 -12px 32px rgba(0,0,0,0.6)"
            : "0 -8px 24px rgba(26,24,20,0.08)",
        }}>
          {matches.map((p, i) => (
            <div key={p.id}
              onMouseDown={(e) => { e.preventDefault(); submit(p); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "10px 14px",
                background: i === activeIdx ? T.accentSoft : "transparent",
                borderLeft: i === activeIdx ? `2px solid ${T.accent}` : "2px solid transparent",
                cursor: "pointer",
                display: "flex", alignItems: "baseline", justifyContent: "space-between",
              }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 14, color: T.text }}>{p.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.06em" }}>{p.family}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "stretch",
        border: `1px solid ${open && q ? T.accent : T.border}`,
        background: T.elevated,
        boxShadow: open && q ? `0 0 0 4px ${T.accentSoft}` : "none",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={disabled ? "Game over." : "Guess a plant…"}
          style={{
            flex: 1, padding: "14px 16px",
            fontFamily: "var(--sans)", fontSize: 16,
            background: "transparent", border: "none", outline: "none",
            color: T.text,
          }}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); if (matches[activeIdx]) submit(matches[activeIdx]); }}
          disabled={disabled || !matches.length}
          style={{
            padding: "0 20px",
            background: matches.length ? T.accent : "transparent",
            color: matches.length ? "#0A0A0A" : T.subtle,
            border: "none",
            borderLeft: `1px solid ${T.border}`,
            cursor: matches.length ? "pointer" : "not-allowed",
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          GUESS  ↵
        </button>
      </div>
      <div style={{
        marginTop: 8, display: "flex", justifyContent: "space-between",
        fontFamily: "var(--mono)", fontSize: 10, color: T.muted, letterSpacing: "0.1em",
      }}>
        <span>{attemptsLeft} ATTEMPTS LEFT</span>
        <span>↑↓ NAVIGATE  ·  ↵ SUBMIT</span>
      </div>
    </div>
  );
}

function PastGuesses({ guesses, theme, answer }) {
  const T = tokens(theme);
  if (!guesses.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {[...guesses].reverse().map((g, i) => {
        const sameFamily = answer && g.family && g.family === answer.family && g.id !== answer.id;
        return (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 10px",
          margin: "0 -10px",
          borderBottom: i === guesses.length - 1 ? "none" : `1px solid ${T.border}`,
          background: sameFamily
            ? (theme === "dark" ? "rgba(0,210,106,0.06)" : "rgba(0,127,63,0.05)")
            : "transparent",
          borderLeft: sameFamily ? `2px solid ${T.accent}` : "2px solid transparent",
          paddingLeft: sameFamily ? 10 : 12,
        }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10, color: T.muted,
            width: 24, letterSpacing: "0.06em",
          }}>{String(guesses.length - i).padStart(2, "0")}</span>
          <span style={{
            color: sameFamily ? T.accent : T.clay, fontSize: 16,
          }}>{sameFamily ? "◐" : "✕"}</span>
          <span style={{
            fontFamily: "var(--sans)", fontSize: 14,
            color: sameFamily ? T.accent : T.muted,
            textDecoration: "line-through",
            textDecorationColor: sameFamily ? `${T.accent}80` : T.subtle,
            fontWeight: sameFamily ? 500 : 400,
          }}>{g.name}</span>
          <span style={{
            marginLeft: "auto",
            fontFamily: "var(--mono)", fontSize: 10,
            color: sameFamily ? T.accent : T.subtle,
            letterSpacing: "0.06em",
            fontWeight: sameFamily ? 600 : 400,
          }}>{g.family}</span>
        </div>
        );
      })}
    </div>
  );
}

window.AphydleUI = { tokens, MosaicStrip, MosaicLeaf, HintCard, GuessInput, PastGuesses };
