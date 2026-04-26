import { tokens } from "./ui/tokens.js";

export function AttemptsBar({ used, total = 10, theme }) {
  const T = tokens(theme);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const isUsed = i < used;
        return (
          <div
            key={i}
            style={{
              width: 18,
              height: 6,
              background: isUsed ? T.clay : T.accent,
              opacity: isUsed ? 0.7 : 1,
              transition: "background 0.3s",
            }}
          />
        );
      })}
    </div>
  );
}
