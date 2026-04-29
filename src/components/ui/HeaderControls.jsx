import { tokens } from "./tokens.js";

export function NavBtn({ theme, label, onClick, title }) {
  const T = tokens(theme);
  return (
    <button
      className="aph-nav-btn"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 32,
        height: 32,
        background: "transparent",
        border: `1px solid ${T.border}`,
        color: T.muted,
        fontFamily: "var(--mono)",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export function ThemeToggle({ theme, onChange }) {
  const T = tokens(theme);
  return (
    <div
      className="aph-theme-toggle"
      style={{
        display: "flex",
        border: `1px solid ${T.border}`,
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
      }}
    >
      {["dark", "light"].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={theme === m}
          style={{
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
            background: theme === m ? T.text : "transparent",
            color: theme === m ? T.bg : T.muted,
          }}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
