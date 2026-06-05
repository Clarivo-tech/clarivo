"use client";

import { useMemo } from "react";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { ContractChat } from "@/components/dashboard/contract-chat";
import { SpendByVendorChart } from "@/components/dashboard/spend-by-vendor-chart";

export function DashboardInsightsRow() {
  const { contractData } = useDashboardData();
  const rows = useMemo(
    () => dedupeContractDataByContractId(contractData),
    [contractData]
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <SpendByVendorChart contractData={rows} />
      <ContractChat variant="compact" />
    </div>
  );
}
