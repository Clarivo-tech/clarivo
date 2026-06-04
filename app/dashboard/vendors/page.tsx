import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getVendorPageData } from "@/lib/data/vendors";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { VendorsPageClient } from "@/components/dashboard/vendors-page-client";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  const [preferences, { rows, stats }] = await Promise.all([
    getUserPreferences(dataSupabase, effectiveUserId),
    getVendorPageData(dataSupabase, effectiveUserId),
  ]);

  return (
    <VendorsPageClient
      rows={rows}
      stats={stats}
      baseCurrency={preferences.base_currency}
    />
  );
}
