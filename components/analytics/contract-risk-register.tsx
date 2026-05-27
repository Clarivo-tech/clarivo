"use client";

import { useMemo } from "react";
import { computeRiskRegister } from "@/lib/analytics/compute-analytics";
import type { ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

function YesNoBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        value
          ? "bg-orange-50 text-[#C2410C] ring-1 ring-orange-200/80"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80"
      )}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function NoticeBadge({
  status,
}: {
  status: "OK" | "Warning" | "Action Required";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        status === "OK" &&
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
        status === "Warning" &&
          "bg-orange-50 text-[#C2410C] ring-1 ring-orange-200/80",
        status === "Action Required" &&
          "bg-red-50 text-red-700 ring-1 ring-red-200/80"
      )}
    >
      {status}
    </span>
  );
}

function HealthBadge({
  score,
  tier,
}: {
  score: number;
  tier: "high" | "medium" | "low";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        tier === "high" &&
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
        tier === "medium" &&
          "bg-orange-50 text-[#EA580C] ring-1 ring-orange-200/80",
        tier === "low" && "bg-red-50 text-red-700 ring-1 ring-red-200/80"
      )}
    >
      {score}
    </span>
  );
}

export function ContractRiskRegister({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const rows = useMemo(
    () => computeRiskRegister(contractData),
    [contractData]
  );

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-base font-semibold text-zinc-900">
          Contract Risk Register
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sorted by health score — lowest (highest risk) first.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-500">
          No contract data available for the risk register.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-6 py-3">Vendor</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Notice period</th>
                <th className="px-4 py-3">Days to renewal</th>
                <th className="px-4 py-3">Auto-renewal</th>
                <th className="px-6 py-3">Early exit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.contractId} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-3.5 font-medium text-zinc-900">
                    {row.vendorName}
                  </td>
                  <td className="px-4 py-3.5">
                    <HealthBadge score={row.healthScore} tier={row.healthTier} />
                  </td>
                  <td className="px-4 py-3.5">
                    <NoticeBadge status={row.noticeStatus} />
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-zinc-700">
                    {row.daysUntilRenewal != null
                      ? row.daysUntilRenewal < 0
                        ? `${Math.abs(row.daysUntilRenewal)}d overdue`
                        : `${row.daysUntilRenewal}d`
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <YesNoBadge value={row.autoRenews} />
                  </td>
                  <td className="px-6 py-3.5">
                    <YesNoBadge value={row.hasExitClause} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
