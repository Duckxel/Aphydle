import { tokens } from "../ui/tokens.js";
import { MosaicLeaf } from "../ui/MosaicLeaf.jsx";

export function Sheet({ theme, onClose, title, children }) {
  const T = tokens(theme);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: T.bg,
        color: T.text,
        overflow: "auto",
        animation: "aphFadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: T.bg,
          borderBottom: `1px solid ${T.border}`,
          zIndex: 2,
        }}
      >
        <div
          className="aph-sheet-header"
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "20px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MosaicLeaf size={28} theme={theme} />
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: T.muted,
              }}
            >
              {title.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: T.muted,
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
            }}
          >
            CLOSE ✕
          </button>
        </div>
      </div>
      <div className="aph-sheet-body" style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px 80px" }}>
        {children}
      </div>
    </div>
  );
}
