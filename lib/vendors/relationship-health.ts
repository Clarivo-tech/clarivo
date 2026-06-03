import { calculateHealthScore } from "@/lib/contracts/health-score";
import type { ContractData } from "@/lib/types/contracts";
import type { Vendor, VendorRiskRating } from "@/lib/types/vendors";

const RISK_PENALTY: Record<VendorRiskRating, number> = {
  low: 0,
  medium: 12,
  high: 28,
  critical: 42,
};

export type RelationshipHealthTier = "high" | "medium" | "low";

export function calculateVendorRelationshipHealth(
  vendor: Vendor,
  contractRows: ContractData[]
): { score: number; tier: RelationshipHealthTier } {
  const activeCount = contractRows.filter((r) => r.status === "active").length;
  const healthScores = contractRows.map((r) => calculateHealthScore(r).score);
  const avgHealth =
    healthScores.length > 0
      ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
      : 5;

  const riskPenalty = RISK_PENALTY[vendor.risk_rating] ?? 12;

  let score = Math.round(
    (avgHealth / 10) * 45 + Math.min(activeCount * 7, 28) + 27 - riskPenalty
  );

  if (vendor.is_critical && activeCount === 0) score -= 12;
  if (vendor.is_single_source) score -= 6;
  if (contractRows.length === 0) score = Math.min(score, 45);

  const clamped = Math.max(0, Math.min(100, score));

  const tier: RelationshipHealthTier =
    clamped >= 70 ? "high" : clamped >= 40 ? "medium" : "low";

  return { score: clamped, tier };
}

export function relationshipHealthColor(tier: RelationshipHealthTier): string {
  if (tier === "high") return "text-emerald-600";
  if (tier === "medium") return "text-[#111827]";
  return "text-red-600";
}

export function relationshipHealthBg(tier: RelationshipHealthTier): string {
  if (tier === "high") return "bg-emerald-50 ring-emerald-200/80";
  if (tier === "medium") return "bg-zinc-100 ring-zinc-200/80";
  return "bg-red-50 ring-red-200/80";
}
