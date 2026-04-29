import { useEffect, useMemo, useState } from "react";
import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { loadHistory } from "../../lib/storage.js";
import {
  loadRecentPuzzles,
  loadDailyPuzzleLog,
  formatDailyLogText,
} from "../../lib/data.js";
import { formatPuzzleDate } from "../../engine/game.js";

async function downloadDailyLog() {
  const entries = await loadDailyPuzzleLog();
  const text = formatDailyLogText(entries || []);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aphydle-daily-log.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatIsoDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return formatPuzzleDate(new Date(Date.UTC(y, m - 1, d)));
}

export function ArchiveScreen({ theme, onClose, currentPuzzleNo, onPlayPuzzle }) {
  const T = tokens(theme);
  const [remote, setRemote] = useState(null); // null = unknown, [] = empty
  const [history] = useState(() => loadHistory());

  useEffect(() => {
    let cancelled = false;
    loadRecentPuzzles(12).then((rows) => {
      if (!cancelled) setRemote(rows || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // While `remote === null` we're still waiting on Supabase. Don't render
  // history-derived entries during that window — every history row is
  // implicitly `played`, which would briefly reveal the very thumbnails we
  // intend to censor before the remote list arrives and re-renders them
  // hidden. Treat the loading state as empty until the remote settles.
  const isLoading = remote === null;
  const entries = useMemo(() => {
    if (isLoading) return [];
    const playedById = new Map(history.map((h) => [h.puzzleNo, h]));
    if (Array.isArray(remote) && remote.length > 0) {
      return remote.map((r) => {
        const played = playedById.get(r.puzzleNo);
        return {
          puzzleNo: r.puzzleNo,
          date: formatIsoDate(r.date),
          name: r.name,
          imageUrl: r.imageUrl,
          played,
          isToday: r.puzzleNo === currentPuzzleNo,
        };
      });
    }
    return [...history]
      .sort((a, b) => b.puzzleNo - a.puzzleNo)
      .map((h) => ({
        puzzleNo: h.puzzleNo,
        date: h.finishedAt ? formatPuzzleDate(new Date(h.finishedAt)) : "",
        name: h.plantName,
        imageUrl: h.imageUrl,
        played: h,
        isToday: h.puzzleNo === currentPuzzleNo,
      }));
  }, [isLoading, remote, history, currentPuzzleNo]);

  return (
    <Sheet theme={theme} onClose={onClose} title="Archive">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 14,
            color: T.muted,
            lineHeight: 1.5,
            maxWidth: 380,
          }}
        >
          Past plants you've played. Daily puzzles you missed appear once Supabase publishes them.
        </div>
        <button
          onClick={downloadDailyLog}
          style={{
            padding: "8px 14px",
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.text,
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title="Download the full server-side log of daily plant picks"
        >
          DOWNLOAD LOG ↓
        </button>
      </div>
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background: T.elevated,
                  opacity: 0.5,
                }}
              />
              <div style={{ height: 28 }} />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
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
            }}
          >
            Nothing here yet.
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
            Play today's puzzle and previous days will appear here as the daily rotation publishes them.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {entries.map((p) => {
            // The archive must never spoil unplayed puzzles. We only reveal
            // the photo and the plant name once the player has finished that
            // puzzle (won or lost). Today counts as revealed only if it's
            // already in their history — otherwise it's locked like the rest.
            const revealed = Boolean(p.played);
            const playable = Boolean(onPlayPuzzle) && !revealed;
            // Revealed past puzzles are clickable too — they don't replay
            // (history locks the outcome) but they open the FinishScreen so
            // the player can re-read the answer, the recap and the stats.
            const reviewable = Boolean(onPlayPuzzle) && revealed && !p.isToday;
            const interactive = playable || reviewable || p.isToday;
            const handleClick = () => {
              if (!onPlayPuzzle) return;
              if (p.isToday) {
                // Returning to today is always allowed; if today is already
                // played the parent ignores the call.
                onPlayPuzzle(null);
              } else if (playable || reviewable) {
                onPlayPuzzle(p.puzzleNo);
              }
            };
            return (
              <div
                key={p.puzzleNo}
                onClick={interactive ? handleClick : undefined}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && interactive) {
                    e.preventDefault();
                    handleClick();
                  }
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: interactive ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    background: T.elevated,
                    backgroundImage:
                      revealed && p.imageUrl ? `url(${p.imageUrl})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative",
                  }}
                >
                  {!revealed && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: T.muted,
                        fontFamily: "var(--serif)",
                        fontSize: 48,
                        fontWeight: 300,
                        opacity: 0.5,
                      }}
                    >
                      ?
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "#fff",
                      background: "rgba(0,0,0,0.6)",
                      padding: "3px 6px",
                      letterSpacing: "0.08em",
                    }}
                  >
                    #{p.puzzleNo}
                  </div>
                  {p.isToday && !revealed ? (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        color: "#0A0A0A",
                        background: T.accent,
                        padding: "3px 7px",
                        letterSpacing: "0.1em",
                        fontWeight: 700,
                      }}
                    >
                      TODAY
                    </div>
                  ) : revealed ? (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "#fff",
                        background:
                          p.played.outcome === "won"
                            ? "rgba(0,210,106,0.85)"
                            : "rgba(140,111,77,0.9)",
                        padding: "3px 7px",
                        letterSpacing: "0.06em",
                        fontWeight: 600,
                      }}
                    >
                      {p.played.outcome === "won"
                        ? `✓ ${p.played.guessCount}`
                        : "✗ 10"}
                    </div>
                  ) : null}
                </div>
                <div>
                  {p.date && (
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        color: T.muted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {p.date}
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 16,
                      color: revealed ? T.text : T.muted,
                      fontStyle: revealed ? "normal" : "italic",
                      marginTop: 2,
                    }}
                  >
                    {revealed
                      ? p.name || "Unknown plant"
                      : p.isToday
                        ? "Play to reveal"
                        : playable
                          ? "Click to play →"
                          : "Hidden — never played"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
