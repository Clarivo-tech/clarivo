import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  MAX_LICENSES,
  MIN_LICENSES,
  licensesToAmountPence,
} from "@/lib/billing/constants";
import { getRevolutRedirectBaseUrl, isRevolutConfigured } from "@/lib/billing/revolut";
import { retrieveRevolutOrder } from "@/lib/billing/revolut";
import { updateSubscriptionLicenses } from "@/lib/billing/update-subscription-licenses";
import { getOrgContextForTeam } from "@/lib/team/org";
import { getSubscriptionPlanConfig } from "@/lib/billing/subscription-plan-config";
import {
  createRevolutSubscription,
  findOrCreateRevolutCustomer,
  getSubscriptionVariationDetails,
  isRevolutSubscriptionsConfigured,
  subscriptionMonthlyAmountPence,
  validateVariationUnitPrice,
} from "@/lib/billing/revolut-subscriptions";

export async function POST(request: Request) {
  if (!isRevolutConfigured() || !isRevolutSubscriptionsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Revolut subscriptions are not configured. Add REVOLUT_MERCHANT_API_SECRET and REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID (or run scripts/ensure-revolut-subscription-plan.ps1).",
      },
      { status: 500 }
    );
  }

  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const billingDb = tryCreateAdminClient() ?? auth.supabase;

  let body: { licenses?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const licenses = Number(body.licenses);
  if (
    !Number.isInteger(licenses) ||
    licenses < MIN_LICENSES ||
    licenses > MAX_LICENSES
  ) {
    return NextResponse.json(
      {
        error: `Choose between ${MIN_LICENSES} and ${MAX_LICENSES} licenses.`,
      },
      { status: 400 }
    );
  }

  const context = await getOrgContextForTeam(auth.supabase, auth.user.id);
  if (!context || context.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can start a subscription." },
      { status: 403 }
    );
  }

  const { data: existingActive } = await billingDb
    .from("billing_subscriptions")
    .select("id")
    .eq("organisation_id", context.organisationId)
    .eq("status", "active")
    .maybeSingle();

  if (existingActive) {
    const addResult = await updateSubscriptionLicenses({
      request,
      billingDb,
      user: auth.user,
      context,
      newTotal: licenses,
    });
    if (!addResult.ok) {
      return NextResponse.json({ error: addResult.error }, { status: addResult.status });
    }
    if (addResult.mode === "subscription_updated") {
      return NextResponse.json({
        mode: "subscription_updated",
        currentLicenses: addResult.currentLicenses,
        newTotal: addResult.newTotal,
      });
    }
    return NextResponse.json({
      mode: "checkout",
      checkoutUrl: addResult.checkoutUrl,
      orderId: addResult.orderId,
      merchantReference: addResult.merchantReference,
      currentLicenses: addResult.currentLicenses,
      newTotal: addResult.newTotal,
      additionalLicenses: addResult.additionalLicenses,
    });
  }

  let planConfig;
  try {
    planConfig = await getSubscriptionPlanConfig();
    const planDetails = await getSubscriptionVariationDetails(
      planConfig.planVariationId
    );
    const priceWarning = validateVariationUnitPrice(planDetails);
    if (priceWarning) {
      console.warn("[create-subscription]", priceWarning);
    }
    if (planDetails.primaryItem.type === "usage") {
      console.log(
        "[create-subscription] Usage-based Revolut plan:",
        planDetails.planName,
        "— recurring total depends on reported license count."
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Subscription plan is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const merchantReference = `clarivo-sub-${context.organisationId}-${crypto.randomUUID()}`;
  const amountPence = licensesToAmountPence(licenses);
  const appBase = getRevolutRedirectBaseUrl(request);
  const redirectUrl = `${appBase}/dashboard/team?billing=success`;

  const { error: insertError } = await billingDb.from("billing_subscriptions").insert({
    organisation_id: context.organisationId,
    user_id: auth.user.id,
    merchant_reference: merchantReference,
    plan_variation_id: planConfig.planVariationId,
    licenses,
    amount_pence: amountPence,
    currency: "GBP",
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const customer = await findOrCreateRevolutCustomer(
      auth.user.email ?? "",
      auth.user.user_metadata?.full_name as string | undefined
    );

    const revolutSubscription = await createRevolutSubscription({
      planVariationId: planConfig.planVariationId,
      licenseItemId: planConfig.licenseItemId ?? undefined,
      customerId: customer.id,
      licenses,
      externalReference: merchantReference,
      setupOrderRedirectUrl: redirectUrl,
    });

    if (!revolutSubscription.setup_order_id) {
      throw new Error("Revolut did not return a setup order for this subscription.");
    }

    const setupOrder = await retrieveRevolutOrder(revolutSubscription.setup_order_id);

    if (!setupOrder.checkout_url) {
      throw new Error("Revolut did not return a checkout URL for the setup payment.");
    }

    await billingDb
      .from("billing_subscriptions")
      .update({
        revolut_customer_id: customer.id,
        revolut_subscription_id: revolutSubscription.id,
        revolut_setup_order_id: revolutSubscription.setup_order_id,
        revolut_state: revolutSubscription.state,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return NextResponse.json({
      checkoutUrl: setupOrder.checkout_url,
      subscriptionId: revolutSubscription.id,
      setupOrderId: revolutSubscription.setup_order_id,
      merchantReference,
      monthlyAmountPence: subscriptionMonthlyAmountPence(licenses),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create Revolut subscription.";
    await billingDb
      .from("billing_subscriptions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
