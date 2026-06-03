import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRates } from "@/lib/currency/exchange-rates";
import { getVendorDetailData } from "@/lib/data/vendors";
import { getUserPreferences } from "@/lib/data/user-preferences";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [data, preferences, rates] = await Promise.all([
    getVendorDetailData(supabase, user.id, id),
    getUserPreferences(supabase, user.id),
    getExchangeRates(),
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
        />
      </DashboardDataProvider>
    </CurrencyProvider>
  );
}
