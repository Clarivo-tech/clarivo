"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HEALTH_SCORE_CRITERIA,
  HEALTH_SCORE_TIERS,
} from "@/lib/contracts/health-score";
import { computeContractHealthRows } from "@/lib/contracts/health-score-rows";
import type { ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

const cardClassName =
  "overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]";

function HealthScorePill({
  score,
  tier,
}: {
  score: number;
  tier: "high" | "medium" | "low";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[2.5rem] justify-center rounded-md px-2.5 py-1 text-sm font-bold tabular-nums",
        tier === "high" &&
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
        tier === "medium" &&
          "bg-orange-50 text-[#111827] ring-1 ring-orange-200/80",
        tier === "low" && "bg-red-50 text-red-700 ring-1 ring-red-200/80"
      )}
    >
      {score}/10
    </span>
  );
}

function ContractHealthSuggestions({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contract-health/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractData }),
      });

      const payload = (await response.json()) as {
        suggestions?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate suggestions.");
      }

      setSuggestions(payload.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [contractData]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111827] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#F97316]/10">
            <Sparkles className="size-4 text-[#F97316]" />
          </div>
          <div>
            <h2 className="font-sans text-sm font-semibold text-white">
              AI Suggestions
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              How to improve scores across your portfolio
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void fetchSuggestions()}
          disabled={loading}
          className="shrink-0 text-xs text-[#F97316] hover:bg-white/10 hover:text-[#FB923C]"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh
        </Button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin text-[#F97316]" />
            Generating suggestions…
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <Button
              type="button"
              size="sm"
              onClick={() => void fetchSuggestions()}
              className="bg-[#F97316] text-white hover:bg-[#111827]"
            >
              Try again
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((item, index) => (
              <li
                key={`${index}-${item.slice(0, 24)}`}
                className="flex gap-3 text-sm leading-relaxed text-white"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#F97316]"
                  style={{ boxShadow: "0 0 8px rgba(249, 115, 22, 0.8)" }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ContractHealthPageClient({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const healthRows = useMemo(
    () => computeContractHealthRows(contractData),
    [contractData]
  );

  const [expandedId, setExpandedId] = useState<string | null>(
    healthRows[0]?.contractId ?? null
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Contract Health
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Health scores for each vendor, how they are calculated, and AI
          recommendations to strengthen your position.
        </p>
      </div>

      <section className={cardClassName}>
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 className="font-sans text-base font-semibold text-zinc-900">
            Vendor health scores
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sorted lowest to highest — expand a row to see why each score was
            assigned.
          </p>
        </div>

        {healthRows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            Upload contracts to see health scores and recommendations.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {healthRows.map((row) => {
              const isOpen = expandedId === row.contractId;
              return (
                <li key={row.contractId}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isOpen ? null : row.contractId)
                    }
                    className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-orange-50/30"
                    aria-expanded={isOpen}
                  >
                    <HealthScorePill score={row.score} tier={row.tier} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900">
                        {row.vendorName}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.deductions.length === 0
                          ? "No deductions"
                          : `${row.deductions.length} deduction${row.deductions.length === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-zinc-400 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Why this score
                          </p>
                          {row.deductions.length > 0 ? (
                            <ul className="mt-2 space-y-1.5">
                              {row.deductions.map((d) => (
                                <li
                                  key={d}
                                  className="flex gap-2 text-sm text-zinc-700"
                                >
                                  <span className="text-red-500">−</span>
                                  {d}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-emerald-700">
                              No deductions — maximum health score.
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Supporting factors
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {row.strengths.map((s) => (
                              <li
                                key={s}
                                className="flex gap-2 text-sm text-zinc-700"
                              >
                                <span className="text-emerald-600">+</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200/80 pt-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-zinc-500">
                            Notice period
                          </dt>
                          <dd className="mt-0.5 font-medium text-zinc-800">
                            {row.noticePeriodDays != null
                              ? `${row.noticePeriodDays} days`
                              : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-500">
                            Auto-renewal
                          </dt>
                          <dd className="mt-0.5 font-medium text-zinc-800">
                            {row.autoRenews === true
                              ? "Yes"
                              : row.autoRenews === false
                                ? "No"
                                : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-500">
                            Exit clause
                          </dt>
                          <dd className="mt-0.5 font-medium text-zinc-800">
                            {row.hasExitClause ? "Identified" : "Not found"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ContractHealthSuggestions contractData={contractData} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClassName}>
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="font-sans text-base font-semibold text-zinc-900">
              How scoring works
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Every contract starts at 10. Points are deducted for risk factors.
            </p>
          </div>
          <ul className="divide-y divide-zinc-100 px-6 py-2">
            {HEALTH_SCORE_CRITERIA.map((criterion) => (
              <li key={criterion.title} className="flex gap-4 py-4">
                <span className="w-10 shrink-0 text-sm font-bold tabular-nums text-[#F97316]">
                  {criterion.points}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {criterion.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {criterion.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClassName}>
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="font-sans text-base font-semibold text-zinc-900">
              Score bands
            </h2>
          </div>
          <ul className="space-y-4 px-6 py-5">
            {HEALTH_SCORE_TIERS.map((band) => (
              <li
                key={band.tier}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3"
              >
                <HealthScorePill
                  score={
                    band.tier === "high" ? 9 : band.tier === "medium" ? 6 : 3
                  }
                  tier={band.tier}
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {band.label}{" "}
                    <span className="font-normal text-zinc-500">
                      ({band.range})
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{band.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
