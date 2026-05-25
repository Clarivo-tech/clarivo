"use client";

import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import type { ContractData } from "@/lib/types/contracts";
import { ContractChat } from "@/components/dashboard/contract-chat";
import { SpendByVendorChart } from "@/components/dashboard/spend-by-vendor-chart";
import { cn } from "@/lib/utils";

export function DashboardInsightsRow({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const rows = dedupeContractDataByContractId(contractData);
  const showChart = rows.length > 0;

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
