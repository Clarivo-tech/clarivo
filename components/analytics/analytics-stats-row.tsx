"use client";

import { Crown, Users } from "lucide-react";
import { useMemo } from "react";
import { AverageContractDurationCard } from "@/components/analytics/average-contract-duration-card";
import { AverageContractValueCard } from "@/components/analytics/average-contract-value-card";
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

  const highestLabel = stats.highestValue
    ? formatCurrency(stats.highestValue.value, baseCurrency)
    : "—";

  const highestFootnote = stats.highestValue?.vendorName;

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <AverageContractValueCard contractData={contractData} />
      <AverageContractDurationCard contractData={contractData} />
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
