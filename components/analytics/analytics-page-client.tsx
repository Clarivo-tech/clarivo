"use client";

import { AiPortfolioInsights } from "@/components/analytics/ai-portfolio-insights";
import { AnalyticsExportButton } from "@/components/analytics/analytics-export-button";
import { AnalyticsStatsRow } from "@/components/analytics/analytics-stats-row";
import { ContractLifecycleTimeline } from "@/components/analytics/contract-lifecycle-timeline";
import { ContractRiskRegister } from "@/components/analytics/contract-risk-register";
import { ContractsByTypeChart } from "@/components/analytics/contracts-by-type-chart";
import { PortfolioGrowthChart } from "@/components/analytics/portfolio-growth-chart";
import type { ContractData } from "@/lib/types/contracts";

export function AnalyticsPageClient({
  contractData,
}: {
  contractData: ContractData[];
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Deep insights across your contract portfolio.
          </p>
        </div>
        <AnalyticsExportButton contractData={contractData} />
      </div>

      <AnalyticsStatsRow contractData={contractData} />

      <ContractLifecycleTimeline contractData={contractData} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PortfolioGrowthChart contractData={contractData} />
        <ContractsByTypeChart contractData={contractData} />
      </div>

      <ContractRiskRegister contractData={contractData} />

      <AiPortfolioInsights contractData={contractData} />
    </div>
  );
}
