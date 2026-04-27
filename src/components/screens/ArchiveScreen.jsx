import { useEffect, useMemo, useState } from "react";
import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { loadHistory } from "../../lib/storage.js";
import { loadRecentPuzzles } from "../../lib/data.js";
import { formatPuzzleDate } from "../../engine/game.js";

function formatIsoDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return formatPuzzleDate(new Date(Date.UTC(y, m - 1, d)));
}

export function ArchiveScreen({ theme, onClose, currentPuzzleNo }) {
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

  const entries = useMemo(() => {
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
  }, [remote, history, currentPuzzleNo]);

  return (
    <Sheet theme={theme} onClose={onClose} title="Archive">
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: 14,
          color: T.muted,
          marginBottom: 24,
          lineHeight: 1.5,
          maxWidth: 380,
        }}
      >
        Past plants you've played. Daily puzzles you missed appear once Supabase publishes them.
      </div>
      {entries.length === 0 ? (
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
            return (
              <div
                key={p.puzzleNo}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
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
