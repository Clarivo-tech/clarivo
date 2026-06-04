import type { SupabaseClient } from "@supabase/supabase-js";
import { activateOrganisationLicenses } from "@/lib/billing/activate-licenses";
import { sendPaymentConfirmationEmailsOnce } from "@/lib/billing/send-payment-confirmation-once";
import {
  getSubscriptionVariationDetails,
  isRevolutSubscriptionActive,
  isUsageBillingVariation,
  reportSubscriptionLicenseUsage,
  retrieveRevolutSubscription,
  revolutIdempotencyKey,
} from "@/lib/billing/revolut-subscriptions";
import {
  isRevolutOrderPaid,
  retrieveRevolutOrder,
} from "@/lib/billing/revolut";

export type BillingSubscriptionRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  plan_variation_id: string | null;
  revolut_subscription_id: string | null;
  revolut_setup_order_id: string | null;
  licenses: number;
  status: string;
};

export async function fulfillBillingSubscription(
  admin: SupabaseClient,
  subscription: BillingSubscriptionRow,
  options?: {
    revolutEvent?: string;
    ownerEmail?: string | null;
    trustActive?: boolean;
    revolutState?: string;
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

  let revolutState = options?.revolutState;

  if (!options?.trustActive && subscription.revolut_subscription_id) {
    try {
      const remote = await retrieveRevolutSubscription(
        subscription.revolut_subscription_id
      );
      revolutState = remote.state;
      if (!isRevolutSubscriptionActive(remote.state)) {
        if (subscription.revolut_setup_order_id) {
          try {
            const order = await retrieveRevolutOrder(
              subscription.revolut_setup_order_id
            );
            if (!isRevolutOrderPaid(order.state)) {
              return { fulfilled: false };
            }
          } catch {
            return { fulfilled: false };
          }
        } else {
          return { fulfilled: false };
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not verify Revolut subscription.";
      return { fulfilled: false, error: message };
    }
  } else if (!options?.trustActive && subscription.revolut_setup_order_id) {
    try {
      const order = await retrieveRevolutOrder(subscription.revolut_setup_order_id);
      if (!isRevolutOrderPaid(order.state)) {
        return { fulfilled: false };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not verify setup payment.";
      return { fulfilled: false, error: message };
    }
  } else if (!options?.trustActive) {
    return {
      fulfilled: false,
      error: "Missing Revolut subscription id for verification.",
    };
  }

  const activation = await activateOrganisationLicenses(admin, {
    organisationId: subscription.organisation_id,
    ownerUserId: subscription.user_id,
    ownerEmail,
    licenses: subscription.licenses,
  });

  if (activation.error) {
    return { fulfilled: false, error: activation.error };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("billing_subscriptions")
    .update({
      status: "active",
      revolut_state: revolutState ?? "active",
      revolut_event: options?.revolutEvent ?? null,
      activated_at: now,
      updated_at: now,
    })
    .eq("id", subscription.id)
    .in("status", ["pending", "overdue"]);

  if (updateError) {
    return { fulfilled: false, error: updateError.message };
  }

  if (subscription.revolut_subscription_id && subscription.plan_variation_id) {
    const usageBilling = await isUsageBillingVariation(
      subscription.plan_variation_id
    );
    if (usageBilling) {
      try {
        const plan = await getSubscriptionVariationDetails(
          subscription.plan_variation_id
        );
        await reportSubscriptionLicenseUsage({
          subscriptionId: subscription.revolut_subscription_id,
          quantity: subscription.licenses,
          idempotencyKey: revolutIdempotencyKey("activate", subscription.id),
          usageItemCode: plan.primaryItem.code,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not report subscription usage to Revolut.";
        return { fulfilled: false, error: message };
      }
    }
  }

  await sendPaymentConfirmationEmailsOnce(admin, "billing_subscriptions", subscription, {
    ownerEmail,
    isAddLicenses: false,
  });

  return { fulfilled: true };
}

export async function markBillingSubscriptionOverdue(
  admin: SupabaseClient,
  subscription: BillingSubscriptionRow,
  revolutEvent?: string
): Promise<void> {
  await admin
    .from("billing_subscriptions")
    .update({
      status: "overdue",
      revolut_state: "overdue",
      revolut_event: revolutEvent ?? null,
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
  revolutEvent?: string
): Promise<void> {
  await admin
    .from("billing_subscriptions")
    .update({
      status,
      revolut_state: status,
      revolut_event: revolutEvent ?? null,
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
