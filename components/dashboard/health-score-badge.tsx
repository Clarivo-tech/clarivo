"use client";

import {
  calculateHealthScore,
  getHealthScoreTier,
  HEALTH_SCORE_TOOLTIP,
} from "@/lib/contracts/health-score";
import type { ContractData } from "@/lib/types/contracts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function HealthScoreBadge({ row }: { row: ContractData }) {
  const { score, deductions } = calculateHealthScore(row);
  const tier = getHealthScoreTier(score);

  const tooltipBody =
    deductions.length > 0
      ? `${HEALTH_SCORE_TOOLTIP}\n\nThis contract: ${deductions.join("; ")}.`
      : HEALTH_SCORE_TOOLTIP;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex min-w-[2rem] cursor-default items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
            tier === "high" &&
              "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
            tier === "medium" &&
              "bg-orange-50 text-[#111827] ring-1 ring-orange-200/80",
            tier === "low" &&
              "bg-red-50 text-red-700 ring-1 ring-red-200/80"
          )}
        >
          {score}
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="max-w-xs whitespace-pre-wrap text-left leading-relaxed"
        >
          {tooltipBody}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
