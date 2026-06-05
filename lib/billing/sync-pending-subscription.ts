import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { fulfillBillingSubscription } from "@/lib/billing/fulfill-subscription";
import { sendPaymentConfirmationEmailsOnce } from "@/lib/billing/send-payment-confirmation-once";

export async function syncLatestPendingSubscriptionForUser(
  userId: string,
  organisationId: string,
  ownerEmail?: string | null,
  sessionClient?: SupabaseClient
): Promise<{ fulfilled: boolean; error?: string }> {
  const admin = tryCreateAdminClient();
  const db = admin ?? sessionClient;

  if (!db) {
    return {
      fulfilled: false,
      error:
        "Server configuration incomplete. Add SUPABASE_SERVICE_ROLE_KEY to your environment and restart the app.",
    };
  }

  const { data: subscription, error } = await db
    .from("billing_subscriptions")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { fulfilled: false, error: error.message };
  }

  if (!subscription) {
    return { fulfilled: false };
  }

  if (subscription.status === "active") {
    if (admin) {
      await sendPaymentConfirmationEmailsOnce(admin, "billing_subscriptions", subscription, {
        ownerEmail,
        isAddLicenses: false,
      });
    }
    return { fulfilled: false };
  }

  if (subscription.status !== "pending") {
    return { fulfilled: false };
  }

  return fulfillBillingSubscription(db, subscription, { ownerEmail });
}
