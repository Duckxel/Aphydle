import { tokens } from "./tokens.js";

export function MosaicStrip({ theme, height = 10, opacity = 0.5 }) {
  const T = tokens(theme);
  const cells = 60;
  return (
    <div style={{ display: "flex", height, gap: 2, opacity }}>
      {Array.from({ length: cells }).map((_, i) => {
        const v = (Math.sin(i * 1.3) + 1) / 2;
        const bg =
          i % 9 === 0
            ? T.accent
            : i % 7 === 0
              ? T.warm
              : `color-mix(in oklab, ${T.muted} ${20 + v * 40}%, ${T.bg})`;
        return <div key={i} style={{ flex: 1, background: bg }} />;
      })}
    </div>
  );
}
