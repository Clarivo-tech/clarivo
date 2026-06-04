import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getPerformancePageData } from "@/lib/data/performance";
import { ensureDefaultPerformanceCriteria } from "@/lib/performance/seed-criteria";
import { PerformancePageClient } from "@/components/performance/performance-page-client";
import { getVendorById } from "@/lib/data/vendors";

export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const { vendor: filterVendorId } = await searchParams;
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  await ensureDefaultPerformanceCriteria(dataSupabase, effectiveUserId);

  const data = await getPerformancePageData(
    dataSupabase,
    effectiveUserId,
    filterVendorId
  );

  let filterVendorName: string | undefined;
  if (filterVendorId) {
    const v = await getVendorById(
      dataSupabase,
      effectiveUserId,
      filterVendorId
    );
    filterVendorName = v?.name;
  }

  return (
    <PerformancePageClient
      stats={data.stats}
      vendors={data.vendors}
      overviews={data.overviews}
      criteria={data.criteria}
      recentReviews={data.recentReviews}
      filterVendorId={filterVendorId}
      filterVendorName={filterVendorName}
    />
  );
}
