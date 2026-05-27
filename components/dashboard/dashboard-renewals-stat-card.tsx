"use client";

import { useMemo } from "react";
import { getRenewalsInNext12Months } from "@/lib/contracts/renewals-in-range";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { RenewalsStatCard } from "@/components/dashboard/renewals-stat-card";

export function DashboardRenewalsStatCard() {
  const { contractData } = useDashboardData();
  const renewals = useMemo(
    () => getRenewalsInNext12Months(contractData),
    [contractData]
  );

  return (
    <RenewalsStatCard count={renewals.length} renewals={renewals} />
  );
}
