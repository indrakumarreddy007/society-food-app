import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Lazily create the client only when needed and configured
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

/** @deprecated Use getSupabaseClient() instead */
export const supabase = {
  auth: {
    signInWithOtp: (args: Parameters<ReturnType<typeof createClient>["auth"]["signInWithOtp"]>[0]) =>
      getSupabaseClient().auth.signInWithOtp(args),
    verifyOtp: (args: Parameters<ReturnType<typeof createClient>["auth"]["verifyOtp"]>[0]) =>
      getSupabaseClient().auth.verifyOtp(args),
  },
};
