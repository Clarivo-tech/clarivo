"use client";

import { Calendar, Crown, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useCurrency } from "@/components/providers/currency-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { computeAnalyticsTopStats } from "@/lib/analytics/compute-analytics";
import { formatCurrency } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";

export function AnalyticsStatsRow({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const { convert, baseCurrency } = useCurrency();

  const stats = useMemo(
    () => computeAnalyticsTopStats(contractData, convert),
    [contractData, convert]
  );

  const avgValueLabel =
    stats.averageContractValue != null
      ? formatCurrency(stats.averageContractValue, baseCurrency)
      : "—";

  const durationLabel =
    stats.averageDurationMonths != null
      ? `${stats.averageDurationMonths.toFixed(1)} mo`
      : "—";

  const highestLabel = stats.highestValue
    ? formatCurrency(stats.highestValue.value, baseCurrency)
    : "—";

  const highestFootnote = stats.highestValue?.vendorName;

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Average Contract Value"
        value={avgValueLabel}
        footnote={
          stats.contractCount > 0
            ? `Across ${stats.contractCount} contract${stats.contractCount === 1 ? "" : "s"}`
            : undefined
        }
        icon={Wallet}
        iconColor="#F97316"
        iconBgClassName="bg-[#F97316]/15"
      />
      <StatCard
        title="Average Contract Duration"
        value={durationLabel}
        footnote="Start to end date"
        icon={Calendar}
        iconColor="#38BDF8"
        iconBgClassName="bg-[#38BDF8]/15"
      />
      <StatCard
        title="Highest Value Contract"
        value={highestLabel}
        footnote={highestFootnote}
        icon={Crown}
        iconColor="#F97316"
        iconBgClassName="bg-[#F97316]/15"
      />
      <StatCard
        title="Total Vendors"
        value={String(stats.uniqueVendors)}
        footnote="Unique vendor names"
        icon={Users}
        iconColor="#38BDF8"
        iconBgClassName="bg-[#38BDF8]/15"
      />
    </div>
  );
}
