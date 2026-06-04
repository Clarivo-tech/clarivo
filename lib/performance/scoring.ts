export type PerformanceRag = "none" | "green" | "amber" | "red";

export function scoreToRag(score: number | null | undefined): PerformanceRag {
  if (score == null || Number.isNaN(score)) return "none";
  if (score >= 8) return "green";
  if (score >= 5) return "amber";
  return "red";
}

export function scoreColorClass(score: number | null | undefined): string {
  const rag = scoreToRag(score);
  if (rag === "green") return "text-[#22c55e]";
  if (rag === "amber") return "text-[#F97316]";
  if (rag === "red") return "text-[#ef4444]";
  return "text-zinc-400";
}

export function scoreBgClass(score: number | null | undefined): string {
  const rag = scoreToRag(score);
  if (rag === "green") return "bg-[#22c55e]/10";
  if (rag === "amber") return "bg-[#F97316]/10";
  if (rag === "red") return "bg-[#ef4444]/10";
  return "bg-zinc-100";
}

export function ragBadgeClass(rag: PerformanceRag): string {
  switch (rag) {
    case "green":
      return "bg-[#22c55e]/15 text-[#16a34a] border-[#22c55e]/30";
    case "amber":
      return "bg-[#F97316]/15 text-[#C2410C] border-[#F97316]/30";
    case "red":
      return "bg-[#ef4444]/15 text-[#dc2626] border-[#ef4444]/30";
    default:
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
  }
}

export function ragLabel(rag: PerformanceRag): string {
  switch (rag) {
    case "green":
      return "Green";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    default:
      return "Not reviewed";
  }
}

export function calculateWeightedScore(
  entries: Array<{ score: number; weight: number }>
): number {
  if (entries.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const entry of entries) {
    weightedSum += entry.score * entry.weight;
    weightTotal += entry.weight;
  }
  if (weightTotal === 0) return 0;
  return Math.round((weightedSum / weightTotal) * 100) / 100;
}

export function formatScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  return score.toFixed(1);
}

export function trendPercent(
  current: number | null,
  previous: number | null
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
