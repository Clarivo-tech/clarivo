import { addMonths, parseISO, startOfToday } from "date-fns";
import type { ContractData } from "@/lib/types/contracts";

const SHORT_NOTICE_DAYS = 60;

export function inferHasExitClause(summary: string | null): boolean {
  if (!summary?.trim()) return false;
  const s = summary.toLowerCase();
  return /exit clause|termination for convenience|break option|early termination|terminate without cause|cancellation right|right to cancel/.test(
    s
  );
}

function isEndingWithinSixMonths(
  endDate: string | null,
  renewalDate: string | null
): boolean {
  const today = startOfToday();
  const horizon = addMonths(today, 6);
  const candidates = [endDate, renewalDate].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      const date = parseISO(raw);
      if (date >= today && date <= horizon) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export type HealthScoreResult = {
  score: number;
  deductions: string[];
};

export function calculateHealthScore(row: ContractData): HealthScoreResult {
  let score = 10;
  const deductions: string[] = [];

  const noticeDays = row.notice_period_days;
  const shortNotice =
    noticeDays != null && noticeDays < SHORT_NOTICE_DAYS;
  const noticeUnder30 = noticeDays != null && noticeDays < 30;

  if (row.auto_renews && shortNotice) {
    score -= 2;
    deductions.push("Auto-renewal with short notice period (−2)");
  }

  if (noticeUnder30) {
    score -= 2;
    deductions.push("Notice period under 30 days (−2)");
  }

  if (!inferHasExitClause(row.summary)) {
    score -= 1;
    deductions.push("No clear exit clause identified (−1)");
  }

  if (isEndingWithinSixMonths(row.end_date, row.renewal_date)) {
    score -= 1;
    deductions.push("Contract ending within 6 months (−1)");
  }

  return {
    score: Math.max(1, Math.min(10, score)),
    deductions,
  };
}

export function getHealthScoreTier(
  score: number
): "high" | "medium" | "low" {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export const HEALTH_SCORE_TOOLTIP =
  "Score starts at 10. Deductions: auto-renewal with short notice (−2), notice under 30 days (−2), no exit clause (−1), ending within 6 months (−1).";
