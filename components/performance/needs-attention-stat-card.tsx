"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { formatScore } from "@/lib/performance/scoring";
import type { VendorPerformanceOverview } from "@/lib/types/performance";
import { cn } from "@/lib/utils";

export function NeedsAttentionStatCard({
  overviews,
}: {
  overviews: VendorPerformanceOverview[];
}) {
  const [expanded, setExpanded] = useState(false);

  const vendors = useMemo(
    () =>
      overviews
        .filter((o) => o.latestScore != null && o.latestScore < 5)
        .sort((a, b) => (a.latestScore ?? 0) - (b.latestScore ?? 0)),
    [overviews]
  );

  const count = vendors.length;
  const canExpand = count > 0;

  function toggleExpanded() {
    if (!canExpand) return;
    setExpanded((open) => !open);
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-zinc-500">Needs Attention</p>
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
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#ef4444]/15">
              <AlertTriangle
                className="size-4"
                style={{ color: "#ef4444" }}
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
          aria-controls="needs-attention-vendor-list"
          className={cn(
            "mt-3 text-left text-3xl font-bold tracking-tight text-zinc-900 tabular-nums",
            canExpand &&
              "cursor-pointer rounded-md transition-colors hover:text-[#ef4444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/40"
          )}
        >
          {count}
        </button>
        <p className="mt-1.5 text-xs text-zinc-500">Vendors scoring below 5</p>
      </div>

      {expanded && canExpand ? (
        <div
          id="needs-attention-vendor-list"
          className="mt-2 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <ul className="divide-y divide-zinc-100">
            {vendors.map((vendor) => (
              <li key={vendor.vendorId}>
                <Link
                  href={`/dashboard/vendors/${vendor.vendorId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <span className="truncate text-sm font-medium text-zinc-900">
                    {vendor.vendorName}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[#ef4444]">
                    {formatScore(vendor.latestScore)}/10
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
