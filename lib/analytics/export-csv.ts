import { format } from "date-fns";
import {
  computeAnalyticsTopStats,
  computeRiskRegister,
  getTimelineBarStatus,
} from "@/lib/analytics/compute-analytics";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { inferHasExitClause } from "@/lib/contracts/health-score";
import {
  calculateHealthScore,
  getHealthScoreTier,
} from "@/lib/contracts/health-score";
import { isMissingContractValue } from "@/lib/currency/currencies";
import type { ContractData } from "@/lib/types/contracts";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowToCsv(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

function formatBool(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

export function buildAnalyticsCsvExport({
  rows,
  convert,
  baseCurrency,
}: {
  rows: ContractData[];
  convert: (amount: number, currency: string | null) => number;
  baseCurrency: string;
}): string {
  const deduped = dedupeContractDataByContractId(rows);
  const stats = computeAnalyticsTopStats(rows, convert);
  const riskByContractId = new Map(
    computeRiskRegister(rows).map((r) => [r.contractId, r])
  );

  const lines: string[] = [];

  lines.push("Clarivo Analytics Export");
  lines.push(`Generated,${escapeCsvCell(format(new Date(), "yyyy-MM-dd HH:mm"))}`);
  lines.push(`Base currency,${escapeCsvCell(baseCurrency)}`);
  lines.push("");

  lines.push("Portfolio summary");
  lines.push(rowToCsv(["Metric", "Value"]));
  lines.push(rowToCsv(["Contract count", stats.contractCount]));
  lines.push(rowToCsv(["Unique vendors", stats.uniqueVendors]));
  lines.push(
    rowToCsv([
      "Average contract value",
      stats.averageContractValue != null
        ? stats.averageContractValue.toFixed(2)
        : "",
    ])
  );
  lines.push(
    rowToCsv([
      "Average duration (months)",
      stats.averageDurationMonths != null
        ? stats.averageDurationMonths.toFixed(1)
        : "",
    ])
  );
  lines.push(
    rowToCsv([
      "Highest value vendor",
      stats.highestValue?.vendorName ?? "",
    ])
  );
  lines.push(
    rowToCsv([
      "Highest value amount",
      stats.highestValue != null ? stats.highestValue.value.toFixed(2) : "",
    ])
  );
  lines.push("");

  const headers = [
    "Vendor",
    "Contract type",
    "Contract value",
    "Currency",
    `Value (${baseCurrency})`,
    "Start date",
    "End date",
    "Renewal date",
    "Notice period (days)",
    "Auto-renews",
    "Status",
    "Timeline status",
    "Health score",
    "Health tier",
    "Notice status",
    "Days until renewal",
    "Has exit clause",
    "Summary",
  ];

  lines.push("Contracts");
  lines.push(rowToCsv(headers));

  for (const row of deduped) {
    const risk = riskByContractId.get(row.contract_id);
    const { score } = calculateHealthScore(row);
    const value = isMissingContractValue(row.contract_value)
      ? null
      : Number(row.contract_value);

    lines.push(
      rowToCsv([
        row.vendor_name?.trim() || "Unknown vendor",
        row.contract_type?.trim() || "",
        value,
        row.currency ?? "",
        value != null ? convert(value, row.currency).toFixed(2) : "",
        row.start_date ?? "",
        row.end_date ?? "",
        row.renewal_date ?? "",
        row.notice_period_days ?? "",
        formatBool(row.auto_renews),
        row.status,
        getTimelineBarStatus(row),
        score,
        risk?.healthTier ?? getHealthScoreTier(score),
        risk?.noticeStatus ?? "",
        risk?.daysUntilRenewal ?? "",
        inferHasExitClause(row.summary) ? "Yes" : "No",
        row.summary?.replace(/\s+/g, " ").trim() ?? "",
      ])
    );
  }

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function analyticsExportFilename(): string {
  return `clarivo-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
}
