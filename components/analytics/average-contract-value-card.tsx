"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { useCurrency } from "@/components/providers/currency-provider";
import { computeAverageValueBreakdown } from "@/lib/analytics/compute-analytics";
import { formatCurrency } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

export function AverageContractValueCard({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const { convert, baseCurrency, formatContractValue } = useCurrency();
  const [open, setOpen] = useState(false);

  const breakdown = useMemo(
    () => computeAverageValueBreakdown(contractData, convert),
    [contractData, convert]
  );

  const avgLabel =
    breakdown.average != null
      ? formatCurrency(breakdown.average, baseCurrency)
      : "—";

  const footnote =
    breakdown.valuedContractCount > 0
      ? `Across ${breakdown.valuedContractCount} contract${breakdown.valuedContractCount === 1 ? "" : "s"} with a value`
      : "No contract values on file";

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-shadow",
        open && "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full flex-col p-5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-zinc-500">
            Average Contract Value
          </p>
          <div className="flex items-center gap-1.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/15">
              <Wallet
                className="size-4"
                style={{ color: "#F97316" }}
                strokeWidth={2}
              />
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-zinc-400 transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 tabular-nums">
          {avgLabel}
        </p>
        <p className="mt-1.5 text-xs text-zinc-500">{footnote}</p>
        <p className="mt-2 text-xs font-medium text-[#F97316]">
          {open ? "Hide calculation" : "View calculation"}
        </p>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
          <p className="text-xs text-zinc-600">
            Each contract value is converted to {baseCurrency}, summed, then
            divided by the number of contracts that have a value.
          </p>

          {breakdown.valuedContractCount === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Add contract values on your documents to see the breakdown.
            </p>
          ) : (
            <>
              <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                {breakdown.items.map((item) => {
                  const formatted = formatContractValue(
                    item.originalValue,
                    item.originalCurrency
                  );
                  return (
                    <li
                      key={item.contractId}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium text-zinc-800">
                        {item.vendorName}
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-zinc-700">
                        {formatted.display}
                        {formatted.originalNote ? (
                          <span className="block text-xs font-normal text-zinc-500">
                            {formatted.originalNote}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 space-y-1.5 rounded-lg bg-zinc-50 px-3 py-3 text-sm">
                <div className="flex justify-between gap-3 text-zinc-700">
                  <span>Total ({baseCurrency})</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(breakdown.sumConverted, baseCurrency)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-zinc-700">
                  <span>÷ Contracts with value</span>
                  <span className="font-medium tabular-nums">
                    {breakdown.valuedContractCount}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-zinc-200/80 pt-2 font-semibold text-zinc-900">
                  <span>Average</span>
                  <span className="tabular-nums">{avgLabel}</span>
                </div>
              </div>
            </>
          )}

          {breakdown.excludedWithoutValueCount > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              {breakdown.excludedWithoutValueCount} contract
              {breakdown.excludedWithoutValueCount === 1 ? "" : "s"} without a
              value excluded from this average.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
