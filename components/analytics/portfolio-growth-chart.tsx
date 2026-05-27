"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsChartCard } from "@/components/analytics/analytics-chart-card";
import { useCurrency } from "@/components/providers/currency-provider";
import { computePortfolioGrowth } from "@/lib/analytics/compute-analytics";
import { getCurrencySymbol, normalizeCurrencyCode } from "@/lib/currency/currencies";
import { formatCurrency } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";

function GrowthTooltip({
  active,
  payload,
  baseCurrency,
}: {
  active?: boolean;
  payload?: { payload: { label: string; value: number } }[];
  baseCurrency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400">{point.label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-[#F97316]">
        {formatCurrency(point.value, baseCurrency)}
      </p>
    </div>
  );
}

export function PortfolioGrowthChart({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const { convert, baseCurrency } = useCurrency();

  const data = useMemo(
    () => computePortfolioGrowth(contractData, convert),
    [contractData, convert]
  );

  const currencySymbol = getCurrencySymbol(
    normalizeCurrencyCode(baseCurrency)
  );

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) {
      return `${currencySymbol}${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${currencySymbol}${(value / 1_000).toFixed(0)}k`;
    }
    return formatCurrency(value, baseCurrency);
  };

  if (data.length === 0) {
    return (
      <AnalyticsChartCard title="Portfolio Growth">
        <p className="py-12 text-center text-sm text-zinc-500">
          Add contract values and start dates to track portfolio growth.
        </p>
      </AnalyticsChartCard>
    );
  }

  return (
    <AnalyticsChartCard
      title="Portfolio Growth"
      subtitle="Cumulative committed value by month"
    >
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FB923C" />
              </linearGradient>
              <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickFormatter={formatYAxis}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<GrowthTooltip baseCurrency={baseCurrency} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#portfolioLine)"
              strokeWidth={2.5}
              fill="url(#portfolioFill)"
              dot={{ fill: "#F97316", r: 3, strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: "#F97316",
                stroke: "#fff",
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsChartCard>
  );
}
