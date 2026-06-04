import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getExchangeRates } from "@/lib/currency/exchange-rates";
import {
  getContractDataByContractIds,
  getContracts,
} from "@/lib/data/contracts";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { AnalyticsPageClient } from "@/components/analytics/analytics-page-client";
import { CurrencyProvider } from "@/components/providers/currency-provider";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  const [contracts, preferences, rates] = await Promise.all([
    getContracts(dataSupabase, effectiveUserId),
    getUserPreferences(dataSupabase, effectiveUserId),
    getExchangeRates(),
  ]);

  const contractData = await getContractDataByContractIds(
    dataSupabase,
    contracts.map((c) => c.id)
  );

  return (
    <CurrencyProvider
      baseCurrency={preferences.base_currency}
      rates={rates}
    >
      <AnalyticsPageClient contractData={contractData} />
    </CurrencyProvider>
  );
}
