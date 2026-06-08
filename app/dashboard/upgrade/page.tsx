import { Suspense } from "react";
import { redirect } from "next/navigation";
import { bypassesTrialRestrictions } from "@/lib/admin/access";
import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { getOrgContextForTeam } from "@/lib/team/org";
import { getPricePerLicenseGbp } from "@/lib/billing/constants";
import { syncLatestPendingPaymentForUser } from "@/lib/billing/sync-pending-payment";
import { UpgradePageClient } from "@/components/dashboard/upgrade-page-client";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ payment?: string; add?: string }>;
}) {
  const { payment, add } = await searchParams;
  const addLicensesMode = add === "1";
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

  if (isFullySubscribed(preferences.subscription_status, context)) {
    if (addLicensesMode) {
      if (context?.role !== "owner") {
        redirect("/dashboard/team");
      }
    } else if (context?.role === "owner") {
      redirect("/dashboard/upgrade?add=1");
    } else {
      redirect("/dashboard");
    }
  }

  if (addLicensesMode && context?.role !== "owner") {
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
          isOwner={context?.role === "owner"}
          paymentSuccess={payment === "success"}
          addLicensesMode={addLicensesMode}
        />
      </Suspense>
    </div>
  );
}
