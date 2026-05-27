import { FileStack } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRates } from "@/lib/currency/exchange-rates";
import {
  computeDashboardStats,
  getContractDataByContractIds,
  getContracts,
} from "@/lib/data/contracts";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { DashboardInsightsRow } from "@/components/dashboard/dashboard-insights-row";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardRenewalsStatCard } from "@/components/dashboard/dashboard-renewals-stat-card";
import { DashboardTotalValueStat } from "@/components/dashboard/dashboard-total-value-stat";
import { StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const contractIds = contracts.map((c) => c.id);
  const contractData = await getContractDataByContractIds(
    supabase,
    contractIds
  );

  const stats = computeDashboardStats(contracts, contractData);

  return (
    <CurrencyProvider
      baseCurrency={preferences.base_currency}
      rates={rates}
    >
      <DashboardDataProvider initialContractData={contractData}>
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Overview of your contracts, portfolio value, and upcoming
              renewals.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Total Contracts"
              value={String(stats.totalContracts)}
              icon={FileStack}
              iconColor="#38BDF8"
              iconBgClassName="bg-[#38BDF8]/15"
            />
            <DashboardTotalValueStat />
            <DashboardRenewalsStatCard />
          </div>

          <DashboardInsightsRow />

          <DashboardOverview />
        </div>
      </DashboardDataProvider>
    </CurrencyProvider>
  );
}
