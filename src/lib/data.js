// Data layer. Supabase-first with a hardcoded local fallback so the app
// still works in a fresh checkout without any environment configured.
//
// All exported functions are async. They never throw — on any failure
// (network, RLS, missing schema) they return the local fallback so the
// UI never breaks.

import { supabase, isSupabaseConfigured } from "./supabase.js";
import {
  DAILY_PLANTS,
  GUESSABLE,
  ANSWER_PLANT,
} from "../data/plants.js";
import { getPuzzleNumber, getDailyAnswer } from "../engine/game.js";
import { getInstallEpoch } from "./storage.js";

// `supabase.schema('aphydle')` scopes the PostgREST request to the
// non-public schema where Aphydle's tables live. Requires the schema
// to be exposed via PGRST_DB_SCHEMAS in the project settings.
function aph() {
  if (!isSupabaseConfigured) return null;
  if (typeof supabase.schema === "function") return supabase.schema("aphydle");
  return supabase;
}

function todayDateUtc(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rowToPlant(r) {
  if (!r) return null;
  return {
    id: r.id,
    commonName: r.common_name,
    scientificName: r.scientific_name,
    family: r.family,
    habitat: r.habitat,
    growthForm: r.growth_form,
    foliage: r.foliage,
    careLevel: r.care_level,
    lightNeeds: r.light_needs,
    nativeRegion: r.native_region,
    toxicity: r.toxicity,
    dominantColors: Array.isArray(r.dominant_colors) ? r.dominant_colors : [],
    imageUrl: r.image_url,
    fact: r.fact,
    commonMisguess: r.common_misguess || null,
  };
}

function rowToGuessable(r) {
  return {
    id: r.id,
    name: r.name,
    family: r.family,
    habitat: r.habitat,
    growthForm: r.growth_form,
    foliage: r.foliage,
    lightNeeds: r.light_needs,
    nativeRegion: r.native_region,
    toxicity: r.toxicity,
  };
}

function localDailyPuzzle(now) {
  const epoch = getInstallEpoch() || todayDateUtc(now);
  const puzzleNo = getPuzzleNumber(now, epoch);
  const plant = getDailyAnswer(puzzleNo, DAILY_PLANTS) || ANSWER_PLANT;
  return { puzzleNo, plant, source: "local" };
}

export async function loadDailyPuzzle(now = new Date()) {
  if (!isSupabaseConfigured) return localDailyPuzzle(now);
  try {
    const today = todayDateUtc(now);
    const { data, error } = await aph()
      .from("daily_puzzles")
      .select("puzzle_no, puzzle_date, plant:plants(*)")
      .eq("puzzle_date", today)
      .maybeSingle();
    if (error || !data || !data.plant) return localDailyPuzzle(now);
    return {
      puzzleNo: data.puzzle_no,
      plant: rowToPlant(data.plant),
      source: "supabase",
    };
  } catch {
    return localDailyPuzzle(now);
  }
}

function localSearch(q) {
  const lower = q.toLowerCase();
  return GUESSABLE.filter((p) => p.name.toLowerCase().includes(lower)).slice(0, 6);
}

export async function searchGuessable(q, { signal } = {}) {
  const trimmed = (q || "").trim();
  if (!trimmed) return [];
  if (!isSupabaseConfigured) return localSearch(trimmed);
  try {
    let builder = aph()
      .from("guessable_plants")
      .select("*")
      .ilike("name", `%${trimmed}%`)
      .order("name", { ascending: true })
      .limit(6);
    if (signal && typeof builder.abortSignal === "function") {
      builder = builder.abortSignal(signal);
    }
    const { data, error } = await builder;
    if (error || !Array.isArray(data) || data.length === 0) {
      return localSearch(trimmed);
    }
    return data.map(rowToGuessable);
  } catch {
    return localSearch(trimmed);
  }
}

export async function loadDistribution(puzzleNo) {
  if (!isSupabaseConfigured || !puzzleNo) return null;
  try {
    const { data, error } = await aph()
      .from("daily_distribution")
      .select("*")
      .eq("puzzle_no", puzzleNo)
      .maybeSingle();
    if (error || !data) return null;
    return [
      data.bucket_1 || 0,
      data.bucket_2 || 0,
      data.bucket_3 || 0,
      data.bucket_4 || 0,
      data.bucket_5 || 0,
      data.bucket_6 || 0,
      data.bucket_7 || 0,
      data.bucket_8 || 0,
      data.bucket_9 || 0,
      data.bucket_10 || 0,
      data.bucket_lost || 0,
    ];
  } catch {
    return null;
  }
}

export async function submitResult(puzzleNo, outcome, guessCount) {
  if (!isSupabaseConfigured) return false;
  try {
    const userResp = await supabase.auth.getUser();
    const user = userResp?.data?.user;
    if (!user) return false;
    const { error } = await aph().from("puzzle_results").insert({
      puzzle_no: puzzleNo,
      player_id: user.id,
      outcome,
      guess_count: guessCount,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadRecentPuzzles(limit = 12) {
  if (!isSupabaseConfigured) return null;
  try {
    const today = todayDateUtc(new Date());
    const { data, error } = await aph()
      .from("daily_puzzles")
      .select("puzzle_no, puzzle_date, plant:plants(id, common_name, image_url)")
      .lte("puzzle_date", today)
      .order("puzzle_date", { ascending: false })
      .limit(limit);
    if (error || !Array.isArray(data)) return null;
    return data.map((d) => ({
      puzzleNo: d.puzzle_no,
      date: d.puzzle_date,
      plantId: d.plant?.id,
      name: d.plant?.common_name,
      imageUrl: d.plant?.image_url,
    }));
  } catch {
    return null;
  }
}
