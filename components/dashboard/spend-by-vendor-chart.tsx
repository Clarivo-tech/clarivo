"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { aggregateSpendByVendor } from "@/lib/contracts/spend-by-vendor";
import { formatGbp } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";

const CHART_COLORS = [
  "#F97316",
  "#38BDF8",
  "#34D399",
  "#A78BFA",
  "#F472B6",
];

type ChartRow = {
  vendor: string;
  value: number;
  label: string;
  color: string;
};

export function SpendByVendorChart({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const spend = aggregateSpendByVendor(contractData);
  const chartData: ChartRow[] = spend.map((row, index) => ({
    vendor: row.vendor,
    value: row.value,
    label: formatGbp(row.value),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <section className="flex h-full min-h-[220px] flex-col rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Spend by Vendor</h2>
      </div>
      <div className="flex flex-1 items-center gap-4 px-4 py-3">
        <div className="h-[120px] w-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="vendor"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={52}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.vendor} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {chartData.map((entry) => (
            <li
              key={entry.vendor}
              className="flex items-center gap-2 text-xs text-zinc-700"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">
                {entry.vendor}
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-zinc-600">
                {entry.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
