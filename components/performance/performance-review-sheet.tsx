"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { submitPerformanceReview } from "@/app/dashboard/performance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { scoreBgClass, scoreColorClass } from "@/lib/performance/scoring";
import type { PerformanceCriteria } from "@/lib/types/performance";
import { cn } from "@/lib/utils";

export function PerformanceReviewSheet({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  criteria,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  criteria: PerformanceCriteria[];
  onSuccess?: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [overallNotes, setOverallNotes] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [criteriaNotes, setCriteriaNotes] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const activeCriteria = useMemo(
    () => criteria.filter((c) => c.is_active),
    [criteria]
  );

  function setScore(criteriaId: string, score: number) {
    setScores((prev) => ({ ...prev, [criteriaId]: score }));
  }

  function handleSubmit() {
    setError(null);
    const missing = activeCriteria.filter((c) => scores[c.id] == null);
    if (missing.length > 0) {
      setError("Please score every active criteria (1–10).");
      return;
    }

    startTransition(async () => {
      const result = await submitPerformanceReview({
        vendorId,
        reviewPeriod,
        notes: overallNotes,
        scores: activeCriteria.map((c) => ({
          criteriaId: c.id,
          score: scores[c.id],
          notes: criteriaNotes[c.id],
        })),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const message = `Review submitted — ${result.vendorName ?? vendorName} scored ${result.overallScore?.toFixed(1)}/10`;
      onSuccess?.(message);
      onOpenChange(false);
      setReviewPeriod("");
      setOverallNotes("");
      setScores({});
      setCriteriaNotes({});
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-zinc-200 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-zinc-100 px-6 py-5 text-left">
          <SheetTitle className="font-sans text-xl font-semibold text-zinc-900">
            Review {vendorName}
          </SheetTitle>
          <SheetDescription>
            Rate each active criteria from 1 (poor) through 10 (excellent)
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Review period (optional)
            </label>
            <Input
              value={reviewPeriod}
              onChange={(e) => setReviewPeriod(e.target.value)}
              placeholder="e.g. Q2 2026 or May 2026"
              disabled={pending}
            />
          </div>

          {activeCriteria.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No active criteria. Enable criteria on the Performance page first.
            </p>
          ) : (
            activeCriteria.map((criterion) => {
              const selected = scores[criterion.id];
              return (
                <div
                  key={criterion.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                >
                  <div className="mb-3">
                    <p className="font-medium text-zinc-900">{criterion.name}</p>
                    {criterion.description ? (
                      <p className="mt-1 text-sm text-zinc-500">
                        {criterion.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={pending}
                        onClick={() => setScore(criterion.id, n)}
                        className={cn(
                          "size-9 rounded-lg border text-sm font-semibold transition-colors",
                          selected === n
                            ? cn(
                                scoreBgClass(n),
                                scoreColorClass(n),
                                "border-current"
                              )
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <Input
                    className="mt-3 h-9 text-sm"
                    value={criteriaNotes[criterion.id] ?? ""}
                    onChange={(e) =>
                      setCriteriaNotes((prev) => ({
                        ...prev,
                        [criterion.id]: e.target.value,
                      }))
                    }
                    placeholder="Notes for this criteria (optional)"
                    disabled={pending}
                  />
                </div>
              );
            })
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Overall notes
            </label>
            <textarea
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              rows={4}
              disabled={pending}
              placeholder="Summary, highlights, or actions for next period…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={pending || activeCriteria.length === 0}
            onClick={handleSubmit}
            className="w-full bg-[#F97316] text-white hover:bg-[#111827]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
