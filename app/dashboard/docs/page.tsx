import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getContracts } from "@/lib/data/contracts";
import { DocsPageClient } from "@/components/dashboard/docs-page-client";
import { getOrgContext } from "@/lib/team/org";
import { canUploadContracts } from "@/lib/team/roles";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  const [contracts, orgContext] = await Promise.all([
    getContracts(dataSupabase, effectiveUserId, { includeInactive: true }),
    getOrgContext(dataSupabase, effectiveUserId),
  ]);

  const canUpload = orgContext
    ? canUploadContracts(orgContext.role)
    : true;

  return (
    <div className="mx-auto max-w-7xl">
      <DocsPageClient initialContracts={contracts} canUpload={canUpload} />
    </div>
  );
}
