import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { fulfillBillingPayment } from "@/lib/billing/fulfill-payment";
import { sendPaymentConfirmationEmailsOnce } from "@/lib/billing/send-payment-confirmation-once";
import { syncLatestPendingSubscriptionForUser } from "@/lib/billing/sync-pending-subscription";

export async function syncLatestPendingPaymentForUser(
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

  const { data: payment, error: paymentError } = await db
    .from("billing_payments")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    return { fulfilled: false, error: paymentError.message };
  }

  if (payment?.status === "pending") {
    return fulfillBillingPayment(db, payment, { ownerEmail });
  }

  const subscriptionResult = await syncLatestPendingSubscriptionForUser(
    userId,
    organisationId,
    ownerEmail,
    sessionClient
  );

  if (subscriptionResult.fulfilled || subscriptionResult.error) {
    return subscriptionResult;
  }

  if (payment?.status === "completed") {
    if (admin) {
      await sendPaymentConfirmationEmailsOnce(admin, "billing_payments", payment, {
        ownerEmail,
        isAddLicenses: payment.merchant_reference.startsWith("clarivo-add-"),
      });
    }
    return { fulfilled: true };
  }

  return { fulfilled: false };
}
