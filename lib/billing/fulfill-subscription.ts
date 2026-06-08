import type { SupabaseClient } from "@supabase/supabase-js";
import { activateOrganisationLicenses } from "@/lib/billing/activate-licenses";
import { licensesToAmountPence } from "@/lib/billing/constants";
import { sendPaymentConfirmationEmailsOnce } from "@/lib/billing/send-payment-confirmation-once";
import {
  getStripe,
  isStripeSubscriptionActive,
  subscriptionQuantity,
} from "@/lib/billing/stripe";

export type BillingSubscriptionRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  licenses: number;
  status: string;
};

async function resolveStripeSubscriptionId(
  subscription: BillingSubscriptionRow,
  options?: { trustActive?: boolean }
): Promise<{ subscriptionId?: string; status?: string; error?: string }> {
  if (options?.trustActive && subscription.stripe_subscription_id) {
    return {
      subscriptionId: subscription.stripe_subscription_id,
      status: "active",
    };
  }

  const stripe = getStripe();

  if (subscription.stripe_subscription_id) {
    try {
      const remote = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      return {
        subscriptionId: remote.id,
        status: remote.status,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not verify Stripe subscription.";
      return { error: message };
    }
  }

  if (subscription.stripe_checkout_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        subscription.stripe_checkout_session_id,
        { expand: ["subscription"] }
      );

      if (session.payment_status !== "paid") {
        return { error: "Checkout session is not paid yet." };
      }

      const sub = session.subscription;
      if (!sub || typeof sub === "string") {
        return { error: "Checkout session has no subscription." };
      }

      return {
        subscriptionId: sub.id,
        status: sub.status,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not verify Stripe checkout session.";
      return { error: message };
    }
  }

  return {
    error: "Missing Stripe subscription id for verification.",
  };
}

export async function fulfillBillingSubscription(
  admin: SupabaseClient,
  subscription: BillingSubscriptionRow,
  options?: {
    ownerEmail?: string | null;
    trustActive?: boolean;
    stripeStatus?: string;
    stripeSubscriptionId?: string;
    licenses?: number;
  }
): Promise<{ fulfilled: boolean; error?: string }> {
  const { data: owner } = await admin.auth.admin.getUserById(subscription.user_id);
  const ownerEmail = options?.ownerEmail ?? owner.user?.email ?? null;

  if (subscription.status === "active") {
    await sendPaymentConfirmationEmailsOnce(admin, "billing_subscriptions", subscription, {
      ownerEmail,
      isAddLicenses: false,
    });
    return { fulfilled: true };
  }

  let stripeStatus = options?.stripeStatus;
  let stripeSubscriptionId =
    options?.stripeSubscriptionId ?? subscription.stripe_subscription_id;
  let licenses = options?.licenses ?? subscription.licenses;

  if (!options?.trustActive) {
    const resolved = await resolveStripeSubscriptionId(subscription, options);
    if (resolved.error) {
      return { fulfilled: false, error: resolved.error };
    }
    if (!resolved.subscriptionId || !isStripeSubscriptionActive(resolved.status)) {
      return { fulfilled: false };
    }
    stripeSubscriptionId = resolved.subscriptionId;
    stripeStatus = resolved.status;

    try {
      const remote = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
      licenses = subscriptionQuantity(remote);
    } catch {
      // keep stored license count
    }
  }

  const activation = await activateOrganisationLicenses(admin, {
    organisationId: subscription.organisation_id,
    ownerUserId: subscription.user_id,
    ownerEmail,
    licenses,
  });

  if (activation.error) {
    return { fulfilled: false, error: activation.error };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("billing_subscriptions")
    .update({
      status: "active",
      stripe_subscription_id: stripeSubscriptionId,
      stripe_status: stripeStatus ?? "active",
      licenses,
      amount_pence: licensesToAmountPence(licenses),
      activated_at: now,
      updated_at: now,
    })
    .eq("id", subscription.id)
    .in("status", ["pending", "overdue"]);

  if (updateError) {
    return { fulfilled: false, error: updateError.message };
  }

  await sendPaymentConfirmationEmailsOnce(
    admin,
    "billing_subscriptions",
    { ...subscription, licenses },
    {
      ownerEmail,
      isAddLicenses: false,
    }
  );

  return { fulfilled: true };
}

export async function markBillingSubscriptionOverdue(
  admin: SupabaseClient,
  subscription: BillingSubscriptionRow,
  _stripeEvent?: string
): Promise<void> {
  await admin
    .from("billing_subscriptions")
    .update({
      status: "overdue",
      stripe_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)
    .eq("status", "active");

  await admin
    .from("user_preferences")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", subscription.user_id);
}

export async function markBillingSubscriptionCancelled(
  admin: SupabaseClient,
  subscription: BillingSubscriptionRow,
  status: "cancelled" | "finished",
  _stripeEvent?: string
): Promise<void> {
  await admin
    .from("billing_subscriptions")
    .update({
      status,
      stripe_status: status === "cancelled" ? "canceled" : status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  await admin
    .from("user_preferences")
    .update({
      subscription_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", subscription.user_id);
}

export async function syncActiveSubscriptionLicenseCount(
  admin: SupabaseClient,
  organisationId: string,
  newTotal: number
): Promise<{ error?: string }> {
  const { data: activeSub } = await admin
    .from("billing_subscriptions")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeSub?.stripe_subscription_id) {
    return {};
  }

  const { updateStripeSubscriptionQuantity } = await import("@/lib/billing/stripe");

  try {
    const updated = await updateStripeSubscriptionQuantity({
      subscriptionId: activeSub.stripe_subscription_id,
      quantity: newTotal,
    });

    const now = new Date().toISOString();
    const { error } = await admin
      .from("billing_subscriptions")
      .update({
        licenses: newTotal,
        amount_pence: licensesToAmountPence(newTotal),
        stripe_status: updated.status,
        updated_at: now,
      })
      .eq("id", activeSub.id);

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not update Stripe subscription quantity.";
    return { error: message };
  }
}
