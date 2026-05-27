import {
  calculateHealthScore,
  getHealthScoreTier,
  type HealthScoreResult,
} from "@/lib/contracts/health-score";
import type { ContractData } from "@/lib/types/contracts";

export type HealthScoreTier = "high" | "medium" | "low";

export function getHealthScoreForContract(
  row: ContractData
): HealthScoreResult & { tier: HealthScoreTier } {
  const result = calculateHealthScore(row);
  return { ...result, tier: getHealthScoreTier(result.score) };
}

export const healthScoreDotClass: Record<HealthScoreTier, string> = {
  high: "bg-emerald-500",
  medium: "bg-[#F97316]",
  low: "bg-red-500",
};
