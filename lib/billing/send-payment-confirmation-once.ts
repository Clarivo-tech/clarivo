import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSubscriptionConfirmationEmail } from "@/lib/billing/send-confirmation-email";

type BillingRecord = {
  id: string;
  user_id: string;
  organisation_id: string;
  licenses: number;
  confirmation_email_sent_at?: string | null;
};

export async function sendPaymentConfirmationEmailsOnce(
  admin: SupabaseClient,
  table: "billing_subscriptions" | "billing_payments",
  record: BillingRecord,
  params: {
    ownerEmail?: string | null;
    isAddLicenses: boolean;
  }
): Promise<void> {
  if (record.confirmation_email_sent_at) {
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[billing] Payment emails skipped: RESEND_API_KEY is not set.");
    return;
  }

  try {
    await sendSubscriptionConfirmationEmail(admin, {
      userId: record.user_id,
      organisationId: record.organisation_id,
      ownerEmail: params.ownerEmail,
      licenses: record.licenses,
      isAddLicenses: params.isAddLicenses,
    });

    await admin
      .from(table)
      .update({
        confirmation_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id)
      .is("confirmation_email_sent_at", null);
  } catch (error) {
    console.error("[billing] Payment confirmation emails failed:", error);
  }
}
