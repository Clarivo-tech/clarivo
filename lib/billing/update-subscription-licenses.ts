import type { SupabaseClient, User } from "@supabase/supabase-js";
import { licensesToAmountPence } from "@/lib/billing/constants";
import { activateOrganisationLicenses } from "@/lib/billing/activate-licenses";
import { sendAddLicensesNotificationEmails } from "@/lib/billing/send-confirmation-email";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  findActiveStripeSubscriptionForOrganisation,
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
        "We could not find your Stripe subscription. Email hello@clarivo-tech.com and we will link your billing.",
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

async function recoverBillingRowFromStripe(
  billingDb: SupabaseClient,
  params: {
    user: User;
    context: OrgContext;
    remote: Awaited<ReturnType<typeof findActiveStripeSubscriptionForOrganisation>>;
  }
): Promise<BillingSubscriptionRow | null> {
  if (!params.remote) {
    return null;
  }

  const priceId = getStripePriceId();
  const qty = subscriptionQuantity(params.remote);
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await billingDb
    .from("billing_subscriptions")
    .insert({
      organisation_id: params.context.organisationId,
      user_id: params.user.id,
      merchant_reference: `clarivo-sub-recover-${params.context.organisationId}-${crypto.randomUUID()}`,
      stripe_price_id: priceId,
      stripe_subscription_id: params.remote.id,
      stripe_status: params.remote.status,
      licenses: qty,
      amount_pence: licensesToAmountPence(qty),
      currency: "GBP",
      status: "active",
      activated_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    return null;
  }

  return inserted as BillingSubscriptionRow;
}

export async function updateSubscriptionLicenses(params: {
  billingDb: SupabaseClient;
  user: User;
  context: OrgContext;
  newTotal: number;
  ownerEmail?: string | null;
}): Promise<UpdateSubscriptionLicensesResult> {
  const currentTotal = Math.max(1, params.context.seatLimit);
  const additionalLicenses = params.newTotal - currentTotal;

  if (params.newTotal <= currentTotal) {
    return {
      ok: false,
      status: 400,
      error: `Choose at least 1 additional license.`,
    };
  }

  if (!params.user.email) {
    return {
      ok: false,
      status: 400,
      error: "Your account needs an email address to update billing.",
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

  const remote = await findActiveStripeSubscriptionForOrganisation({
    organisationId: params.context.organisationId,
    email: params.user.email,
  });

  if (remote) {
    if (activeSub && !activeSub.stripe_subscription_id) {
      activeSub = await linkStripeSubscriptionToRow(
        params.billingDb,
        activeSub as BillingSubscriptionRow,
        remote.id,
        remote.status
      );
    } else if (!activeSub) {
      activeSub = await recoverBillingRowFromStripe(params.billingDb, {
        user: params.user,
        context: params.context,
        remote,
      });
    }
  }

  if (!activeSub?.stripe_subscription_id) {
    return {
      ok: false,
      status: 409,
      error:
        "We could not find your active Stripe subscription. Email hello@clarivo-tech.com so we can link your billing before adding seats.",
    };
  }

  const updateResult = await updateActiveStripeSubscription(params.billingDb, {
    subscription: activeSub as BillingSubscriptionRow,
    newTotal: params.newTotal,
    ownerEmail: params.ownerEmail,
  });

  if (updateResult.error) {
    return { ok: false, status: 502, error: updateResult.error };
  }

  const admin = tryCreateAdminClient();
  if (admin) {
    await sendAddLicensesNotificationEmails(admin, {
      userId: params.user.id,
      organisationId: params.context.organisationId,
      ownerEmail: params.ownerEmail,
      previousLicenses: currentTotal,
      newTotal: params.newTotal,
      additionalLicenses,
    });
  } else {
    console.warn(
      "[billing] Add-licenses founder email skipped: SUPABASE_SERVICE_ROLE_KEY not configured."
    );
  }

  return {
    ok: true,
    mode: "subscription_updated",
    currentLicenses: currentTotal,
    newTotal: params.newTotal,
    additionalLicenses,
  };
}
