"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { isMissingContractValue } from "@/lib/currency/currencies";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { getRenewalAlerts } from "@/lib/data/contracts";
import { formatDate } from "@/lib/format";
import { useCurrency } from "@/components/providers/currency-provider";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { DashboardContractsSection } from "@/components/dashboard/dashboard-contracts-section";
import { NoticePeriodTracker } from "@/components/dashboard/notice-period-tracker";
import { EmptyState } from "@/components/dashboard/empty-state";

export function DashboardOverview() {
  const { contractData } = useDashboardData();
  const { formatContractValue } = useCurrency();

  const rows = useMemo(
    () => dedupeContractDataByContractId(contractData),
    [contractData]
  );

  const alerts = useMemo(() => getRenewalAlerts(contractData), [contractData]);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <DashboardContractsSection />

      <div className="flex flex-col gap-8">
        <section className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-zinc-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#F97316]" />
              <h2 className="text-base font-semibold text-zinc-900">
                Renewal alerts
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Contracts renewing within the next 30 days.
            </p>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No upcoming renewals"
                description="You're all set — no contracts are due to renew in the next 30 days."
                className="py-8"
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {alerts.map((row) => {
                  const missingValue = isMissingContractValue(
                    row.contract_value
                  );
                  const value = formatContractValue(
                    row.contract_value,
                    row.currency
                  );

                  return (
                    <li
                      key={row.id}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 transition-colors hover:border-orange-200/60 hover:bg-orange-50/30"
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {row.vendor_name ?? "Unknown vendor"}
                      </p>
                      <p className="mt-1 text-[13px] text-zinc-600">
                        Renews {formatDate(row.renewal_date)}
                      </p>
                      {!missingValue && (
                        <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#F97316]">
                          {value.display}
                          {value.originalNote ? (
                            <span className="ml-1 text-xs font-normal text-zinc-500">
                              {value.originalNote}
                            </span>
                          ) : null}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <NoticePeriodTracker contractData={rows} />
      </div>
    </div>
  );
}
