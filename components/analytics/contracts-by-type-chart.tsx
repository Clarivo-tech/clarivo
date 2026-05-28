"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsChartCard } from "@/components/analytics/analytics-chart-card";
import { computeTypeBreakdown } from "@/lib/analytics/compute-analytics";
import type { ContractData } from "@/lib/types/contracts";

const BRIGHT_COLORS = [
  "#F97316",
  "#38BDF8",
  "#A855F7",
  "#22C55E",
  "#EF4444",
  "#EAB308",
  "#06B6D4",
  "#EC4899",
];

function TypeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { type: string; count: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-500">{point.type}</p>
      <p className="mt-1 text-sm font-bold text-zinc-900">
        {point.count} contract{point.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function ContractsByTypeChart({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const data = useMemo(
    () => computeTypeBreakdown(contractData),
    [contractData]
  );

  const chartHeight = Math.max(200, data.length * 36);

  if (data.length === 0) {
    return (
      <AnalyticsChartCard title="Contracts by Type">
        <p className="py-12 text-center text-sm text-zinc-500">
          Contract types appear after extraction from uploaded files.
        </p>
      </AnalyticsChartCard>
    );
  }

  return (
    <AnalyticsChartCard title="Contracts by Type">
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="type"
              width={120}
              tick={{ fill: "#52525b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TypeTooltip />} cursor={{ fill: "#f4f4f5" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.type}
                  fill={BRIGHT_COLORS[index % BRIGHT_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsChartCard>
  );
}
