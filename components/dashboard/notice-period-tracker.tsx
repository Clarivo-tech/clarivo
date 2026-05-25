"use client";

import { Bell } from "lucide-react";
import { buildNoticePeriodItems } from "@/lib/contracts/notice-period";
import type { ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

const statusStyles = {
  expired: "border-red-200 bg-red-50 text-red-800",
  warning: "border-orange-200 bg-orange-50 text-[#C2410C]",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const;

export function NoticePeriodTracker({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const items = buildNoticePeriodItems(contractData);

  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-[#F97316]" />
          <h2 className="text-base font-semibold text-zinc-900">
            Notice period tracker
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Latest date to give notice before renewal.
        </p>
      </div>
      <div className="p-6">
        {items.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No notice deadlines — renewal date or notice period missing.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={`${item.contractId}-${item.deadlineLabel}`}
                className={cn(
                  "rounded-lg border p-4",
                  statusStyles[item.status]
                )}
              >
                <p className="text-sm font-semibold">{item.vendorName}</p>
                <p className="mt-1 text-[13px] opacity-90">
                  Notice deadline: {item.deadlineLabel}
                </p>
                <p className="mt-2 text-xs font-medium">{item.statusLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
