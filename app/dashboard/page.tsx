import { DollarSign, FileStack } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  computeDashboardStats,
  getContractDataByContractIds,
  getContracts,
  getRenewalAlerts,
} from "@/lib/data/contracts";
import { getRenewalsInNext12Months } from "@/lib/contracts/renewals-in-range";
import { formatCurrency } from "@/lib/format";
import { DashboardInsightsRow } from "@/components/dashboard/dashboard-insights-row";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { RenewalsStatCard } from "@/components/dashboard/renewals-stat-card";
import { StatCard } from "@/components/dashboard/stat-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const contracts = await getContracts(supabase, user.id);
  const contractIds = contracts.map((c) => c.id);
  const contractData = await getContractDataByContractIds(
    supabase,
    contractIds
  );

  const stats = computeDashboardStats(contracts, contractData);
  const alerts = getRenewalAlerts(contractData);
  const renewalsIn12Months = getRenewalsInNext12Months(contractData);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Overview of your contracts, portfolio value, and upcoming renewals.
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
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          iconColor="#34D399"
          iconBgClassName="bg-[#34D399]/15"
        />
        <RenewalsStatCard
          count={stats.renewalsThisYear}
          renewals={renewalsIn12Months}
        />
      </div>

      <DashboardInsightsRow contractData={contractData} />

      <DashboardOverview contractData={contractData} alerts={alerts} />
    </div>
  );
}
