import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { SettingsPageClient } from "@/components/dashboard/settings-page-client";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { ensureUserOrganisation, getOrgContextForTeam } from "@/lib/team/org";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { dataSupabase, user, effectiveUserId } = await getDashboardSession();

  const preferences = await getUserPreferences(dataSupabase, effectiveUserId);

  await ensureUserOrganisation(
    dataSupabase,
    effectiveUserId,
    preferences.company,
    user.email
  );

  const context = await getOrgContextForTeam(dataSupabase, effectiveUserId);

  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ?? "";

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      initialDisplayName={displayName}
      initialBaseCurrency={preferences.base_currency}
      memberSince={user.created_at}
      plan={context?.plan ?? "trial"}
      seatLimit={context?.seatLimit ?? 1}
      isSubscribed={context?.isSubscribed ?? false}
      isOwner={context?.role === "owner"}
    />
  );
}
