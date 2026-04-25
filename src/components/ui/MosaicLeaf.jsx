import { tokens } from "./tokens.js";

export function MosaicLeaf({ size = 22, theme }) {
  const T = tokens(theme);
  const grid = ["..GG..", ".GGGG.", "GGGGGG", "GGGGG.", ".GGG..", "..G..."];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(6, ${size / 6}px)`,
        gridTemplateRows: `repeat(6, ${size / 6}px)`,
        gap: 1,
      }}
    >
      {grid.flatMap((row, r) =>
        row.split("").map((c, x) => (
          <div
            key={`${r}-${x}`}
            style={{ background: c === "G" ? T.accent : "transparent" }}
          />
        )),
      )}
    </div>
  );
}
