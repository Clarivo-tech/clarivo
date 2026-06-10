import { Suspense } from "react";
import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { syncLatestPendingPaymentForUser } from "@/lib/billing/sync-pending-payment";
import { getTeamPageData } from "@/lib/team/data";
import {
  canInviteMembers,
  canManageTeam,
  canPurchaseLicenses,
} from "@/lib/team/roles";
import { ensureUserOrganisation } from "@/lib/team/org";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { TeamBillingSync } from "@/components/dashboard/team-billing-sync";
import { TeamPageClient } from "@/components/dashboard/team-page-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { dataSupabase, user, effectiveUserId, impersonating } =
    await getDashboardSession();

  const preferences = await getUserPreferences(dataSupabase, effectiveUserId);
  await ensureUserOrganisation(
    dataSupabase,
    effectiveUserId,
    preferences.company,
    user.email
  );

  let { context, members, invites, licenses } = await getTeamPageData(
    dataSupabase,
    effectiveUserId,
    user.email
  );

  if (context?.role === "owner" && !impersonating) {
    await syncLatestPendingPaymentForUser(
      effectiveUserId,
      context.organisationId,
      user.email,
      dataSupabase
    );
    ({ context, members, invites, licenses } = await getTeamPageData(
      dataSupabase,
      effectiveUserId,
      user.email
    ));
  }

  const canManageMembers = context ? canManageTeam(context.role) : false;
  const canInvite = context ? canInviteMembers(context.role) : false;
  const canPurchase = context ? canPurchaseLicenses(context.role) : false;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <Suspense fallback={null}>
        <TeamBillingSync isOwner={context?.role === "owner"} />
      </Suspense>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          My Team
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          See how many licenses you have purchased and utilised, then invite
          colleagues with your company email domain to join your organisation.
        </p>
      </div>

      <TeamPageClient
        context={context}
        members={members}
        invites={invites}
        licenses={licenses}
        canManageMembers={canManageMembers}
        canInvite={canInvite}
        canPurchaseLicenses={canPurchase}
        currentUserId={effectiveUserId}
      />
    </div>
  );
}
