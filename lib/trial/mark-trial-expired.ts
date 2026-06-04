import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureTrialExpiryNotifications } from "@/lib/trial/notify-trial-expired";

export async function markTrialExpired(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const sent = await ensureTrialExpiryNotifications(userId);
  if (sent) {
    return;
  }

  await supabase
    .from("user_preferences")
    .update({
      subscription_status: "expired",
      trial_used: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .in("subscription_status", ["trial"]);
}
