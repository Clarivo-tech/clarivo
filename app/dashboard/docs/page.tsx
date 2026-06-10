import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getContracts } from "@/lib/data/contracts";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { DocsPageClient } from "@/components/dashboard/docs-page-client";
import { bypassesTrialRestrictions } from "@/lib/admin/access";
import { getOrgContext } from "@/lib/team/org";
import { canUploadContracts } from "@/lib/team/roles";
import { isFreeTrialUser } from "@/lib/trial/is-free-trial";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const { dataSupabase, user, effectiveUserId, impersonating } =
    await getDashboardSession();

  const [contracts, orgContext, preferences] = await Promise.all([
    getContracts(dataSupabase, effectiveUserId, { includeInactive: true }),
    getOrgContext(dataSupabase, effectiveUserId),
    getUserPreferences(dataSupabase, effectiveUserId),
  ]);

  const canUpload = orgContext
    ? canUploadContracts(orgContext.role)
    : true;

  const showTrialSamples =
    !impersonating &&
    isFreeTrialUser({
      preferences,
      context: orgContext,
      operatorBypass: bypassesTrialRestrictions(user.email, impersonating),
    });

  return (
    <div className="mx-auto max-w-7xl">
      <DocsPageClient
        initialContracts={contracts}
        canUpload={canUpload}
        showTrialSamples={showTrialSamples}
      />
    </div>
  );
}
