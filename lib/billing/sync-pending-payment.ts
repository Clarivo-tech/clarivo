import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { syncLatestPendingSubscriptionForUser } from "@/lib/billing/sync-pending-subscription";

export async function syncLatestPendingPaymentForUser(
  userId: string,
  organisationId: string,
  ownerEmail?: string | null,
  sessionClient?: SupabaseClient
): Promise<{ fulfilled: boolean; error?: string }> {
  return syncLatestPendingSubscriptionForUser(
    userId,
    organisationId,
    ownerEmail,
    sessionClient
  );
}
