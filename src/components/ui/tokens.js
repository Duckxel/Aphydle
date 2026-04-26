export function tokens(theme) {
  if (theme === "light") {
    return {
      bg: "#F5F1E8",
      elevated: "#FFFFFF",
      border: "#E5DFD0",
      text: "#1A1814",
      muted: "#6B6760",
      subtle: "#8A8580",
      accent: "#007F3F",
      accentSoft: "rgba(0,127,63,0.12)",
      warm: "#B87B0D",
      clay: "#8C6F4D",
      stripe: "#EFE9D6",
    };
  }
  return {
    bg: "#0A0A0A",
    elevated: "#141414",
    border: "#1F1F1F",
    text: "#F5F1E8",
    muted: "#8A8A85",
    subtle: "#5A5A55",
    accent: "#00D26A",
    accentSoft: "rgba(0,210,106,0.15)",
    warm: "#F5A524",
    clay: "#8C6F4D",
    stripe: "#101010",
  };
}
