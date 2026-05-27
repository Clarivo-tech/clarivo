"use client";

import { useMemo } from "react";
import { AnalyticsChartCard } from "@/components/analytics/analytics-chart-card";
import {
  computeTimelineBars,
  formatTimelineRangeLabel,
  timelineStatusColor,
  type TimelineBarStatus,
} from "@/lib/analytics/compute-analytics";
import type { ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TimelineBarStatus, string> = {
  active: "Active",
  expiring: "Expiring soon",
  future: "Future",
};

export function ContractLifecycleTimeline({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const timeline = useMemo(
    () => computeTimelineBars(contractData),
    [contractData]
  );

  if (!timeline || timeline.bars.length === 0) {
    return (
      <AnalyticsChartCard title="Contract Lifecycle Timeline">
        <p className="py-8 text-center text-sm text-zinc-500">
          Add start and end dates to contracts to see the lifecycle timeline.
        </p>
      </AnalyticsChartCard>
    );
  }

  const { bars, rangeStart, rangeEnd } = timeline;
  const rangeLabel = formatTimelineRangeLabel(rangeStart, rangeEnd);

  return (
    <AnalyticsChartCard
      title="Contract Lifecycle Timeline"
      subtitle={rangeLabel}
    >
      <div className="mb-4 flex flex-wrap gap-4 text-[11px] text-zinc-400">
        {(["active", "expiring", "future"] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: timelineStatusColor(status) }}
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rotate-45 bg-white/80" />
          Renewal date
        </span>
      </div>

      <div className="relative border-b border-zinc-700 pb-1">
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>{rangeLabel.split(" – ")[0]}</span>
          <span>{rangeLabel.split(" – ")[1]}</span>
        </div>
      </div>

      <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
        {bars.map((bar) => (
          <div
            key={bar.contractId}
            className="grid grid-cols-[minmax(0,140px)_1fr] items-center gap-3"
          >
            <p
              className="truncate text-xs font-medium text-zinc-300"
              title={bar.vendorName}
            >
              {bar.vendorName}
            </p>
            <div className="relative h-7 rounded-md bg-zinc-900/80">
              <div
                className={cn(
                  "absolute top-1/2 h-5 -translate-y-1/2 rounded-md shadow-sm transition-opacity"
                )}
                style={{
                  left: `${bar.leftPercent}%`,
                  width: `${bar.widthPercent}%`,
                  backgroundColor: timelineStatusColor(bar.status),
                  boxShadow: `0 0 12px ${timelineStatusColor(bar.status)}40`,
                }}
                title={`${bar.vendorName} (${STATUS_LABELS[bar.status]})`}
              />
              {bar.renewalLeftPercent != null ? (
                <div
                  className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/90 bg-zinc-950"
                  style={{
                    left: `${bar.renewalLeftPercent}%`,
                    boxShadow: "0 0 8px rgba(255,255,255,0.5)",
                  }}
                  title="Renewal date"
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </AnalyticsChartCard>
  );
}
