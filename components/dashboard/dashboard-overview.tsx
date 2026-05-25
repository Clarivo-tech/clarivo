"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import type { ContractData } from "@/lib/types/contracts";
import { formatContractValue, formatDate } from "@/lib/format";
import { DashboardContractsSection } from "@/components/dashboard/dashboard-contracts-section";
import { NoticePeriodTracker } from "@/components/dashboard/notice-period-tracker";
import { EmptyState } from "@/components/dashboard/empty-state";

export function DashboardOverview({
  contractData,
  alerts,
}: {
  contractData: ContractData[];
  alerts: ContractData[];
}) {
  const rows = dedupeContractDataByContractId(contractData);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
        <DashboardContractsSection contractData={rows} />

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
                  {alerts.map((row) => (
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
                      {row.contract_value != null && (
                        <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#F97316]">
                          {formatContractValue(
                            row.contract_value,
                            row.currency
                          )}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <NoticePeriodTracker contractData={rows} />
        </div>
    </div>
  );
}
