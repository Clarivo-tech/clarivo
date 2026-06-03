import type { SupabaseClient } from "@supabase/supabase-js";
import { activateOrganisationLicenses } from "@/lib/billing/activate-licenses";
import { retrieveRevolutOrder, isRevolutOrderPaid } from "@/lib/billing/revolut";

type BillingPaymentRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  merchant_reference: string;
  revolut_order_id: string | null;
  licenses: number;
  status: string;
};

export async function fulfillBillingPayment(
  admin: SupabaseClient,
  payment: BillingPaymentRow,
  options?: { revolutEvent?: string; ownerEmail?: string | null }
): Promise<{ fulfilled: boolean; error?: string }> {
  if (payment.status === "completed") {
    return { fulfilled: true };
  }

  if (payment.revolut_order_id) {
    try {
      const order = await retrieveRevolutOrder(payment.revolut_order_id);
      if (!isRevolutOrderPaid(order.state)) {
        return { fulfilled: false };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not verify Revolut order.";
      return { fulfilled: false, error: message };
    }
  }

  const { data: owner } = await admin.auth.admin.getUserById(payment.user_id);
  const ownerEmail = options?.ownerEmail ?? owner.user?.email ?? null;

  const activation = await activateOrganisationLicenses(admin, {
    organisationId: payment.organisation_id,
    ownerUserId: payment.user_id,
    ownerEmail,
    licenses: payment.licenses,
  });

  if (activation.error) {
    return { fulfilled: false, error: activation.error };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("billing_payments")
    .update({
      status: "completed",
      revolut_event: options?.revolutEvent ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", payment.id)
    .eq("status", "pending");

  if (updateError) {
    return { fulfilled: false, error: updateError.message };
  }

  return { fulfilled: true };
}
