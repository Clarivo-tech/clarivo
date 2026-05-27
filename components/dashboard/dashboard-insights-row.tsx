"use client";

import { useMemo } from "react";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { ContractChat } from "@/components/dashboard/contract-chat";
import { SpendByVendorChart } from "@/components/dashboard/spend-by-vendor-chart";
import { cn } from "@/lib/utils";

export function DashboardInsightsRow() {
  const { contractData } = useDashboardData();
  const rows = useMemo(
    () => dedupeContractDataByContractId(contractData),
    [contractData]
  );
  const showChart = rows.some(
    (row) => row.contract_value != null && row.contract_value !== 0
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {showChart ? (
        <SpendByVendorChart contractData={rows} />
      ) : (
        <div className="hidden md:block" aria-hidden />
      )}
      <ContractChat
        variant="compact"
        className={cn(!showChart && "md:col-span-2")}
      />
    </div>
  );
}
