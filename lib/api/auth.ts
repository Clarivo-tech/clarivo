import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { resolveEffectiveUserId } from "@/lib/admin/impersonation";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedRequest = {
  supabase: SupabaseClient;
  user: User;
  effectiveUserId: string;
  dataSupabase: SupabaseClient;
  impersonating: boolean;
};

export function resolveAuthContext(auth: AuthenticatedRequest) {
  return {
    userId: auth.effectiveUserId,
    db: auth.dataSupabase,
    impersonating: auth.impersonating,
  };
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      effectiveUserId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id, user.email);
  const impersonating = effectiveUserId !== user.id;
  const dataSupabase = impersonating
    ? (tryCreateAdminClient() ?? supabase)
    : supabase;

  return {
    supabase,
    user,
    effectiveUserId,
    dataSupabase,
    impersonating,
    response: null,
  };
}
