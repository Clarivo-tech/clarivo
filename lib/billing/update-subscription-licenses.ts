import type { SupabaseClient, User } from "@supabase/supabase-js";
import { licensesToAmountPence } from "@/lib/billing/constants";
import { getSubscriptionPlanConfig } from "@/lib/billing/subscription-plan-config";
import { startAddLicensesCheckout } from "@/lib/billing/start-add-licenses-checkout";
import { getRevolutRedirectBaseUrl, retrieveRevolutOrder } from "@/lib/billing/revolut";
import {
  createRevolutSubscription,
  findOrCreateRevolutCustomer,
  isRevolutSubscriptionActive,
  retrieveRevolutSubscription,
  revolutIdempotencyKey,
  updateRevolutSubscriptionLicenseCount,
} from "@/lib/billing/revolut-subscriptions";
import type { OrgContext } from "@/lib/team/types";

type BillingSubscriptionRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  revolut_subscription_id: string | null;
  plan_variation_id: string | null;
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
      orderId: string;
      merchantReference: string;
      currentLicenses: number;
      newTotal: number;
      additionalLicenses: number;
    }
  | { ok: false; status: number; error: string };

async function updateActiveRevolutSubscription(
  billingDb: SupabaseClient,
  params: {
    subscription: BillingSubscriptionRow;
    planConfig: Awaited<ReturnType<typeof getSubscriptionPlanConfig>>;
    newTotal: number;
  }
): Promise<{ error?: string }> {
  if (!params.subscription.revolut_subscription_id) {
    return { error: "Missing Revolut subscription id." };
  }

  const remote = await retrieveRevolutSubscription(
    params.subscription.revolut_subscription_id
  );

  if (!isRevolutSubscriptionActive(remote.state)) {
    return { error: "Revolut subscription is not active." };
  }

  await updateRevolutSubscriptionLicenseCount({
    planVariationId:
      params.subscription.plan_variation_id ?? params.planConfig.planVariationId,
    subscriptionId: params.subscription.revolut_subscription_id,
    licenseItemId: params.planConfig.licenseItemId,
    quantity: params.newTotal,
    idempotencyKey: revolutIdempotencyKey(
      "seat",
      params.subscription.id,
      params.newTotal
    ),
  });

  const now = new Date().toISOString();
  const { error } = await billingDb
    .from("billing_subscriptions")
    .update({
      licenses: params.newTotal,
      amount_pence: licensesToAmountPence(params.newTotal),
      updated_at: now,
    })
    .eq("id", params.subscription.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

/** After a paid add-license checkout, align Revolut recurring quantity with the new total. */
export async function syncActiveSubscriptionLicenseCount(
  billingDb: SupabaseClient,
  organisationId: string,
  newTotal: number
): Promise<{ error?: string }> {
  const { data: activeSub } = await billingDb
    .from("billing_subscriptions")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSub?.revolut_subscription_id) {
    return {};
  }

  let planConfig;
  try {
    planConfig = await getSubscriptionPlanConfig();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription plan is not configured.";
    return { error: message };
  }

  return updateActiveRevolutSubscription(billingDb, {
    subscription: activeSub as BillingSubscriptionRow,
    planConfig,
    newTotal,
  });
}

async function startNewSubscriptionCheckout(
  params: {
    request: Request;
    billingDb: SupabaseClient;
    user: User;
    context: OrgContext;
    newTotal: number;
    planConfig: Awaited<ReturnType<typeof getSubscriptionPlanConfig>>;
  }
): Promise<UpdateSubscriptionLicensesResult> {
  const merchantReference = `clarivo-sub-${params.context.organisationId}-${crypto.randomUUID()}`;
  const appBase = getRevolutRedirectBaseUrl(params.request);
  const redirectUrl = `${appBase}/dashboard/team?billing=success`;

  const { error: insertError } = await params.billingDb
    .from("billing_subscriptions")
    .insert({
      organisation_id: params.context.organisationId,
      user_id: params.user.id,
      merchant_reference: merchantReference,
      plan_variation_id: params.planConfig.planVariationId,
      licenses: params.newTotal,
      amount_pence: licensesToAmountPence(params.newTotal),
      currency: "GBP",
      status: "pending",
    });

  if (insertError) {
    return { ok: false, status: 500, error: insertError.message };
  }

  try {
    const customer = await findOrCreateRevolutCustomer(
      params.user.email ?? "",
      params.user.user_metadata?.full_name as string | undefined
    );

    const revolutSubscription = await createRevolutSubscription({
      planVariationId: params.planConfig.planVariationId,
      licenseItemId: params.planConfig.licenseItemId ?? undefined,
      customerId: customer.id,
      licenses: params.newTotal,
      externalReference: merchantReference,
      setupOrderRedirectUrl: redirectUrl,
    });

    if (!revolutSubscription.setup_order_id) {
      throw new Error("Revolut did not return a setup order.");
    }

    const setupOrder = await retrieveRevolutOrder(revolutSubscription.setup_order_id);
    if (!setupOrder.checkout_url) {
      throw new Error("Revolut did not return a checkout URL.");
    }

    await params.billingDb
      .from("billing_subscriptions")
      .update({
        revolut_customer_id: customer.id,
        revolut_subscription_id: revolutSubscription.id,
        revolut_setup_order_id: revolutSubscription.setup_order_id,
        revolut_state: revolutSubscription.state,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return {
      ok: true,
      mode: "checkout",
      checkoutUrl: setupOrder.checkout_url,
      orderId: revolutSubscription.setup_order_id,
      merchantReference,
      currentLicenses: Math.max(1, params.context.seatLimit),
      newTotal: params.newTotal,
      additionalLicenses: params.newTotal - Math.max(1, params.context.seatLimit),
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
}): Promise<UpdateSubscriptionLicensesResult> {
  const currentTotal = Math.max(1, params.context.seatLimit);
  if (params.newTotal <= currentTotal) {
    return {
      ok: false,
      status: 400,
      error: `Choose more than your current ${currentTotal} license${currentTotal === 1 ? "" : "s"}.`,
    };
  }

  let planConfig;
  try {
    planConfig = await getSubscriptionPlanConfig();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription plan is not configured.";
    return { ok: false, status: 500, error: message };
  }

  const { data: activeSub } = await params.billingDb
    .from("billing_subscriptions")
    .select("*")
    .eq("organisation_id", params.context.organisationId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSub?.revolut_subscription_id) {
    return startAddLicensesCheckout({
      request: params.request,
      billingDb: params.billingDb,
      user: params.user,
      context: params.context,
      newTotal: params.newTotal,
    }).then((result) =>
      result.ok ? { ...result, mode: "checkout" as const } : result
    );
  }

  const isPro =
    (params.context.plan ?? "").toLowerCase() === "pro" ||
    params.context.isSubscribed;

  if (isPro && !activeSub) {
    return startNewSubscriptionCheckout({
      request: params.request,
      billingDb: params.billingDb,
      user: params.user,
      context: params.context,
      newTotal: params.newTotal,
      planConfig,
    });
  }

  return startAddLicensesCheckout({
    request: params.request,
    billingDb: params.billingDb,
    user: params.user,
    context: params.context,
    newTotal: params.newTotal,
  }).then((result) =>
    result.ok ? { ...result, mode: "checkout" as const } : result
  );
}
