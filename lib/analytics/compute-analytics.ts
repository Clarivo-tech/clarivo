import {
  addDays,
  differenceInCalendarDays,
  differenceInMonths,
  format,
  isAfter,
  isBefore,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { inferHasExitClause } from "@/lib/contracts/health-score";
import {
  calculateHealthScore,
  getHealthScoreTier,
} from "@/lib/contracts/health-score";
import { getNoticeDeadline } from "@/lib/contracts/notice-period";
import { isMissingContractValue } from "@/lib/currency/currencies";
import type { ContractData } from "@/lib/types/contracts";

export type TimelineBarStatus = "active" | "expiring" | "future";

export type TimelineBar = {
  contractId: string;
  vendorName: string;
  startMs: number;
  endMs: number;
  renewalMs: number | null;
  status: TimelineBarStatus;
  leftPercent: number;
  widthPercent: number;
  renewalLeftPercent: number | null;
};

export type PortfolioGrowthPoint = {
  monthKey: string;
  label: string;
  value: number;
};

export type TypeBreakdownItem = {
  type: string;
  count: number;
};

export type RiskRegisterRow = {
  contractId: string;
  vendorName: string;
  healthScore: number;
  healthTier: "high" | "medium" | "low";
  noticeStatus: "OK" | "Warning" | "Action Required";
  daysUntilRenewal: number | null;
  autoRenews: boolean | null;
  hasExitClause: boolean;
};

export type AnalyticsTopStats = {
  averageContractValue: number | null;
  averageDurationMonths: number | null;
  highestValue: {
    vendorName: string;
    value: number;
  } | null;
  uniqueVendors: number;
  contractCount: number;
};

export type AverageValueBreakdownItem = {
  contractId: string;
  vendorName: string;
  originalValue: number;
  originalCurrency: string | null;
  convertedValue: number;
};

export type AverageValueBreakdown = {
  items: AverageValueBreakdownItem[];
  sumConverted: number;
  valuedContractCount: number;
  excludedWithoutValueCount: number;
  average: number | null;
};

function safeParseDate(raw: string | null): Date | null {
  if (!raw) return null;
  try {
    return parseISO(raw);
  } catch {
    return null;
  }
}

function contractEndDate(row: ContractData): Date | null {
  return safeParseDate(row.end_date) ?? safeParseDate(row.renewal_date);
}

export function getTimelineBarStatus(
  row: ContractData,
  today = startOfToday()
): TimelineBarStatus {
  const start = safeParseDate(row.start_date);
  if (start && isAfter(start, today)) return "future";

  if (row.status === "expiring") return "expiring";

  const renewal = safeParseDate(row.renewal_date);
  if (renewal && renewal >= today && renewal <= addDays(today, 90)) {
    return "expiring";
  }

  const end = contractEndDate(row);
  if (end && end >= today && end <= addDays(today, 90)) {
    return "expiring";
  }

  return "active";
}

export function timelineStatusColor(status: TimelineBarStatus): string {
  switch (status) {
    case "expiring":
      return "#EF4444";
    case "future":
      return "#38BDF8";
    default:
      return "#F97316";
  }
}

function resolveNoticeStatus(
  row: ContractData,
  today = startOfToday()
): RiskRegisterRow["noticeStatus"] {
  const deadline = getNoticeDeadline(row.renewal_date, row.notice_period_days);
  if (!deadline) return "OK";

  const daysUntil = differenceInCalendarDays(deadline, today);
  if (daysUntil < 0) return "Action Required";
  if (daysUntil <= 14) return "Warning";
  return "OK";
}

export function computeAverageValueBreakdown(
  rows: ContractData[],
  convertValue: (amount: number, currency: string | null) => number
): AverageValueBreakdown {
  const deduped = dedupeContractDataByContractId(rows);
  const valued = deduped.filter((r) => !isMissingContractValue(r.contract_value));

  const items: AverageValueBreakdownItem[] = valued.map((row) => {
    const originalValue = Number(row.contract_value) || 0;
    return {
      contractId: row.contract_id,
      vendorName: row.vendor_name?.trim() || "Unknown vendor",
      originalValue,
      originalCurrency: row.currency,
      convertedValue: convertValue(originalValue, row.currency),
    };
  });

  items.sort((a, b) => b.convertedValue - a.convertedValue);

  const sumConverted = items.reduce((acc, item) => acc + item.convertedValue, 0);
  const valuedContractCount = items.length;

  return {
    items,
    sumConverted,
    valuedContractCount,
    excludedWithoutValueCount: deduped.length - valuedContractCount,
    average:
      valuedContractCount > 0 ? sumConverted / valuedContractCount : null,
  };
}

export function computeAnalyticsTopStats(
  rows: ContractData[],
  convertValue: (amount: number, currency: string | null) => number
): AnalyticsTopStats {
  const deduped = dedupeContractDataByContractId(rows);
  const valued = deduped.filter((r) => !isMissingContractValue(r.contract_value));

  const convertedValues = valued.map((r) =>
    convertValue(Number(r.contract_value) || 0, r.currency)
  );

  const durations: number[] = [];
  for (const row of deduped) {
    const start = safeParseDate(row.start_date);
    const end = contractEndDate(row);
    if (start && end && !isBefore(end, start)) {
      durations.push(Math.max(1, differenceInMonths(end, start)));
    }
  }

  let highest: AnalyticsTopStats["highestValue"] = null;
  for (const row of valued) {
    const value = convertValue(Number(row.contract_value) || 0, row.currency);
    if (!highest || value > highest.value) {
      highest = {
        vendorName: row.vendor_name?.trim() || "Unknown vendor",
        value,
      };
    }
  }

  const vendors = new Set(
    deduped.map((r) => (r.vendor_name?.trim() || "Unknown vendor").toLowerCase())
  );

  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

  const avgValue =
    convertedValues.length > 0
      ? convertedValues.reduce((a, b) => a + b, 0) / convertedValues.length
      : null;

  return {
    averageContractValue: avgValue,
    averageDurationMonths: avgDuration,
    highestValue: highest,
    uniqueVendors: vendors.size,
    contractCount: deduped.length,
  };
}

export function computeTimelineBars(
  rows: ContractData[]
): { bars: TimelineBar[]; rangeStart: Date; rangeEnd: Date } | null {
  const deduped = dedupeContractDataByContractId(rows);
  const segments: {
    row: ContractData;
    start: Date;
    end: Date;
    renewal: Date | null;
  }[] = [];

  for (const row of deduped) {
    const start = safeParseDate(row.start_date);
    const end = contractEndDate(row);
    if (!start || !end) continue;
    segments.push({
      row,
      start,
      end: isBefore(end, start) ? start : end,
      renewal: safeParseDate(row.renewal_date),
    });
  }

  if (segments.length === 0) return null;

  const rangeStart = minDate(segments.map((s) => s.start));
  const rangeEnd = maxDate(segments.map((s) => s.end));
  const spanMs = rangeEnd.getTime() - rangeStart.getTime() || 1;

  const bars: TimelineBar[] = segments.map(({ row, start, end, renewal }) => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const leftPercent = ((startMs - rangeStart.getTime()) / spanMs) * 100;
    const widthPercent = Math.max(
      0.8,
      ((endMs - startMs) / spanMs) * 100
    );

    let renewalLeftPercent: number | null = null;
    if (renewal) {
      const renewalMs = renewal.getTime();
      if (renewalMs >= rangeStart.getTime() && renewalMs <= rangeEnd.getTime()) {
        renewalLeftPercent =
          ((renewalMs - rangeStart.getTime()) / spanMs) * 100;
      }
    }

    return {
      contractId: row.contract_id,
      vendorName: row.vendor_name?.trim() || "Unknown vendor",
      startMs,
      endMs,
      renewalMs: renewal?.getTime() ?? null,
      status: getTimelineBarStatus(row),
      leftPercent,
      widthPercent,
      renewalLeftPercent,
    };
  });

  return { bars, rangeStart, rangeEnd };
}

export function formatTimelineRangeLabel(start: Date, end: Date): string {
  return `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`;
}

export function computePortfolioGrowth(
  rows: ContractData[],
  convertValue: (amount: number, currency: string | null) => number
): PortfolioGrowthPoint[] {
  const deduped = dedupeContractDataByContractId(rows).filter(
    (r) => !isMissingContractValue(r.contract_value)
  );

  const dated = deduped
    .map((row) => {
      const date =
        safeParseDate(row.start_date) ?? safeParseDate(row.created_at);
      if (!date) return null;
      return {
        date: startOfMonth(date),
        value: convertValue(Number(row.contract_value) || 0, row.currency),
      };
    })
    .filter(Boolean) as { date: Date; value: number }[];

  if (dated.length === 0) return [];

  dated.sort((a, b) => a.date.getTime() - b.date.getTime());

  const byMonth = new Map<string, { label: string; date: Date; add: number }>();
  for (const item of dated) {
    const key = format(item.date, "yyyy-MM");
    const existing = byMonth.get(key);
    if (existing) {
      existing.add += item.value;
    } else {
      byMonth.set(key, {
        label: format(item.date, "MMM yyyy"),
        date: item.date,
        add: item.value,
      });
    }
  }

  const months = Array.from(byMonth.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let cumulative = 0;
  return months.map((m) => {
    cumulative += m.add;
    return {
      monthKey: format(m.date, "yyyy-MM"),
      label: m.label,
      value: cumulative,
    };
  });
}

export function computeTypeBreakdown(rows: ContractData[]): TypeBreakdownItem[] {
  const deduped = dedupeContractDataByContractId(rows);
  const counts = new Map<string, number>();

  for (const row of deduped) {
    const type = row.contract_type?.trim() || "Unspecified";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeRiskRegister(rows: ContractData[]): RiskRegisterRow[] {
  const deduped = dedupeContractDataByContractId(rows);
  const today = startOfToday();

  return deduped
    .map((row) => {
      const { score } = calculateHealthScore(row);
      const renewal = safeParseDate(row.renewal_date);
      const daysUntilRenewal = renewal
        ? differenceInCalendarDays(renewal, today)
        : null;

      return {
        contractId: row.contract_id,
        vendorName: row.vendor_name?.trim() || "Unknown vendor",
        healthScore: score,
        healthTier: getHealthScoreTier(score),
        noticeStatus: resolveNoticeStatus(row, today),
        daysUntilRenewal,
        autoRenews: row.auto_renews,
        hasExitClause: inferHasExitClause(row.summary),
      };
    })
    .sort((a, b) => a.healthScore - b.healthScore);
}
