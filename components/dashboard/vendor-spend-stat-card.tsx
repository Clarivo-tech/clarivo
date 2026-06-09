"use client";

import { useEffect, useState } from "react";
import { PoundSterling } from "lucide-react";
import {
  VALUE_VIEW_MODE_STORAGE_KEY,
  VALUE_VIEW_MODES,
  type ValueViewMode,
} from "@/components/dashboard/total-value-stat-card";

const VALUE_VIEW_LABELS: Record<ValueViewMode, string> = {
  total: "Total Vendor Spend",
  annual: "Annual Vendor Spend",
};

function isValueViewMode(value: string): value is ValueViewMode {
  return (VALUE_VIEW_MODES as readonly string[]).includes(value);
}

function formatSpend(value: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function VendorSpendStatCard({
  totalSpend,
  annualSpend,
  baseCurrency,
}: {
  totalSpend: number;
  annualSpend: number;
  baseCurrency: string;
}) {
  const [viewMode, setViewMode] = useState<ValueViewMode>("total");

  useEffect(() => {
    const stored = localStorage.getItem(VALUE_VIEW_MODE_STORAGE_KEY);
    if (stored && isValueViewMode(stored)) {
      setViewMode(stored);
    }
  }, []);

  const displayValue =
    viewMode === "annual"
      ? formatSpend(annualSpend, baseCurrency)
      : formatSpend(totalSpend, baseCurrency);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-zinc-500">
            {VALUE_VIEW_LABELS[viewMode]}
          </p>
          {viewMode === "annual" ? (
            <p className="mt-0.5 text-xs text-zinc-400">
              Estimated yearly spend from contract terms.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <select
            aria-label="Spend view"
            value={viewMode}
            onChange={(e) => {
              const next = e.target.value;
              if (!isValueViewMode(next)) return;
              setViewMode(next);
              localStorage.setItem(VALUE_VIEW_MODE_STORAGE_KEY, next);
            }}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus-visible:border-[#38BDF8] focus-visible:ring-3 focus-visible:ring-[#38BDF8]/30"
          >
            <option value="total">Total spend</option>
            <option value="annual">Annual total</option>
          </select>
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#38BDF8]/15">
            <PoundSterling
              className="size-4"
              style={{ color: "#38BDF8" }}
              strokeWidth={2}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 tabular-nums">
        {displayValue}
      </p>
    </div>
  );
}
