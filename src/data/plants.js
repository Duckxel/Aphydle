// Aphydle plant catalog. In production these can come from Supabase.

// DAILY_PLANTS — answer-side records for the daily rotation. Each id must
// also exist in GUESSABLE so the autocomplete includes the answer.
export const DAILY_PLANTS = [
  {
    id: "monstera-deliciosa",
    commonName: "Monstera deliciosa",
    scientificName: "Monstera deliciosa",
    family: "Araceae",
    habitat: "Tropical rainforest",
    growthForm: "Vine",
    foliage: "Variegated",
    careLevel: 2,
    lightNeeds: "Bright indirect",
    nativeRegion: "Central America",
    toxicity: "Mildly toxic",
    dominantColors: ["deep green", "creamy variegation"],
    imageUrl:
      "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=1400&q=85&auto=format&fit=crop",
    fact:
      "Native to the cloud forests of southern Mexico, where it climbs trees using aerial roots that can grow up to 10 metres long. Its iconic leaf fenestrations are thought to let storm winds pass through the canopy.",
    commonMisguess: { name: "Monstera adansonii", percent: 63 },
  },
  {
    id: "ficus-lyrata",
    commonName: "Fiddle-leaf Fig",
    scientificName: "Ficus lyrata",
    family: "Moraceae",
    habitat: "Tropical rainforest",
    growthForm: "Tree",
    foliage: "Solid green",
    careLevel: 4,
    lightNeeds: "Bright direct",
    nativeRegion: "West Africa",
    toxicity: "Mildly toxic",
    dominantColors: ["glossy green", "deep emerald"],
    imageUrl:
      "https://images.unsplash.com/photo-1581793745862-99fde7fa73ce?w=1400&q=85&auto=format&fit=crop",
    fact:
      "In its native lowland forests of western Africa it grows as a strangler fig, germinating in the canopy and sending roots downward until it engulfs its host tree. The lyre-shaped leaves are how it earned its common name.",
    commonMisguess: { name: "Ficus elastica", percent: 41 },
  },
  {
    id: "pilea-peperomioides",
    commonName: "Pilea peperomioides",
    scientificName: "Pilea peperomioides",
    family: "Urticaceae",
    habitat: "Subtropical",
    growthForm: "Herbaceous",
    foliage: "Solid green",
    careLevel: 1,
    lightNeeds: "Bright indirect",
    nativeRegion: "East Asia",
    toxicity: "Pet-safe",
    dominantColors: ["mid green", "silver shimmer"],
    imageUrl:
      "https://images.unsplash.com/photo-1604762512526-b7068fe1eb44?w=1400&q=85&auto=format&fit=crop",
    fact:
      "Brought from the Yunnan province of China to Norway in the 1940s by a missionary, it spread across Scandinavia hand-to-hand among friends long before it reached commercial cultivation — earning the nickname 'Friendship Plant'.",
    commonMisguess: { name: "Peperomia obtusifolia", percent: 38 },
  },
  {
    id: "strelitzia-reginae",
    commonName: "Bird of Paradise",
    scientificName: "Strelitzia reginae",
    family: "Strelitziaceae",
    habitat: "Subtropical",
    growthForm: "Tree",
    foliage: "Solid green",
    careLevel: 3,
    lightNeeds: "Bright direct",
    nativeRegion: "Southern Africa",
    toxicity: "Mildly toxic",
    dominantColors: ["forest green", "tangerine bract"],
    imageUrl:
      "https://images.unsplash.com/photo-1597055181449-b3974c50d6f0?w=1400&q=85&auto=format&fit=crop",
    fact:
      "The flower's beak-and-crest profile evolved to perch sunbirds: when a bird lands, the bract opens like a hinge and dusts pollen onto its feet. The bloom only opens once it has been visited.",
    commonMisguess: { name: "Strelitzia nicolai", percent: 52 },
  },
  {
    id: "sansevieria-trifasciata",
    commonName: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    family: "Asparagaceae",
    habitat: "Arid",
    growthForm: "Succulent",
    foliage: "Variegated",
    careLevel: 1,
    lightNeeds: "Low to bright",
    nativeRegion: "West Africa",
    toxicity: "Mildly toxic",
    dominantColors: ["dusty green", "ivory edge"],
    imageUrl:
      "https://images.unsplash.com/photo-1593482892290-f54927ae1bb6?w=1400&q=85&auto=format&fit=crop",
    fact:
      "One of the very few household plants that performs CAM photosynthesis — it locks open its stomata at night to capture CO₂, which is also why it's repeatedly studied for measurable indoor-air filtering.",
    commonMisguess: { name: "Dracaena marginata", percent: 29 },
  },
  {
    id: "calathea-orbifolia",
    commonName: "Calathea orbifolia",
    scientificName: "Goeppertia orbifolia",
    family: "Marantaceae",
    habitat: "Tropical rainforest",
    growthForm: "Herbaceous",
    foliage: "Variegated",
    careLevel: 4,
    lightNeeds: "Medium",
    nativeRegion: "South America",
    toxicity: "Pet-safe",
    dominantColors: ["sage green", "silver banding"],
    imageUrl:
      "https://images.unsplash.com/photo-1620503374956-c942862f0372?w=1400&q=85&auto=format&fit=crop",
    fact:
      "Each evening the leaves rise toward vertical and the petioles twist — a circadian movement called nyctinasty, driven by water pressure changes in a swollen joint at the leaf base called the pulvinus.",
    commonMisguess: { name: "Calathea lancifolia", percent: 47 },
  },
  {
    id: "zz-plant",
    commonName: "ZZ Plant",
    scientificName: "Zamioculcas zamiifolia",
    family: "Araceae",
    habitat: "Subtropical",
    growthForm: "Herbaceous",
    foliage: "Solid green",
    careLevel: 1,
    lightNeeds: "Low to bright",
    nativeRegion: "East Africa",
    toxicity: "Highly toxic",
    dominantColors: ["lacquered green"],
    imageUrl:
      "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=1400&q=85&auto=format&fit=crop",
    fact:
      "The thickened underground rhizomes act as water reservoirs, letting the plant survive months of drought in the dry forests of Tanzania and Kenya — and explaining why over-watering is the only common way to kill it.",
    commonMisguess: { name: "Philodendron hastatum", percent: 22 },
  },
];

// Backwards-compatible default export for the very first puzzle.
export const ANSWER_PLANT = DAILY_PLANTS[0];


export const GUESSABLE = [
  { id: "monstera-deliciosa", name: "Monstera deliciosa", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Variegated", lightNeeds: "Bright indirect", nativeRegion: "Central America", toxicity: "Mildly toxic" },
  { id: "monstera-adansonii", name: "Monstera adansonii", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "Central America", toxicity: "Mildly toxic" },
  { id: "philodendron-brasil", name: "Philodendron Brasil", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Variegated", lightNeeds: "Bright indirect", nativeRegion: "South America", toxicity: "Mildly toxic" },
  { id: "philodendron-gloriosum", name: "Philodendron gloriosum", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Crawler", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "South America", toxicity: "Mildly toxic" },
  { id: "epipremnum-aureum", name: "Pothos (Epipremnum aureum)", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Variegated", lightNeeds: "Low to bright", nativeRegion: "Southeast Asia", toxicity: "Mildly toxic" },
  { id: "rhaphidophora-tetrasperma", name: "Rhaphidophora tetrasperma", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "Southeast Asia", toxicity: "Mildly toxic" },
  { id: "scindapsus-pictus", name: "Scindapsus pictus", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "Southeast Asia", toxicity: "Mildly toxic" },
  { id: "anthurium-clarinervium", name: "Anthurium clarinervium", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "Central America", toxicity: "Mildly toxic" },
  { id: "alocasia-polly", name: "Alocasia 'Polly'", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Bright indirect", nativeRegion: "Southeast Asia", toxicity: "Highly toxic" },
  { id: "syngonium-podophyllum", name: "Syngonium podophyllum", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "Central America", toxicity: "Mildly toxic" },
  { id: "ficus-lyrata", name: "Fiddle-leaf Fig (Ficus lyrata)", family: "Moraceae", habitat: "Tropical rainforest", growthForm: "Tree", foliage: "Solid green", lightNeeds: "Bright direct", nativeRegion: "West Africa", toxicity: "Mildly toxic" },
  { id: "ficus-elastica", name: "Rubber Plant (Ficus elastica)", family: "Moraceae", habitat: "Tropical rainforest", growthForm: "Tree", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "Southeast Asia", toxicity: "Mildly toxic" },
  { id: "calathea-orbifolia", name: "Calathea orbifolia", family: "Marantaceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "South America", toxicity: "Pet-safe" },
  { id: "maranta-leuconeura", name: "Prayer Plant (Maranta leuconeura)", family: "Marantaceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "South America", toxicity: "Pet-safe" },
  { id: "strelitzia-reginae", name: "Bird of Paradise", family: "Strelitziaceae", habitat: "Subtropical", growthForm: "Tree", foliage: "Solid green", lightNeeds: "Bright direct", nativeRegion: "Southern Africa", toxicity: "Mildly toxic" },
  { id: "dracaena-marginata", name: "Dracaena marginata", family: "Asparagaceae", habitat: "Subtropical", growthForm: "Tree", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "Madagascar", toxicity: "Mildly toxic" },
  { id: "sansevieria-trifasciata", name: "Snake Plant", family: "Asparagaceae", habitat: "Arid", growthForm: "Succulent", foliage: "Variegated", lightNeeds: "Low to bright", nativeRegion: "West Africa", toxicity: "Mildly toxic" },
  { id: "zz-plant", name: "ZZ Plant (Zamioculcas zamiifolia)", family: "Araceae", habitat: "Subtropical", growthForm: "Herbaceous", foliage: "Solid green", lightNeeds: "Low to bright", nativeRegion: "East Africa", toxicity: "Highly toxic" },
  { id: "spathiphyllum", name: "Peace Lily (Spathiphyllum)", family: "Araceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Solid green", lightNeeds: "Low to medium", nativeRegion: "Central America", toxicity: "Mildly toxic" },
  { id: "chlorophytum", name: "Spider Plant", family: "Asparagaceae", habitat: "Subtropical", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Bright indirect", nativeRegion: "Southern Africa", toxicity: "Pet-safe" },
  { id: "hoya-carnosa", name: "Hoya carnosa", family: "Apocynaceae", habitat: "Tropical rainforest", growthForm: "Vine", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "Southeast Asia", toxicity: "Pet-safe" },
  { id: "begonia-maculata", name: "Begonia maculata", family: "Begoniaceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Bright indirect", nativeRegion: "South America", toxicity: "Highly toxic" },
  { id: "peperomia-watermelon", name: "Watermelon Peperomia", family: "Piperaceae", habitat: "Tropical rainforest", growthForm: "Herbaceous", foliage: "Variegated", lightNeeds: "Medium", nativeRegion: "South America", toxicity: "Pet-safe" },
  { id: "echeveria-elegans", name: "Echeveria elegans", family: "Crassulaceae", habitat: "Arid", growthForm: "Succulent", foliage: "Solid green", lightNeeds: "Bright direct", nativeRegion: "Central America", toxicity: "Pet-safe" },
  { id: "aloe-vera", name: "Aloe vera", family: "Asphodelaceae", habitat: "Arid", growthForm: "Succulent", foliage: "Solid green", lightNeeds: "Bright direct", nativeRegion: "Arabian Peninsula", toxicity: "Mildly toxic" },
  { id: "crassula-ovata", name: "Jade Plant (Crassula ovata)", family: "Crassulaceae", habitat: "Arid", growthForm: "Succulent", foliage: "Solid green", lightNeeds: "Bright direct", nativeRegion: "Southern Africa", toxicity: "Mildly toxic" },
  { id: "haworthia-fasciata", name: "Haworthia fasciata", family: "Asphodelaceae", habitat: "Arid", growthForm: "Succulent", foliage: "Variegated", lightNeeds: "Bright indirect", nativeRegion: "Southern Africa", toxicity: "Pet-safe" },
  { id: "schefflera-arboricola", name: "Schefflera arboricola", family: "Araliaceae", habitat: "Subtropical", growthForm: "Tree", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "East Asia", toxicity: "Mildly toxic" },
  { id: "nephrolepis-exaltata", name: "Boston Fern", family: "Nephrolepidaceae", habitat: "Tropical rainforest", growthForm: "Fern", foliage: "Solid green", lightNeeds: "Medium", nativeRegion: "Central America", toxicity: "Pet-safe" },
  { id: "asplenium-nidus", name: "Bird's Nest Fern", family: "Aspleniaceae", habitat: "Tropical rainforest", growthForm: "Fern", foliage: "Solid green", lightNeeds: "Medium", nativeRegion: "Southeast Asia", toxicity: "Pet-safe" },
  { id: "pilea-peperomioides", name: "Pilea peperomioides", family: "Urticaceae", habitat: "Subtropical", growthForm: "Herbaceous", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "East Asia", toxicity: "Pet-safe" },
  { id: "oxalis-triangularis", name: "Oxalis triangularis", family: "Oxalidaceae", habitat: "Subtropical", growthForm: "Herbaceous", foliage: "Solid green", lightNeeds: "Bright indirect", nativeRegion: "South America", toxicity: "Mildly toxic" },
];

export const COMPARE_COLUMNS = [
  { key: "family", label: "Family" },
  { key: "habitat", label: "Habitat" },
  { key: "growthForm", label: "Growth" },
  { key: "foliage", label: "Foliage" },
  { key: "lightNeeds", label: "Light" },
  { key: "nativeRegion", label: "Native to" },
  { key: "toxicity", label: "Toxicity" },
];

export const ARCHIVE = [
  { no: 142, date: "WED 26 APR", name: "Monstera deliciosa", img: ANSWER_PLANT.imageUrl, you: "today", winRate: null },
  { no: 141, date: "TUE 25 APR", name: "Ficus lyrata", img: "https://images.unsplash.com/photo-1581793745862-99fde7fa73ce?w=800&q=80&auto=format&fit=crop", you: "won", guesses: 3, winRate: 78 },
  { no: 140, date: "MON 24 APR", name: "Pilea peperomioides", img: "https://images.unsplash.com/photo-1604762512526-b7068fe1eb44?w=800&q=80&auto=format&fit=crop", you: "won", guesses: 5, winRate: 64 },
  { no: 139, date: "SUN 23 APR", name: "Bird of Paradise", img: "https://images.unsplash.com/photo-1597055181449-b3974c50d6f0?w=800&q=80&auto=format&fit=crop", you: "won", guesses: 4, winRate: 71 },
  { no: 138, date: "SAT 22 APR", name: "Welwitschia mirabilis", img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&auto=format&fit=crop", you: "lost", guesses: 10, winRate: 3 },
  { no: 137, date: "FRI 21 APR", name: "Calathea orbifolia", img: "https://images.unsplash.com/photo-1620503374956-c942862f0372?w=800&q=80&auto=format&fit=crop", you: "won", guesses: 6, winRate: 52 },
  { no: 136, date: "THU 20 APR", name: "Snake Plant", img: "https://images.unsplash.com/photo-1593482892290-f54927ae1bb6?w=800&q=80&auto=format&fit=crop", you: "won", guesses: 2, winRate: 88 },
  { no: 135, date: "WED 19 APR", name: "ZZ Plant", img: "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=800&q=80&auto=format&fit=crop", you: "won", guesses: 3, winRate: 81 },
];

export const TODAY_DISTRIBUTION = [12, 84, 312, 641, 783, 580, 327, 198, 102, 58, 30];

export const STATS = {
  played: 142,
  won: 118,
  winPct: 83,
  currentStreak: 12,
  maxStreak: 31,
  meanGuesses: 4.6,
  distribution: [4, 12, 28, 35, 22, 11, 4, 1, 1, 0, 24],
  heatmap: Array.from({ length: 90 }, (_, i) => {
    if (i % 17 === 0) return 0;
    if (i % 23 === 0) return 6;
    return 1 + ((i * 7) % 5);
  }),
};
