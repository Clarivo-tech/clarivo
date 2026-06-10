import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  MAX_LICENSES,
  MIN_LICENSES,
  licensesToAmountPence,
} from "@/lib/billing/constants";
import {
  createSubscriptionCheckoutSession,
  findOrCreateStripeCustomer,
  getStripePriceId,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import { updateSubscriptionLicenses } from "@/lib/billing/update-subscription-licenses";
import { getOrgContextForTeam } from "@/lib/team/org";
import { canPurchaseLicenses } from "@/lib/team/roles";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to your environment.",
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
  if (!context) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const { data: existingActive } = await billingDb
    .from("billing_subscriptions")
    .select("id, stripe_subscription_id")
    .eq("organisation_id", context.organisationId)
    .eq("status", "active")
    .maybeSingle();

  if (existingActive) {
    if (!canPurchaseLicenses(context.role)) {
      return NextResponse.json(
        { error: "You do not have permission to purchase licenses." },
        { status: 403 }
      );
    }

    const addResult = await updateSubscriptionLicenses({
      billingDb,
      user: auth.user,
      context,
      newTotal: licenses,
      ownerEmail: auth.user.email,
    });
    if (!addResult.ok) {
      return NextResponse.json({ error: addResult.error }, { status: addResult.status });
    }
    return NextResponse.json({
      mode: "subscription_updated",
      currentLicenses: addResult.currentLicenses,
      newTotal: addResult.newTotal,
      additionalLicenses: addResult.additionalLicenses,
    });
  }

  if (context.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can start a new subscription." },
      { status: 403 }
    );
  }

  const merchantReference = `clarivo-sub-${context.organisationId}-${crypto.randomUUID()}`;
  const amountPence = licensesToAmountPence(licenses);
  const priceId = getStripePriceId();

  const { error: insertError } = await billingDb.from("billing_subscriptions").insert({
    organisation_id: context.organisationId,
    user_id: auth.user.id,
    merchant_reference: merchantReference,
    stripe_price_id: priceId,
    licenses,
    amount_pence: amountPence,
    currency: "GBP",
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const customer = await findOrCreateStripeCustomer({
      email: auth.user.email ?? "",
      name: auth.user.user_metadata?.full_name as string | undefined,
      organisationId: context.organisationId,
      userId: auth.user.id,
    });

    const session = await createSubscriptionCheckoutSession({
      request,
      customerId: customer.id,
      licenses,
      merchantReference,
      organisationId: context.organisationId,
      userId: auth.user.id,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await billingDb
      .from("billing_subscriptions")
      .update({
        stripe_customer_id: customer.id,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      merchantReference,
      monthlyAmountPence: amountPence,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create Stripe checkout.";
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
