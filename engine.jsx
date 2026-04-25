// Aphydle — game engine + hint scheduler

const HINT_SCHEDULE = [
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

function buildHint(key, plant) {
  switch (key) {
    case "habitat": return plant.habitat;
    case "growth": return plant.growthForm;
    case "colors": return plant.dominantColors.join(", ");
    case "care": return `${"●".repeat(plant.careLevel)}${"○".repeat(5 - plant.careLevel)}  ·  ${plant.lightNeeds}`;
    case "region": return plant.nativeRegion;
    case "family": return plant.family;
    case "toxicity": return plant.toxicity;
    case "name-shape": {
      const n = plant.commonName.split(" ")[0];
      return `${n[0]} ${"·".repeat(n.length - 1)}  ·  ${plant.commonName.length} characters`;
    }
    case "genus": return plant.scientificName.split(" ")[0];
    default: return "";
  }
}

function getHints(attempts, plant) {
  return HINT_SCHEDULE.map((h) => ({
    ...h,
    revealed: attempts >= h.atAttempt,
    value: attempts >= h.atAttempt ? buildHint(h.key, plant) : null,
  }));
}

// Mosaic level: 0 (clear) -> 9 (most pixelated)
// Returns the number of tiles ACROSS the image for this level.
// Higher level = fewer tiles = chunkier mosaic.
// Tile count is canvas-size-independent, so mobile and desktop look identical.
function tileCountForLevel(level) {
  if (level <= 0) return 0; // 0 = clear, no mosaic
  // Level 9 (start) = 4 tiles across (very chunky)
  // Level 1 (almost won) = ~64 tiles across (nearly clear)
  const ladder = [0, 64, 48, 36, 28, 22, 16, 12, 8, 4];
  return ladder[Math.min(level, ladder.length - 1)];
}

// Legacy — given a canvas size, return the block size in pixels.
function blockSizeForLevel(level, canvasSize = 560) {
  const tiles = tileCountForLevel(level);
  if (tiles <= 0) return 1;
  return canvasSize / tiles;
}

window.APHYDLE_ENGINE = { HINT_SCHEDULE, getHints, buildHint, blockSizeForLevel, tileCountForLevel };
