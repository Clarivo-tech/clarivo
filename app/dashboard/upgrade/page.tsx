import { Suspense } from "react";
import { redirect } from "next/navigation";
import { bypassesTrialRestrictions } from "@/lib/admin/access";
import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { getOrgContextForTeam } from "@/lib/team/org";
import { getPricePerLicenseGbp } from "@/lib/billing/constants";
import { syncLatestPendingPaymentForUser } from "@/lib/billing/sync-pending-payment";
import { isAwaitingPayment } from "@/lib/trial/access";
import { findActiveStripeSubscriptionForOrganisation } from "@/lib/billing/stripe";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { UpgradePageClient } from "@/components/dashboard/upgrade-page-client";
import { canPurchaseLicenses } from "@/lib/team/roles";

export const dynamic = "force-dynamic";

async function hasActiveStripeSubscription(
  organisationId: string,
  ownerEmail: string | null | undefined,
  supabase: Awaited<
    ReturnType<typeof getDashboardSession>
  >["dataSupabase"]
): Promise<boolean> {
  const db = tryCreateAdminClient() ?? supabase;
  const { data } = await db
    .from("billing_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .not("stripe_subscription_id", "is", null)
    .maybeSingle();

  if (data?.stripe_subscription_id) {
    return true;
  }

  if (!ownerEmail || !process.env.STRIPE_SECRET_KEY?.trim()) {
    return false;
  }

  try {
    const remote = await findActiveStripeSubscriptionForOrganisation({
      organisationId,
      email: ownerEmail,
    });
    return Boolean(remote);
  } catch {
    return false;
  }
}

function isFullySubscribed(
  subscriptionStatus: string | null | undefined,
  context: Awaited<ReturnType<typeof getOrgContextForTeam>>
): boolean {
  return (
    subscriptionStatus === "active" ||
    context?.isSubscribed === true ||
    (context?.plan ?? "").toLowerCase() === "pro"
  );
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; add?: string; checkout?: string }>;
}) {
  const { payment, add, checkout } = await searchParams;
  const addLicensesMode = add === "1";
  const autoCheckout = checkout === "1";
  const returnPath =
    payment === "success"
      ? addLicensesMode
        ? "/dashboard/upgrade?add=1&payment=success"
        : "/dashboard/upgrade?payment=success"
      : addLicensesMode
        ? "/dashboard/upgrade?add=1"
        : "/dashboard/upgrade";

  const { dataSupabase, user, effectiveUserId, impersonating } =
    await getDashboardSession();

  if (bypassesTrialRestrictions(user.email, impersonating)) {
    redirect("/dashboard/admin");
  }

  let context = await getOrgContextForTeam(dataSupabase, effectiveUserId);
  let preferences = await getUserPreferences(dataSupabase, effectiveUserId);

  if (
    !impersonating &&
    context?.role === "owner" &&
    (payment === "success" ||
      addLicensesMode ||
      !isFullySubscribed(preferences.subscription_status, context))
  ) {
    await syncLatestPendingPaymentForUser(
      effectiveUserId,
      context.organisationId,
      user.email,
      dataSupabase
    );
    preferences = await getUserPreferences(dataSupabase, effectiveUserId);
    context = await getOrgContextForTeam(dataSupabase, effectiveUserId);
  }

  const subscribed = isFullySubscribed(
    preferences.subscription_status,
    context
  );
  const hasStripe = context
    ? await hasActiveStripeSubscription(
        context.organisationId,
        user.email,
        dataSupabase
      )
    : false;

  const canBuy = context ? canPurchaseLicenses(context.role) : false;
  const isOwner = context?.role === "owner";

  if (subscribed) {
    if (addLicensesMode) {
      if (!canBuy) {
        redirect("/dashboard/team");
      }
      if (!hasStripe) {
        redirect("/dashboard/upgrade");
      }
    } else if (isOwner && hasStripe) {
      redirect("/dashboard/upgrade?add=1");
    } else if (!isOwner) {
      redirect("/dashboard");
    }
  } else if (addLicensesMode) {
    redirect("/dashboard/upgrade");
  }

  if (addLicensesMode && !canBuy) {
    redirect("/dashboard/team");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Suspense
        fallback={
          <p className="py-12 text-center text-sm text-zinc-500">Loading checkout…</p>
        }
      >
        <UpgradePageClient
          organisationName={context?.organisationName ?? "your workspace"}
          currentLicenses={context?.seatLimit ?? 1}
          pricePerLicenseGbp={getPricePerLicenseGbp()}
          isOwner={isOwner}
          canPurchaseLicenses={canBuy}
          paymentSuccess={payment === "success"}
          addLicensesMode={addLicensesMode}
          autoCheckout={
            autoCheckout &&
            !addLicensesMode &&
            !isFullySubscribed(preferences.subscription_status, context)
          }
          awaitingPayment={isAwaitingPayment(preferences)}
        />
      </Suspense>
    </div>
  );
}
