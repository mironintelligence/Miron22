import { createClient } from "@supabase/supabase-js";

const url = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

/** Vercel’de env boş string olabildiği için trim + ikisi de dolu olmalı */
export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: { "X-Client-Info": "miron-web" },
      },
      db: { schema: "public" },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

export function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase yapılandırması eksik (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  }
  return supabase;
}
