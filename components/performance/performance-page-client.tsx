"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  addCustomCriteria,
  toggleCriteriaActive,
  updateCriteriaWeight,
} from "@/app/dashboard/performance/actions";
import { NeedsAttentionStatCard } from "@/components/performance/needs-attention-stat-card";
import { PerformanceReviewSheet } from "@/components/performance/performance-review-sheet";
import { PerformanceScoreBadge } from "@/components/performance/performance-score-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import {
  formatScore,
  scoreColorClass,
} from "@/lib/performance/scoring";
import type {
  PerformanceCriteria,
  PerformancePageStats,
  ReviewWithVendor,
  VendorPerformanceOverview,
} from "@/lib/types/performance";
import type { Vendor } from "@/lib/types/vendors";
import {
  CRITERIA_WEIGHT_MAX,
  CRITERIA_WEIGHT_MIN,
} from "@/lib/performance/constants";
import { cn } from "@/lib/utils";

const WEIGHT_OPTIONS = Array.from(
  { length: CRITERIA_WEIGHT_MAX - CRITERIA_WEIGHT_MIN + 1 },
  (_, i) => CRITERIA_WEIGHT_MIN + i
);

function CriteriaWeightSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: number;
  disabled?: boolean;
  onChange: (weight: number) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "h-8 rounded-md border border-zinc-200 px-2 text-sm",
        className
      )}
      aria-label="Criteria importance weight (1-10)"
    >
      {WEIGHT_OPTIONS.map((w) => (
        <option key={w} value={w}>
          {w}
        </option>
      ))}
    </select>
  );
}

const cardClass =
  "border-zinc-200/80 bg-[#111827] text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]";

function TrendCell({ overview }: { overview: VendorPerformanceOverview }) {
  const { trendPercent: pct, latestScore, previousScore } = overview;
  if (latestScore == null || previousScore == null || pct == null) {
    return <span className="text-zinc-400">—</span>;
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[#22c55e]">
        <ArrowUp className="size-4" />
        {pct}%
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[#ef4444]">
        <ArrowDown className="size-4" />
        {Math.abs(pct)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-zinc-400">
      <Minus className="size-4" />
      0%
    </span>
  );
}

export function PerformancePageClient({
  stats,
  vendors,
  overviews,
  criteria,
  recentReviews,
  filterVendorId,
  filterVendorName,
}: {
  stats: PerformancePageStats;
  vendors: Vendor[];
  overviews: VendorPerformanceOverview[];
  criteria: PerformanceCriteria[];
  recentReviews: ReviewWithVendor[];
  filterVendorId?: string;
  filterVendorName?: string;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [reviewVendor, setReviewVendor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newWeight, setNewWeight] = useState(5);
  const [pending, startTransition] = useTransition();
  const [selectedVendorId, setSelectedVendorId] = useState(
    filterVendorId ?? ""
  );

  const overviewByVendorId = useMemo(
    () => new Map(overviews.map((o) => [o.vendorId, o])),
    [overviews]
  );

  const vendorPickerOptions = useMemo(
    () =>
      [...vendors]
        .map((v) => {
          const overview = overviewByVendorId.get(v.id);
          return {
            id: v.id,
            name: v.name,
            latestScore: overview?.latestScore ?? null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [vendors, overviewByVendorId]
  );

  const sortedOverviews = useMemo(
    () =>
      [...overviews].sort((a, b) =>
        (b.latestScore ?? -1) - (a.latestScore ?? -1) !== 0
          ? (b.latestScore ?? -1) - (a.latestScore ?? -1)
          : a.vendorName.localeCompare(b.vendorName)
      ),
    [overviews]
  );

  const canStartReview = Boolean(
    selectedVendorId &&
      vendorPickerOptions.some((v) => v.id === selectedVendorId)
  );

  function showSuccess(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }

  function openReview(vendorId: string, vendorName: string) {
    setReviewVendor({ id: vendorId, name: vendorName });
  }

  function startReviewFromDropdown() {
    const picked = vendorPickerOptions.find((v) => v.id === selectedVendorId);
    if (!picked) return;
    openReview(picked.id, picked.name);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      {toast ? (
        <div
          role="status"
          className="fixed top-6 right-6 z-50 max-w-sm rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Vendor Performance
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Track and score your vendors against key performance criteria
        </p>
        {filterVendorId && filterVendorName ? (
          <p className="mt-2 text-sm text-[#F97316]">
            Filtered to{" "}
            <Link
              href={`/dashboard/vendors/${filterVendorId}`}
              className="font-medium underline"
            >
              {filterVendorName}
            </Link>
            {" · "}
            <Link href="/dashboard/performance" className="underline">
              Show all vendors
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Average Portfolio Score"
          value={
            stats.averagePortfolioScore != null
              ? `${formatScore(stats.averagePortfolioScore)}/10`
              : "—"
          }
          icon={TrendingUp}
          iconColor="#38BDF8"
          iconBgClassName="bg-[#38BDF8]/15"
        />
        <StatCard
          title="Top Performer"
          value={stats.topPerformerName ?? "—"}
          icon={TrendingUp}
          iconColor="#22c55e"
          iconBgClassName="bg-[#22c55e]/15"
          footnote={
            stats.topPerformerScore != null
              ? `${formatScore(stats.topPerformerScore)}/10`
              : undefined
          }
        />
        <NeedsAttentionStatCard overviews={overviews} />
        <StatCard
          title="Total Reviews"
          value={String(stats.totalReviews)}
          icon={TrendingUp}
          iconColor="#F97316"
          iconBgClassName="bg-[#F97316]/15"
        />
      </div>

      <Card className="border-orange-100/80 bg-gradient-to-br from-orange-50/80 to-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-sans text-lg font-semibold text-zinc-900">
            Score a vendor
          </CardTitle>
          <CardDescription>
            Choose a vendor, then rate each criteria from 1 (poor) to 10
            (excellent). Criteria importance uses a separate 1–10 weight.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <label
              htmlFor="review-vendor-select"
              className="text-sm font-medium text-zinc-700"
            >
              Vendor
            </label>
            <select
              id="review-vendor-select"
              value={selectedVendorId}
              disabled={vendorPickerOptions.length === 0}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">
                {vendorPickerOptions.length === 0
                  ? "No vendors available"
                  : "Select a vendor…"}
              </option>
              {vendorPickerOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.latestScore != null
                    ? ` — ${formatScore(row.latestScore)}/10`
                    : ""}
                </option>
              ))}
            </select>
            {vendorPickerOptions.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Vendors are created from extracted contract vendor names. Upload
                contracts on{" "}
                <Link
                  href="/dashboard/docs"
                  className="font-medium text-[#F97316] underline"
                >
                  Documents
                </Link>{" "}
                or add them manually on{" "}
                <Link
                  href="/dashboard/vendors"
                  className="font-medium text-[#F97316] underline"
                >
                  Vendors
                </Link>
                .
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={!canStartReview}
            className={cn(
              "h-11 shrink-0 px-6",
              canStartReview
                ? "bg-[#F97316] text-white hover:bg-[#111827]"
                : "cursor-not-allowed bg-zinc-200 text-zinc-500 hover:bg-zinc-200"
            )}
            onClick={startReviewFromDropdown}
          >
            Start review
          </Button>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-sans text-lg font-semibold">
            Vendor Performance Overview
          </CardTitle>
          <CardDescription>
            Latest scores and trends across your vendor portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-2">
          {sortedOverviews.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-zinc-500">
              No vendors yet. They are synced from vendor names on your uploaded
              contracts — try refreshing after extraction completes, or{" "}
              <Link
                href="/dashboard/vendors"
                className="font-medium text-[#F97316] underline"
              >
                add a vendor
              </Link>{" "}
              manually.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100">
                  <TableHead>Vendor</TableHead>
                  <TableHead>Latest score</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Last reviewed</TableHead>
                  <TableHead>RAG</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOverviews.map((row) => (
                  <TableRow key={row.vendorId} className="border-zinc-100">
                    <TableCell>
                      <Link
                        href={`/dashboard/vendors/${row.vendorId}`}
                        className="font-medium text-zinc-900 hover:text-[#F97316]"
                      >
                        {row.vendorName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          scoreColorClass(row.latestScore)
                        )}
                      >
                        {row.latestScore != null
                          ? formatScore(row.latestScore)
                          : "—"}
                      </span>
                      <span className="text-sm text-zinc-400">/10</span>
                    </TableCell>
                    <TableCell>
                      <TrendCell overview={row} />
                    </TableCell>
                    <TableCell>{row.reviewCount}</TableCell>
                    <TableCell className="text-zinc-600">
                      {row.lastReviewedAt
                        ? formatDate(row.lastReviewedAt)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <PerformanceScoreBadge
                        score={row.latestScore}
                        rag={row.rag}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#F97316] text-white hover:bg-[#111827]"
                        onClick={() => {
                          setSelectedVendorId(row.vendorId);
                          openReview(row.vendorId, row.vendorName);
                        }}
                      >
                        Review Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-sans text-lg font-semibold">
              Performance Criteria
            </CardTitle>
            <CardDescription>
              Clarivo defaults plus your custom criteria. Importance weight
              (1–10) affects how much each criteria counts toward the overall
              score.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddCriteria((v) => !v)}
          >
            <Plus className="size-4" />
            Add Custom Criteria
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddCriteria ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Criteria name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={pending}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={pending}
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600">
                    Importance (1–10)
                  </label>
                  <CriteriaWeightSelect
                    value={newWeight}
                    disabled={pending}
                    onChange={setNewWeight}
                    className="h-10"
                  />
                </div>
              </div>
              <Button
                type="button"
                className="mt-3 bg-[#F97316] text-white hover:bg-[#111827]"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await addCustomCriteria({
                      name: newName,
                      description: newDescription,
                      weight: newWeight,
                    });
                    if (result.error) {
                      window.alert(result.error);
                      return;
                    }
                    setNewName("");
                    setNewDescription("");
                    setShowAddCriteria(false);
                    router.refresh();
                  });
                }}
              >
                Save criteria
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-900">{c.name}</p>
                    {c.is_default ? (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        Default
                      </span>
                    ) : null}
                    {!c.is_active ? (
                      <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  {c.description ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      {c.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      disabled={pending}
                      onChange={(e) => {
                        startTransition(async () => {
                          await toggleCriteriaActive(c.id, e.target.checked);
                          router.refresh();
                        });
                      }}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    Importance (1–10)
                    <CriteriaWeightSelect
                      value={c.weight}
                      disabled={pending}
                      onChange={(weight) => {
                        startTransition(async () => {
                          await updateCriteriaWeight(c.id, weight);
                          router.refresh();
                        });
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="font-sans text-lg font-semibold text-white">
            Recent Reviews
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Latest performance reviews across all vendors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReviews.length === 0 ? (
            <p className="text-sm text-zinc-400">No reviews submitted yet.</p>
          ) : (
            recentReviews.map((review) => {
              const expanded = expandedReviewId === review.id;
              return (
                <div
                  key={review.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 text-left"
                    onClick={() =>
                      setExpandedReviewId(expanded ? null : review.id)
                    }
                  >
                    <div>
                      <p className="font-medium text-white">
                        {review.vendorName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDate(review.reviewed_at)}
                        {review.review_period
                          ? ` · ${review.review_period}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xl font-bold tabular-nums",
                          scoreColorClass(
                            review.overall_score != null
                              ? Number(review.overall_score)
                              : null
                          )
                        )}
                      >
                        {formatScore(
                          review.overall_score != null
                            ? Number(review.overall_score)
                            : null
                        )}
                        /10
                      </span>
                      {expanded ? (
                        <ChevronUp className="size-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="size-4 text-zinc-400" />
                      )}
                    </div>
                  </button>
                  {review.notes && !expanded ? (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
                      {review.notes}
                    </p>
                  ) : null}
                  {expanded && review.notes ? (
                    <p className="mt-3 text-sm text-zinc-200 whitespace-pre-wrap">
                      {review.notes}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {reviewVendor ? (
        <PerformanceReviewSheet
          open={Boolean(reviewVendor)}
          onOpenChange={(open) => !open && setReviewVendor(null)}
          vendorId={reviewVendor.id}
          vendorName={reviewVendor.name}
          criteria={criteria}
          onSuccess={showSuccess}
        />
      ) : null}
    </div>
  );
}
