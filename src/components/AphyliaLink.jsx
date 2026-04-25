import { tokens } from "./ui/tokens.js";

export const APHYLIA_DAILY_URL = "https://daily.aphylia.app";
export const APHYLIA_HOME_URL = "https://aphylia.app/daily";

// Compact pill for headers.
export function AphyliaPill({ theme, href = APHYLIA_HOME_URL, label = "APHYLIA ↗" }) {
  const T = tokens(theme);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        background: "transparent",
        border: `1px solid ${T.border}`,
        color: T.muted,
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        fontWeight: 600,
        textDecoration: "none",
        cursor: "pointer",
        transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = T.accent;
        e.currentTarget.style.borderColor = T.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = T.muted;
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      {label}
    </a>
  );
}

// Two stacked links: primary URL + secondary fallback. Used in finish screen.
export function AphyliaLinks({ theme, align = "row" }) {
  const T = tokens(theme);
  const linkStyle = {
    fontFamily: "var(--mono)",
    fontSize: 10,
    letterSpacing: "0.12em",
    color: T.muted,
    textDecoration: "none",
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: align === "row" ? "row" : "column",
        gap: align === "row" ? 18 : 6,
        alignItems: align === "row" ? "center" : "flex-start",
      }}
    >
      <a
        href={APHYLIA_HOME_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
        onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
      >
        aphylia.app/daily ↗
      </a>
      <a
        href={APHYLIA_DAILY_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
        onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
      >
        daily.aphylia.app ↗
      </a>
    </div>
  );
}
