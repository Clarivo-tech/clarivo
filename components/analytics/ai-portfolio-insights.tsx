"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import type { ContractData } from "@/lib/types/contracts";

export function AiPortfolioInsights({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const rows = useMemo(
    () => dedupeContractDataByContractId(contractData),
    [contractData]
  );
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractData: rows }),
      });

      const payload = (await response.json()) as {
        insights?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate insights.");
      }

      setInsights(payload.insights ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [rows]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111827] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#F97316]/10">
            <Sparkles className="size-4 text-[#F97316]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              AI Portfolio Insights
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Generated from your contract portfolio by Clarivo AI
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void fetchInsights()}
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
            Analysing your portfolio…
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <Button
              type="button"
              size="sm"
              onClick={() => void fetchInsights()}
              className="bg-[#F97316] text-white hover:bg-[#EA580C]"
            >
              Try again
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight, index) => (
              <li
                key={`${index}-${insight.slice(0, 24)}`}
                className="flex gap-3 text-sm leading-relaxed text-white"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#F97316]"
                  style={{ boxShadow: "0 0 8px rgba(249, 115, 22, 0.8)" }}
                />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
