// Aphydle game engine: hint scheduling and mosaic level math.

export const HINT_SCHEDULE = [
  { atAttempt: 1, key: "habitat", label: "Habitat" },
  { atAttempt: 2, key: "growth", label: "Growth form" },
  { atAttempt: 3, key: "colors", label: "Foliage" },
  { atAttempt: 4, key: "care", label: "Care + light" },
  { atAttempt: 5, key: "region", label: "Native to" },
  { atAttempt: 6, key: "family", label: "Family" },
  { atAttempt: 7, key: "toxicity", label: "Toxicity" },
  { atAttempt: 8, key: "name-shape", label: "Name shape" },
  { atAttempt: 9, key: "genus", label: "Genus" },
];

export function buildHint(key, plant) {
  switch (key) {
    case "habitat":
      return plant.habitat;
    case "growth":
      return plant.growthForm;
    case "colors":
      return plant.dominantColors.join(", ");
    case "care":
      return `${"●".repeat(plant.careLevel)}${"○".repeat(5 - plant.careLevel)}  ·  ${plant.lightNeeds}`;
    case "region":
      return plant.nativeRegion;
    case "family":
      return plant.family;
    case "toxicity":
      return plant.toxicity;
    case "name-shape": {
      const n = plant.commonName.split(" ")[0];
      return `${n[0]} ${"·".repeat(n.length - 1)}  ·  ${plant.commonName.length} characters`;
    }
    case "genus":
      return plant.scientificName.split(" ")[0];
    default:
      return "";
  }
}

export function getHints(attempts, plant) {
  return HINT_SCHEDULE.map((h) => ({
    ...h,
    revealed: attempts >= h.atAttempt,
    value: attempts >= h.atAttempt ? buildHint(h.key, plant) : null,
  }));
}

// Mosaic level: 0 (clear) → 9 (most pixelated). Returns tile count across the image.
export function tileCountForLevel(level) {
  if (level <= 0) return 0;
  const ladder = [0, 64, 48, 36, 28, 22, 16, 12, 8, 4];
  return ladder[Math.min(level, ladder.length - 1)];
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "guess": {
      if (state.outcome) return state;
      const isCorrect = action.plant.id === action.answerId;
      const guesses = [...state.guesses, action.plant];
      let outcome = null;
      if (isCorrect) outcome = "won";
      else if (guesses.length >= 10) outcome = "lost";
      return { ...state, guesses, outcome };
    }
    case "reset":
      return { guesses: [], outcome: null };
    default:
      return state;
  }
}

export const initialGameState = { guesses: [], outcome: null };
