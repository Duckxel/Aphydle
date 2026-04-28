// Anonymized product analytics.
//
// The client mints a fresh random uuid every UTC day, persisted to
// localStorage so attempts/results from the same browser-day join to a
// single row, but cross-day correlation is impossible by construction.
// All writes are best-effort: if Supabase isn't configured or a write
// fails, we silently no-op so the game never breaks.

import { supabase, isSupabaseConfigured } from "./supabase.js";

const ANON_KEY_PREFIX = "aphydle:anon:";

function todayUtc(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts: 128 bits of Math.random hex.
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// Returns the anonymous id for the current UTC day. The id is created on
// first call and re-used for the rest of the day. It is never re-emitted
// the next day — a brand-new uuid is generated, so admins cannot link a
// session yesterday to a session today.
export function getDailyAnonId(date = new Date()) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const key = `${ANON_KEY_PREFIX}${todayUtc(date)}`;
  try {
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(key, id);
      // Best-effort: trim yesterday's key so localStorage doesn't grow forever.
      const yesterday = new Date(date.getTime() - 86_400_000);
      window.localStorage.removeItem(`${ANON_KEY_PREFIX}${todayUtc(yesterday)}`);
    }
    return id;
  } catch {
    return null;
  }
}

function aphSchema() {
  if (!isSupabaseConfigured) return null;
  if (typeof supabase.schema === "function") return supabase.schema("aphydle");
  return supabase;
}

let visitTrackedFor = null;
// One log per process per table — analytics fires on every guess, so
// without de-duping a misconfigured project would flood the console.
const loggedFailures = new Set();

function reportFailure(table, error) {
  if (!error || loggedFailures.has(table)) return;
  loggedFailures.add(table);
  // supabase-js doesn't throw on REST 4xx — it returns { error } with the
  // PostgREST body. Surface it once so the actual code/message is visible
  // (e.g. PGRST106 = schema not exposed, PGRST301 = JWT expired, 42501 =
  // RLS / grant). Without this the network tab shows 401 but the page
  // never sees why.
  // eslint-disable-next-line no-console
  console.warn(
    `[Aphydle] aphydle.${table} write rejected by Supabase. ` +
      `code=${error.code || "?"} message=${error.message || "?"}`,
    error,
  );
}

export async function trackVisit(puzzleNo) {
  if (!isSupabaseConfigured) return;
  const anonId = getDailyAnonId();
  if (!anonId) return;
  // One visit per (puzzle, page-load). If puzzleNo flips at midnight
  // rollover the new value gets its own visit row.
  if (visitTrackedFor === puzzleNo) return;
  visitTrackedFor = puzzleNo;
  // Routed through aphydle.record_visit (SECURITY DEFINER) instead of a
  // direct table insert so the call doesn't depend on `anon` holding
  // INSERT on aphydle.page_visits. See supabase/migrations/0003_attempt_rpc.sql.
  try {
    const { error } = await aphSchema().rpc("record_visit", {
      p_anon_id: anonId,
      p_puzzle_no: puzzleNo ?? null,
    });
    if (error) reportFailure("page_visits", error);
  } catch (e) {
    reportFailure("page_visits", e);
  }
}

export async function trackAttempt({ puzzleNo, attemptNo, plantId, isCorrect }) {
  if (!isSupabaseConfigured) return;
  if (puzzleNo == null || !attemptNo) return;
  const anonId = getDailyAnonId();
  if (!anonId) return;
  // Routed through aphydle.record_attempt (SECURITY DEFINER) — the function
  // body runs with the OWNER's privileges, so the upsert succeeds even on
  // databases where the table-level GRANT on aphydle.attempts somehow never
  // landed for `anon` (which is what's been 42501-ing this project despite
  // 0001 and 0002 both granting it). The function still keys on
  // (anon_id, puzzle_no), so each subsequent guess overwrites the same row.
  try {
    const { error } = await aphSchema().rpc("record_attempt", {
      p_anon_id: anonId,
      p_puzzle_no: puzzleNo,
      p_attempt_no: attemptNo,
      p_guess_plant_id: plantId ?? null,
      p_is_correct: !!isCorrect,
    });
    if (error) reportFailure("attempts", error);
  } catch (e) {
    reportFailure("attempts", e);
  }
}
