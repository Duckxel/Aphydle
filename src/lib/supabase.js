import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[Aphydle] Supabase env vars missing. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
  );
}

// Aphydle has no sign-in flow — every request goes as the anon role. Disable
// session persistence so a stale `sb-*-auth-token` left over in localStorage
// (e.g. from a prior project that ran on the same origin, or an expired JWT
// from an earlier anon-key rotation) can't override the Authorization header
// and 401 every PostgREST call. With persistSession off, supabase-js always
// uses the anon key as the bearer token.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
