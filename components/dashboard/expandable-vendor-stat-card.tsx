"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import type { VendorListRow } from "@/lib/types/vendors";
import { cn } from "@/lib/utils";

export function ExpandableVendorStatCard({
  title,
  count,
  vendors,
  icon: Icon,
  iconColor,
  iconBgClassName,
  accentClassName,
}: {
  title: string;
  count: number;
  vendors: VendorListRow[];
  icon: LucideIcon;
  iconColor: string;
  iconBgClassName: string;
  accentClassName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = count > 0;

  function toggleExpanded() {
    if (!canExpand) return;
    setExpanded((open) => !open);
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-zinc-500">{title}</p>
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
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                iconBgClassName
              )}
            >
              <Icon
                className="size-4"
                style={{ color: iconColor }}
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
          aria-controls={`${title.replace(/\s+/g, "-").toLowerCase()}-list`}
          className={cn(
            "mt-3 text-left text-3xl font-bold tracking-tight text-zinc-900 tabular-nums",
            canExpand &&
              cn(
                "cursor-pointer rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2",
                accentClassName
              )
          )}
        >
          {count}
        </button>
      </div>

      {expanded && canExpand ? (
        <div
          id={`${title.replace(/\s+/g, "-").toLowerCase()}-list`}
          className="mt-2 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <ul className="divide-y divide-zinc-100">
            {vendors.map((vendor) => (
              <li key={vendor.id}>
                <Link
                  href={`/dashboard/vendors/${vendor.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <span className="truncate text-sm font-medium text-zinc-900">
                    {vendor.name}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {vendor.contractCount} contract
                    {vendor.contractCount === 1 ? "" : "s"}
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
