import { useEffect, useRef, useState } from "react";
import { tokens } from "./tokens.js";
import { searchGuessable } from "../../lib/data.js";

const SEARCH_DEBOUNCE_MS = 180;

export function GuessInput({ theme, onSubmit, disabled, attemptsLeft, guessedIds = [] }) {
  const T = tokens(theme);
  const [q, setQ] = useState("");
  const [rawMatches, setRawMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const guessedSet = new Set(guessedIds);
  const matches = rawMatches.filter((p) => !guessedSet.has(p.id));

  // Debounced suggestion lookup. Each keystroke schedules a search and
  // cancels any in-flight request, so we only ever render the latest
  // result and never thrash Supabase.
  useEffect(() => {
    setActiveIdx(0);
    const trimmed = q.trim();
    if (!trimmed) {
      setRawMatches([]);
      return undefined;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    abortRef.current = controller;
    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await searchGuessable(trimmed, {
        signal: controller?.signal,
      });
      if (!cancelled) setRawMatches(results);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
      controller?.abort();
    };
  }, [q]);

  function submit(plant) {
    if (!plant || disabled) return;
    if (guessedSet.has(plant.id)) return;
    onSubmit(plant);
    setQ("");
    setRawMatches([]);
    setOpen(false);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[activeIdx]) submit(matches[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: T.elevated,
            border: `1px solid ${T.border}`,
            maxHeight: 240,
            overflow: "auto",
            zIndex: 10,
            boxShadow:
              theme === "dark"
                ? "0 -12px 32px rgba(0,0,0,0.6)"
                : "0 -8px 24px rgba(26,24,20,0.08)",
          }}
        >
          {matches.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(p);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "10px 14px",
                background: i === activeIdx ? T.accentSoft : "transparent",
                borderLeft: i === activeIdx ? `2px solid ${T.accent}` : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  color: T.text,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                {p.variety && (
                  <span
                    style={{
                      fontStyle: "italic",
                      color: T.muted,
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.variety}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: T.muted,
                  letterSpacing: "0.06em",
                }}
              >
                {p.family}
              </span>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: `1px solid ${open && q ? T.accent : T.border}`,
          background: T.elevated,
          boxShadow: open && q ? `0 0 0 4px ${T.accentSoft}` : "none",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={disabled ? "Game over." : "Guess a plant…"}
          style={{
            flex: 1,
            padding: "14px 16px",
            fontFamily: "var(--sans)",
            fontSize: 16,
            background: "transparent",
            border: "none",
            outline: "none",
            color: T.text,
          }}
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (matches[activeIdx]) submit(matches[activeIdx]);
          }}
          disabled={disabled || !matches.length}
          style={{
            padding: "0 20px",
            background: matches.length ? T.accent : "transparent",
            color: matches.length ? "#0A0A0A" : T.subtle,
            border: "none",
            borderLeft: `1px solid ${T.border}`,
            cursor: matches.length ? "pointer" : "not-allowed",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          GUESS ↵
        </button>
      </div>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: T.muted,
          letterSpacing: "0.1em",
        }}
      >
        <span>{attemptsLeft} ATTEMPTS LEFT</span>
        <span>↑↓ NAVIGATE  ·  ↵ SUBMIT</span>
      </div>
    </div>
  );
}
