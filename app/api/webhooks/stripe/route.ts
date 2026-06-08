import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { licensesToAmountPence } from "@/lib/billing/constants";
import { activateOrganisationLicenses } from "@/lib/billing/activate-licenses";
import {
  fulfillBillingSubscription,
  markBillingSubscriptionCancelled,
  markBillingSubscriptionOverdue,
} from "@/lib/billing/fulfill-subscription";
import {
  getStripe,
  isStripeSubscriptionActive,
  subscriptionQuantity,
} from "@/lib/billing/stripe";

export const runtime = "nodejs";

async function findSubscriptionByStripeId(
  admin: ReturnType<typeof createAdminClient>,
  stripeSubscriptionId: string
) {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  return data;
}

async function findSubscriptionByCheckoutSession(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string
) {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return data;
}

async function findSubscriptionByMerchantReference(
  admin: ReturnType<typeof createAdminClient>,
  merchantReference: string
) {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("*")
    .eq("merchant_reference", merchantReference)
    .maybeSingle();
  return data;
}

async function handleCheckoutSessionCompleted(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const merchantReference =
    session.metadata?.clarivo_merchant_reference ?? session.client_reference_id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  let row =
    (session.id
      ? await findSubscriptionByCheckoutSession(admin, session.id)
      : null) ??
    (merchantReference
      ? await findSubscriptionByMerchantReference(admin, merchantReference)
      : null);

  if (!row) {
    console.warn("[stripe webhook] No billing row for checkout session", session.id);
    return;
  }

  if (subscriptionId) {
    await admin
      .from("billing_subscriptions")
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    row = { ...row, stripe_subscription_id: subscriptionId, stripe_checkout_session_id: session.id };
  }

  await fulfillBillingSubscription(admin, row, {
    trustActive: session.payment_status === "paid",
    stripeSubscriptionId: subscriptionId ?? undefined,
    stripeStatus: "active",
    licenses: Number(session.metadata?.clarivo_licenses ?? row.licenses),
  });
}

async function handleSubscriptionUpdated(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  let row = await findSubscriptionByStripeId(admin, subscription.id);

  if (!row) {
    const merchantReference = subscription.metadata?.clarivo_merchant_reference;
    if (merchantReference) {
      row = await findSubscriptionByMerchantReference(admin, merchantReference);
      if (row) {
        await admin
          .from("billing_subscriptions")
          .update({
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
    }
  }

  if (!row) {
    return;
  }

  const licenses = subscriptionQuantity(subscription);
  const now = new Date().toISOString();

  if (isStripeSubscriptionActive(subscription.status)) {
    if (row.status === "pending") {
      await fulfillBillingSubscription(admin, row, {
        trustActive: true,
        stripeSubscriptionId: subscription.id,
        stripeStatus: subscription.status,
        licenses,
      });
      return;
    }

    await admin
      .from("billing_subscriptions")
      .update({
        licenses,
        amount_pence: licensesToAmountPence(licenses),
        stripe_status: subscription.status,
        updated_at: now,
      })
      .eq("id", row.id);

    if (row.status === "active") {
      const { data: owner } = await admin.auth.admin.getUserById(row.user_id);
      await activateOrganisationLicenses(admin, {
        organisationId: row.organisation_id,
        ownerUserId: row.user_id,
        ownerEmail: owner.user?.email,
        licenses,
      });
    }
    return;
  }

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    await markBillingSubscriptionOverdue(admin, row);
    return;
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  ) {
    await markBillingSubscriptionCancelled(admin, row, "cancelled");
  }
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const row = await findSubscriptionByStripeId(admin, subscription.id);
  if (!row) return;
  await markBillingSubscriptionCancelled(admin, row, "cancelled");
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const withSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscription = withSubscription.subscription;
  if (typeof subscription === "string") return subscription;
  if (subscription && typeof subscription === "object") return subscription.id;

  const parent = invoice.parent as
    | { subscription_details?: { subscription?: string | null } }
    | null
    | undefined;
  return parent?.subscription_details?.subscription ?? null;
}

async function handleInvoicePaymentFailed(
  admin: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const row = await findSubscriptionByStripeId(admin, subscriptionId);
  if (!row) return;
  await markBillingSubscriptionOverdue(admin, row);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";
    console.error("[stripe webhook] signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          admin,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          admin,
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          admin,
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          admin,
          event.data.object as Stripe.Invoice
        );
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe webhook] handler error:", event.type, error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
