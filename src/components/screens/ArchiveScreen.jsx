import { tokens } from "../ui/tokens.js";
import { Sheet } from "./Sheet.jsx";
import { ARCHIVE } from "../../data/plants.js";

export function ArchiveScreen({ theme, onClose }) {
  const T = tokens(theme);
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
        Past plants. Replay any in practice mode — doesn't affect your streak.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {ARCHIVE.map((p) => (
          <div
            key={p.no}
            style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div
              style={{
                aspectRatio: "1 / 1",
                background: T.elevated,
                backgroundImage: `url(${p.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "relative",
              }}
            >
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
                #{p.no}
              </div>
              {p.you !== "today" && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "#fff",
                    background:
                      p.you === "won" ? "rgba(0,210,106,0.85)" : "rgba(140,111,77,0.9)",
                    padding: "3px 7px",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                >
                  {p.you === "won" ? `✓ ${p.guesses}` : `✗ 10`}
                </div>
              )}
              {p.you === "today" && (
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
              )}
            </div>
            <div>
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
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 16,
                  color: T.text,
                  marginTop: 2,
                }}
              >
                {p.name}
              </div>
              {p.winRate !== null && (
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: T.muted,
                    marginTop: 3,
                    letterSpacing: "0.04em",
                  }}
                >
                  {p.winRate}% solved
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
