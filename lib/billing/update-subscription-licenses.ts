import type { SupabaseClient, User } from "@supabase/supabase-js";
import { licensesToAmountPence } from "@/lib/billing/constants";
import { activateOrganisationLicenses } from "@/lib/billing/activate-licenses";
import {
  createSubscriptionCheckoutSession,
  findActiveStripeSubscriptionForOrganisation,
  findOrCreateStripeCustomer,
  getStripePriceId,
  subscriptionQuantity,
  updateStripeSubscriptionQuantity,
} from "@/lib/billing/stripe";
import type { OrgContext } from "@/lib/team/types";

type BillingSubscriptionRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  licenses: number;
  status: string;
};

export type UpdateSubscriptionLicensesResult =
  | {
      ok: true;
      mode: "subscription_updated";
      currentLicenses: number;
      newTotal: number;
    }
  | {
      ok: true;
      mode: "checkout";
      checkoutUrl: string;
      sessionId: string;
      merchantReference: string;
      currentLicenses: number;
      newTotal: number;
      additionalLicenses: number;
    }
  | { ok: false; status: number; error: string };

async function updateActiveStripeSubscription(
  billingDb: SupabaseClient,
  params: {
    subscription: BillingSubscriptionRow;
    newTotal: number;
    ownerEmail?: string | null;
  }
): Promise<{ error?: string }> {
  if (!params.subscription.stripe_subscription_id) {
    return {
      error:
        "This workspace uses a legacy billing provider. Contact hello@clarivo-tech.com to migrate to Stripe.",
    };
  }

  try {
    const updated = await updateStripeSubscriptionQuantity({
      subscriptionId: params.subscription.stripe_subscription_id,
      quantity: params.newTotal,
    });

    const now = new Date().toISOString();
    const { error } = await billingDb
      .from("billing_subscriptions")
      .update({
        licenses: params.newTotal,
        amount_pence: licensesToAmountPence(params.newTotal),
        stripe_status: updated.status,
        updated_at: now,
      })
      .eq("id", params.subscription.id);

    if (error) {
      return { error: error.message };
    }

    const activation = await activateOrganisationLicenses(billingDb, {
      organisationId: params.subscription.organisation_id,
      ownerUserId: params.subscription.user_id,
      ownerEmail: params.ownerEmail,
      licenses: params.newTotal,
    });

    if (activation.error) {
      return { error: activation.error };
    }

    return {};
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not update Stripe subscription.";
    return { error: message };
  }
}

async function linkStripeSubscriptionToRow(
  billingDb: SupabaseClient,
  row: BillingSubscriptionRow,
  stripeSubscriptionId: string,
  stripeStatus: string
): Promise<BillingSubscriptionRow> {
  const now = new Date().toISOString();
  await billingDb
    .from("billing_subscriptions")
    .update({
      stripe_subscription_id: stripeSubscriptionId,
      stripe_status: stripeStatus,
      updated_at: now,
    })
    .eq("id", row.id);

  return { ...row, stripe_subscription_id: stripeSubscriptionId };
}

async function startNewSubscriptionCheckout(
  params: {
    request: Request;
    billingDb: SupabaseClient;
    user: User;
    context: OrgContext;
    newTotal: number;
    isAddLicenses: boolean;
  }
): Promise<UpdateSubscriptionLicensesResult> {
  const merchantReference = `clarivo-sub-${params.context.organisationId}-${crypto.randomUUID()}`;
  const priceId = getStripePriceId();

  const { error: insertError } = await params.billingDb
    .from("billing_subscriptions")
    .insert({
      organisation_id: params.context.organisationId,
      user_id: params.user.id,
      merchant_reference: merchantReference,
      stripe_price_id: priceId,
      licenses: params.newTotal,
      amount_pence: licensesToAmountPence(params.newTotal),
      currency: "GBP",
      status: "pending",
    });

  if (insertError) {
    return { ok: false, status: 500, error: insertError.message };
  }

  try {
    const customer = await findOrCreateStripeCustomer({
      email: params.user.email ?? "",
      name: params.user.user_metadata?.full_name as string | undefined,
      organisationId: params.context.organisationId,
      userId: params.user.id,
    });

    const session = await createSubscriptionCheckoutSession({
      request: params.request,
      customerId: customer.id,
      licenses: params.newTotal,
      merchantReference,
      organisationId: params.context.organisationId,
      userId: params.user.id,
      addLicensesMode: params.isAddLicenses,
      currentLicenses: Math.max(1, params.context.seatLimit),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await params.billingDb
      .from("billing_subscriptions")
      .update({
        stripe_customer_id: customer.id,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return {
      ok: true,
      mode: "checkout",
      checkoutUrl: session.url,
      sessionId: session.id,
      merchantReference,
      currentLicenses: Math.max(1, params.context.seatLimit),
      newTotal: params.newTotal,
      additionalLicenses:
        params.newTotal - Math.max(1, params.context.seatLimit),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start subscription checkout.";
    await params.billingDb
      .from("billing_subscriptions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("merchant_reference", merchantReference);

    return { ok: false, status: 502, error: message };
  }
}

export async function updateSubscriptionLicenses(params: {
  request: Request;
  billingDb: SupabaseClient;
  user: User;
  context: OrgContext;
  newTotal: number;
  ownerEmail?: string | null;
}): Promise<UpdateSubscriptionLicensesResult> {
  const currentTotal = Math.max(1, params.context.seatLimit);
  if (params.newTotal <= currentTotal) {
    return {
      ok: false,
      status: 400,
      error: `Choose more than your current ${currentTotal} license${currentTotal === 1 ? "" : "s"}.`,
    };
  }

  let { data: activeSub } = await params.billingDb
    .from("billing_subscriptions")
    .select("*")
    .eq("organisation_id", params.context.organisationId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSub && !activeSub.stripe_subscription_id && params.user.email) {
    const remote = await findActiveStripeSubscriptionForOrganisation({
      organisationId: params.context.organisationId,
      email: params.user.email,
    });

    if (remote) {
      activeSub = await linkStripeSubscriptionToRow(
        params.billingDb,
        activeSub as BillingSubscriptionRow,
        remote.id,
        remote.status
      );
    }
  }

  if (activeSub?.stripe_subscription_id) {
    const updateResult = await updateActiveStripeSubscription(params.billingDb, {
      subscription: activeSub as BillingSubscriptionRow,
      newTotal: params.newTotal,
      ownerEmail: params.ownerEmail,
    });

    if (updateResult.error) {
      return { ok: false, status: 502, error: updateResult.error };
    }

    return {
      ok: true,
      mode: "subscription_updated",
      currentLicenses: currentTotal,
      newTotal: params.newTotal,
    };
  }

  if (!activeSub && params.user.email) {
    const remote = await findActiveStripeSubscriptionForOrganisation({
      organisationId: params.context.organisationId,
      email: params.user.email,
    });

    if (remote) {
      const priceId = getStripePriceId();
      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await params.billingDb
        .from("billing_subscriptions")
        .insert({
          organisation_id: params.context.organisationId,
          user_id: params.user.id,
          merchant_reference: `clarivo-sub-recover-${params.context.organisationId}-${crypto.randomUUID()}`,
          stripe_price_id: priceId,
          stripe_subscription_id: remote.id,
          stripe_status: remote.status,
          licenses: subscriptionQuantity(remote),
          amount_pence: licensesToAmountPence(subscriptionQuantity(remote)),
          currency: "GBP",
          status: "active",
          activated_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (!insertError && inserted) {
        activeSub = inserted;
        const updateResult = await updateActiveStripeSubscription(params.billingDb, {
          subscription: inserted as BillingSubscriptionRow,
          newTotal: params.newTotal,
          ownerEmail: params.ownerEmail,
        });

        if (updateResult.error) {
          return { ok: false, status: 502, error: updateResult.error };
        }

        return {
          ok: true,
          mode: "subscription_updated",
          currentLicenses: currentTotal,
          newTotal: params.newTotal,
        };
      }
    }
  }

  return startNewSubscriptionCheckout({
    ...params,
    isAddLicenses: true,
  });
}
