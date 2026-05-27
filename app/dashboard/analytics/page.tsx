import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [contracts, preferences, rates] = await Promise.all([
    getContracts(supabase, user.id),
    getUserPreferences(supabase, user.id),
    getExchangeRates(),
  ]);

  const contractData = await getContractDataByContractIds(
    supabase,
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
