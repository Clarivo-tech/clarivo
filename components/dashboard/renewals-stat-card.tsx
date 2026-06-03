"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import type { RenewalListItem } from "@/lib/contracts/renewals-in-range";
import { useCurrency } from "@/components/providers/currency-provider";
import { cn } from "@/lib/utils";

const urgencyDateStyles = {
  urgent: "font-semibold text-[#111827]",
  soon: "font-semibold text-[#F97316]",
  later: "font-semibold text-emerald-600",
} as const;

export function RenewalsStatCard({
  count,
  renewals,
}: {
  count: number;
  renewals: RenewalListItem[];
}) {
  const { formatContractValue } = useCurrency();
  const [expanded, setExpanded] = useState(false);
  const canExpand = count > 0;

  function toggleExpanded() {
    if (!canExpand) return;
    setExpanded((open) => !open);
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-zinc-500">
            Renewals in Next 12 Months
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {canExpand ? (
              <ChevronDown
                className={cn(
                  "size-4 text-zinc-400 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
                aria-hidden
              />
            ) : null}
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#A78BFA]/15">
              <CalendarClock
                className="size-4"
                style={{ color: "#A78BFA" }}
                strokeWidth={2}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          disabled={!canExpand}
          aria-expanded={expanded}
          aria-controls="renewals-stat-list"
          className={cn(
            "mt-3 text-left text-3xl font-bold tracking-tight text-zinc-900 tabular-nums",
            canExpand &&
              "cursor-pointer rounded-md transition-colors hover:text-[#A78BFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/40"
          )}
        >
          {count}
        </button>
      </div>

      {expanded && canExpand ? (
        <div
          id="renewals-stat-list"
          className="mt-2 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <ul className="divide-y divide-zinc-100">
            {renewals.map((item) => {
              const value = formatContractValue(
                item.contractValue,
                item.currency
              );
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.vendorName}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {item.daysUntilLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-right">
                    <span className={urgencyDateStyles[item.urgency]}>
                      {item.renewalDateLabel}
                    </span>
                    <span className="tabular-nums font-medium text-zinc-700">
                      {value.display}
                      {value.originalNote ? (
                        <span className="ml-1 text-xs font-normal text-zinc-500">
                          {value.originalNote}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
