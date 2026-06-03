import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import {
  calculateHealthScore,
  getHealthScoreTier,
  inferHasExitClause,
  type HealthScoreResult,
} from "@/lib/contracts/health-score";
import type { ContractData } from "@/lib/types/contracts";

export type ContractHealthRow = {
  contractId: string;
  vendorName: string;
  score: number;
  tier: "high" | "medium" | "low";
  deductions: string[];
  strengths: string[];
  noticePeriodDays: number | null;
  autoRenews: boolean | null;
  hasExitClause: boolean;
};

function buildStrengths(
  row: ContractData,
  deductions: string[]
): string[] {
  const strengths: string[] = [];
  const noticeDays = row.notice_period_days;

  if (deductions.length === 0) {
    strengths.push("No risk factors detected — full score of 10.");
  }

  if (noticeDays != null && noticeDays >= 60) {
    strengths.push(`Notice period of ${noticeDays} days provides lead time.`);
  }

  if (row.auto_renews !== true) {
    strengths.push("Not locked into automatic renewal.");
  } else if (
    noticeDays != null &&
    noticeDays >= 60 &&
    !deductions.some((d) => d.includes("Auto-renewal"))
  ) {
    strengths.push("Auto-renews with adequate notice period.");
  }

  if (inferHasExitClause(row.summary)) {
    strengths.push("Exit or termination flexibility identified in summary.");
  }

  if (
    !deductions.some((d) => d.includes("ending within 6 months")) &&
    row.end_date
  ) {
    strengths.push("No imminent end date within the next six months.");
  }

  return strengths;
}

export function computeContractHealthRows(
  rows: ContractData[]
): ContractHealthRow[] {
  const deduped = dedupeContractDataByContractId(rows);

  return deduped
    .map((row) => {
      const { score, deductions }: HealthScoreResult =
        calculateHealthScore(row);
      return {
        contractId: row.contract_id,
        vendorName: row.vendor_name?.trim() || "Unknown vendor",
        score,
        tier: getHealthScoreTier(score),
        deductions,
        strengths: buildStrengths(row, deductions),
        noticePeriodDays: row.notice_period_days,
        autoRenews: row.auto_renews,
        hasExitClause: inferHasExitClause(row.summary),
      };
    })
    .sort((a, b) => a.score - b.score);
}
