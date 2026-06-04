import { createAdminClient } from "@/lib/supabase/admin";

/** Mark all active members of a Pro org as subscription active (one-off / admin repair). */
export async function syncOrgMemberSubscriptionStatus(
  organisationId: string
): Promise<{ updated: number; error?: string }> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organisations")
    .select("plan")
    .eq("id", organisationId)
    .maybeSingle();

  if ((org?.plan ?? "").toLowerCase() !== "pro") {
    return { updated: 0, error: "Organisation is not on Pro." };
  }

  const { data: members } = await admin
    .from("organisation_members")
    .select("user_id")
    .eq("organisation_id", organisationId)
    .eq("status", "active");

  const userIds = (members ?? [])
    .map((m) => m.user_id as string | null)
    .filter((id): id is string => Boolean(id));

  if (userIds.length === 0) {
    return { updated: 0 };
  }

  const { error } = await admin
    .from("user_preferences")
    .update({
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .in("user_id", userIds);

  if (error) {
    return { updated: 0, error: error.message };
  }

  return { updated: userIds.length };
}
