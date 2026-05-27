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
import { buildSpendChartPoints } from "@/lib/contracts/spend-chart-data";
import { useCurrency } from "@/components/providers/currency-provider";
import type { ContractData } from "@/lib/types/contracts";
import { formatCurrency } from "@/lib/format";

type ChartPoint = {
  xLabel: string;
  value: number;
  vendor?: string;
};

function GlowingDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="#38BDF8" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill="#F97316" fillOpacity={0.35} />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#38BDF8"
        stroke="#F97316"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.9))" }}
      />
    </g>
  );
}

function SpendTooltip({
  active,
  payload,
  baseCurrency,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  baseCurrency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-medium text-zinc-500">{point.xLabel}</p>
      {point.vendor ? (
        <p className="mt-0.5 text-sm font-semibold text-zinc-900">{point.vendor}</p>
      ) : null}
      <p className="mt-1 text-sm font-bold tabular-nums text-[#F97316]">
        {formatCurrency(point.value, baseCurrency)}
      </p>
    </div>
  );
}

function SinglePointView({
  point,
  baseCurrency,
}: {
  point: ChartPoint;
  baseCurrency: string;
}) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center px-4">
      <div className="relative flex flex-col items-center">
        <div
          className="absolute size-16 rounded-full bg-[#38BDF8]/20 blur-xl"
          aria-hidden
        />
        <div
          className="absolute size-10 rounded-full bg-[#F97316]/25 blur-lg"
          aria-hidden
        />
        <div
          className="relative size-4 rounded-full border-2 border-[#F97316] bg-[#38BDF8]"
          style={{
            boxShadow:
              "0 0 16px rgba(56, 189, 248, 0.9), 0 0 8px rgba(249, 115, 22, 0.6)",
          }}
        />
        <p className="mt-6 text-2xl font-bold tabular-nums text-zinc-900">
          {formatCurrency(point.value, baseCurrency)}
        </p>
        <p className="mt-1 max-w-[200px] truncate text-center text-sm text-zinc-500">
          {point.vendor ?? point.xLabel}
        </p>
      </div>
    </div>
  );
}

export function SpendByVendorChart({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const { convert, baseCurrency } = useCurrency();

  const { points, mode } = useMemo(
    () => buildSpendChartPoints(contractData, convert),
    [contractData, convert]
  );

  const chartData: ChartPoint[] = useMemo(
    () =>
      points.map((p) => ({
        xLabel: p.xLabel,
        value: p.value,
        vendor: p.vendor,
      })),
    [points]
  );

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) {
      return formatCurrency(value / 1_000_000, baseCurrency).replace(
        /\d[\d,.]*/,
        (m) => `${m}M`
      );
    }
    if (value >= 1_000) {
      const formatted = formatCurrency(value / 1_000, baseCurrency);
      return formatted.replace(/\d[\d,.]*/, (m) => `${m}k`);
    }
    return formatCurrency(value, baseCurrency);
  };

  const truncateLabel = (label: string) =>
    label.length > 14 ? `${label.slice(0, 12)}…` : label;

  return (
    <section className="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Spend by Vendor</h2>
        {chartData.length > 1 && (
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {mode === "timeline"
              ? "Portfolio value by contract start month"
              : "Total value per vendor"}
          </p>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <p className="text-sm text-zinc-500">
            Add contract values to see spend trends.
          </p>
        </div>
      ) : chartData.length === 1 ? (
        <SinglePointView point={chartData[0]} baseCurrency={baseCurrency} />
      ) : (
        <div className="h-[240px] w-full bg-white px-3 pb-3 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              style={{ background: "#ffffff" }}
            >
              <defs>
                <linearGradient
                  id="spendLineGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
                <linearGradient
                  id="spendAreaFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.28} />
                  <stop offset="55%" stopColor="#38BDF8" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#e4e4e7"
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis
                dataKey="xLabel"
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickFormatter={truncateLabel}
                axisLine={false}
                tickLine={false}
                dy={8}
                interval={0}
                angle={chartData.length > 4 ? -28 : 0}
                textAnchor={chartData.length > 4 ? "end" : "middle"}
                height={chartData.length > 4 ? 52 : 28}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={formatYAxis}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                content={
                  <SpendTooltip baseCurrency={baseCurrency} />
                }
                cursor={{
                  stroke: "#d4d4d8",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#spendLineGradient)"
                strokeWidth={2.5}
                fill="url(#spendAreaFill)"
                dot={<GlowingDot />}
                activeDot={<GlowingDot />}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
