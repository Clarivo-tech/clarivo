"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PerformanceReviewSheet } from "@/components/performance/performance-review-sheet";
import { PerformanceScoreBadge } from "@/components/performance/performance-score-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  formatScore,
  scoreColorClass,
} from "@/lib/performance/scoring";
import type { PerformanceCriteria, PerformanceReview } from "@/lib/types/performance";
import type { Vendor } from "@/lib/types/vendors";
import { cn } from "@/lib/utils";

const chartCardClass =
  "border-zinc-200/80 bg-[#111827] text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]";

export function VendorPerformanceSection({
  vendor,
  reviews,
  criteria,
}: {
  vendor: Vendor;
  reviews: PerformanceReview[];
  criteria: PerformanceCriteria[];
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const score =
    vendor.performance_score != null
      ? Number(vendor.performance_score)
      : reviews[0]?.overall_score != null
        ? Number(reviews[0].overall_score)
        : null;

  const chartData = [...reviews]
    .sort(
      (a, b) =>
        new Date(a.reviewed_at).getTime() - new Date(b.reviewed_at).getTime()
    )
    .slice(-5)
    .map((r) => ({
      label: r.review_period ?? formatDate(r.reviewed_at),
      score: Number(r.overall_score),
    }));

  return (
    <Card className="border-zinc-200/80 bg-white shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle className="font-sans text-base font-semibold text-zinc-900">
          Performance
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-[#F97316] text-white hover:bg-[#111827]"
            onClick={() => setReviewOpen(true)}
          >
            Review Now
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            render={
              <Link href={`/dashboard/performance?vendor=${vendor.id}`} />
            }
          >
            View all reviews
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {toast ? (
          <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-zinc-800">
            {toast}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Current score
            </p>
            <p
              className={cn(
                "mt-1 text-4xl font-bold tabular-nums",
                scoreColorClass(score)
              )}
            >
              {score != null ? formatScore(score) : "—"}
              <span className="text-lg text-zinc-400">/10</span>
            </p>
          </div>
          <PerformanceScoreBadge
            score={score}
            rag={vendor.performance_rag}
            size="lg"
          />
          <div>
            <p className="text-xs text-zinc-500">Last reviewed</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              {vendor.last_reviewed_at
                ? formatDate(vendor.last_reviewed_at)
                : "Never"}
            </p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <Card className={chartCardClass}>
            <CardHeader className="pb-0">
              <CardTitle className="font-sans text-sm font-medium text-zinc-300">
                Score trend (last {chartData.length} reviews)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#e4e4e7" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={{ fill: "#F97316", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-zinc-500">
            No reviews yet. Submit your first review to see trends.
          </p>
        )}
      </CardContent>

      <PerformanceReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        vendorId={vendor.id}
        vendorName={vendor.name}
        criteria={criteria}
        onSuccess={(msg) => {
          setToast(msg);
          window.setTimeout(() => setToast(null), 5000);
        }}
      />
    </Card>
  );
}
