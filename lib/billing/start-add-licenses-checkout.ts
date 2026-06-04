import type { SupabaseClient, User } from "@supabase/supabase-js";
import { licensesToAmountPence } from "@/lib/billing/constants";
import {
  createRevolutCheckoutOrder,
  getRevolutRedirectBaseUrl,
} from "@/lib/billing/revolut";
import type { OrgContext } from "@/lib/team/types";

export async function startAddLicensesCheckout(params: {
  request: Request;
  billingDb: SupabaseClient;
  user: User;
  context: OrgContext;
  newTotal: number;
}): Promise<
  | {
      ok: true;
      checkoutUrl: string;
      orderId: string;
      merchantReference: string;
      currentLicenses: number;
      newTotal: number;
      additionalLicenses: number;
    }
  | { ok: false; status: number; error: string }
> {
  const currentTotal = Math.max(1, params.context.seatLimit);
  if (params.newTotal <= currentTotal) {
    return {
      ok: false,
      status: 400,
      error: `Choose more than your current ${currentTotal} license${currentTotal === 1 ? "" : "s"}.`,
    };
  }

  const additional = params.newTotal - currentTotal;
  const amountPence = licensesToAmountPence(additional);
  const merchantReference = `clarivo-add-${params.context.organisationId}-${crypto.randomUUID()}`;
  const appBase = getRevolutRedirectBaseUrl(params.request);
  const redirectUrl = `${appBase}/dashboard/team?billing=success`;

  const { error: insertError } = await params.billingDb.from("billing_payments").insert({
    organisation_id: params.context.organisationId,
    user_id: params.user.id,
    merchant_reference: merchantReference,
    licenses: params.newTotal,
    amount_pence: amountPence,
    currency: "GBP",
    status: "pending",
  });

  if (insertError) {
    return { ok: false, status: 500, error: insertError.message };
  }

  try {
    const order = await createRevolutCheckoutOrder({
      amountPence,
      currency: "GBP",
      description: `Clarivo Pro — ${additional} additional license${additional === 1 ? "" : "s"} (${params.newTotal} total)`,
      customerEmail: params.user.email ?? "",
      merchantReference,
      licenses: additional,
      redirectUrl,
    });

    if (!order.checkout_url || !order.id) {
      await params.billingDb
        .from("billing_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("merchant_reference", merchantReference);

      return {
        ok: false,
        status: 502,
        error: "Revolut did not return a checkout URL.",
      };
    }

    await params.billingDb
      .from("billing_payments")
      .update({
        revolut_order_id: order.id,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return {
      ok: true,
      checkoutUrl: order.checkout_url,
      orderId: order.id,
      merchantReference,
      currentLicenses: currentTotal,
      newTotal: params.newTotal,
      additionalLicenses: additional,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create checkout.";
    await params.billingDb
      .from("billing_payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return { ok: false, status: 502, error: message };
  }
}
