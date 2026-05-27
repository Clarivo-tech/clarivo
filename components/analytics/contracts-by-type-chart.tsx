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

const BAR_COLOR = "#F97316";

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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400">{point.type}</p>
      <p className="mt-1 text-sm font-bold text-[#F97316]">
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
            <CartesianGrid stroke="#1f2937" horizontal={false} />
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
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TypeTooltip />} cursor={{ fill: "#1f2937" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsChartCard>
  );
}
