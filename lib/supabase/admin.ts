import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function buildAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Service-role client for cron, invites, and admin-only flows. */
export function createAdminClient(): SupabaseClient {
  return buildAdminClient();
}

/** Returns null when SUPABASE_SERVICE_ROLE_KEY is not set (team page uses session fallback). */
export function tryCreateAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  return buildAdminClient();
}
