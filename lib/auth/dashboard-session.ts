import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/admin/access";
import { resolveEffectiveUserId } from "@/lib/admin/impersonation";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export async function getDashboardSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const effectiveUserId = await resolveEffectiveUserId(user.id, user.email);
  const impersonating = effectiveUserId !== user.id;
  const dataSupabase = impersonating
    ? (tryCreateAdminClient() ?? supabase)
    : supabase;

  return {
    supabase,
    dataSupabase,
    user,
    effectiveUserId,
    impersonating,
    isPlatformAdmin: isPlatformAdmin(user.email),
  };
}
