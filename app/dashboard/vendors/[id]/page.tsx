import { notFound } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getExchangeRates } from "@/lib/currency/exchange-rates";
import { getPerformanceCriteria } from "@/lib/data/performance";
import { getVendorReviewHistory } from "@/lib/data/performance";
import { getVendorDetailData } from "@/lib/data/vendors";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { ensureDefaultPerformanceCriteria } from "@/lib/performance/seed-criteria";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { VendorDetailPageClient } from "@/components/dashboard/vendor-detail-page-client";
import { CurrencyProvider } from "@/components/providers/currency-provider";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  await ensureDefaultPerformanceCriteria(dataSupabase, effectiveUserId);

  const [data, preferences, rates, reviews, criteria] = await Promise.all([
    getVendorDetailData(dataSupabase, effectiveUserId, id),
    getUserPreferences(dataSupabase, effectiveUserId),
    getExchangeRates(),
    getVendorReviewHistory(dataSupabase, effectiveUserId, id),
    getPerformanceCriteria(dataSupabase, effectiveUserId),
  ]);

  if (!data) notFound();

  const contractData = [...data.linkedData, ...data.unlinkedData];

  return (
    <CurrencyProvider
      baseCurrency={preferences.base_currency}
      rates={rates}
    >
      <DashboardDataProvider initialContractData={contractData}>
        <VendorDetailPageClient
          vendor={data.vendor}
          linkedData={data.linkedData}
          unlinkedData={data.unlinkedData}
          documents={data.documents}
          activity={data.activity}
          totalSpend={data.totalSpend}
          baseCurrency={preferences.base_currency}
          performanceReviews={reviews}
          performanceCriteria={criteria}
        />
      </DashboardDataProvider>
    </CurrencyProvider>
  );
}
