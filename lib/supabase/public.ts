import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Anonymous Supabase client for public routes (e.g. demo booking). */
export function createPublicSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
