// Aphydle plant catalog. In production these can come from Supabase.

export const ANSWER_PLANT = {
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
};

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
