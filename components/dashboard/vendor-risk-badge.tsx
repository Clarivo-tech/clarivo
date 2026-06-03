"use client";

import { formatRiskRating } from "@/lib/vendors/constants";
import { getVendorRiskRatingTooltip } from "@/lib/vendors/risk-rating";
import type { VendorRiskRating } from "@/lib/types/vendors";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const badgeClass = (rating: VendorRiskRating) =>
  cn(
    "inline-flex cursor-default items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
    rating === "low" && "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
    rating === "medium" &&
      "bg-orange-100 text-orange-900 ring-orange-200/80",
    rating === "high" && "bg-red-50 text-red-700 ring-red-200/80",
    rating === "critical" && "bg-red-100 text-red-800 ring-red-300/80"
  );

export function VendorRiskBadge({
  rating,
  className,
  showTooltip = true,
}: {
  rating: VendorRiskRating;
  className?: string;
  showTooltip?: boolean;
}) {
  const label = formatRiskRating(rating);

  if (!showTooltip) {
    return <span className={cn(badgeClass(rating), className)}>{label}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={cn(badgeClass(rating), className)}>
          {label}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs whitespace-pre-wrap text-left leading-relaxed"
        >
          {getVendorRiskRatingTooltip(rating)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
