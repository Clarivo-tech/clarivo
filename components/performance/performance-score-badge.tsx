import { formatScore, ragBadgeClass, ragLabel, scoreToRag } from "@/lib/performance/scoring";
import { cn } from "@/lib/utils";

export function PerformanceScoreBadge({
  score,
  rag,
  size = "sm",
}: {
  score: number | null | undefined;
  rag?: "none" | "green" | "amber" | "red" | null;
  size?: "sm" | "lg";
}) {
  const resolvedRag = rag && rag !== "none" ? rag : scoreToRag(score);

  if (score == null && resolvedRag === "none") {
    return (
      <span
        className={cn(
          "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
          ragBadgeClass("none")
        )}
      >
        Not reviewed
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-semibold tabular-nums",
        ragBadgeClass(resolvedRag),
        size === "lg" ? "px-3 py-1 text-lg" : "px-2 py-0.5 text-xs"
      )}
    >
      {formatScore(score)}/10
      <span className="font-normal opacity-80">· {ragLabel(resolvedRag)}</span>
    </span>
  );
}
