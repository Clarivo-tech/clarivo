"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { computeDurationBreakdown } from "@/lib/analytics/compute-analytics";
import type { ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

export function AverageContractDurationCard({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const [open, setOpen] = useState(false);

  const breakdown = useMemo(
    () => computeDurationBreakdown(contractData),
    [contractData]
  );

  const avgLabel =
    breakdown.averageMonths != null
      ? `${breakdown.averageMonths.toFixed(1)} mo`
      : "—";

  const footnote =
    breakdown.measuredContractCount > 0
      ? `Across ${breakdown.measuredContractCount} contract${breakdown.measuredContractCount === 1 ? "" : "s"} with start and end dates`
      : "Start to end date";

  const canExpand = breakdown.measuredContractCount > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-shadow",
        open && "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]"
      )}
    >
      <button
        type="button"
        onClick={() => canExpand && setOpen((prev) => !prev)}
        disabled={!canExpand}
        className={cn(
          "flex w-full flex-col p-5 text-left",
          canExpand && "cursor-pointer"
        )}
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-zinc-500">
            Average Contract Duration
          </p>
          <div className="flex items-center gap-1.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#38BDF8]/15">
              <Calendar
                className="size-4"
                style={{ color: "#38BDF8" }}
                strokeWidth={2}
              />
            </div>
            {canExpand ? (
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-zinc-400 transition-transform",
                  open && "rotate-180"
                )}
              />
            ) : null}
          </div>
        </div>
        <p
          className={cn(
            "mt-3 text-3xl font-bold tracking-tight text-zinc-900 tabular-nums",
            canExpand && "transition-colors hover:text-[#38BDF8]"
          )}
        >
          {avgLabel}
        </p>
        <p className="mt-1.5 text-xs text-zinc-500">{footnote}</p>
        {canExpand ? (
          <p className="mt-2 text-xs font-medium text-[#38BDF8]">
            {open ? "Hide breakdown" : "View by contract"}
          </p>
        ) : null}
      </button>

      {open && canExpand ? (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
          <p className="text-xs text-zinc-600">
            Duration from contract start to end (or renewal) date.
          </p>
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
            {breakdown.items.map((item) => (
              <li
                key={item.contractId}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-zinc-800">
                  {item.vendorName}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-700">
                  {item.durationLabel}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 rounded-lg bg-zinc-50 px-3 py-3 text-sm">
            <div className="flex justify-between gap-3 text-zinc-700">
              <span>Total months</span>
              <span className="font-medium tabular-nums">
                {breakdown.items
                  .reduce((sum, item) => sum + item.durationMonths, 0)
                  .toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-zinc-700">
              <span>÷ Contracts measured</span>
              <span className="font-medium tabular-nums">
                {breakdown.measuredContractCount}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-zinc-200/80 pt-2 font-semibold text-zinc-900">
              <span>Average</span>
              <span className="tabular-nums">{avgLabel}</span>
            </div>
          </div>

          {breakdown.excludedWithoutDatesCount > 0 ? (
            <p className="mt-3 text-xs text-zinc-500">
              {breakdown.excludedWithoutDatesCount} contract
              {breakdown.excludedWithoutDatesCount === 1 ? "" : "s"} without
              complete dates excluded.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
