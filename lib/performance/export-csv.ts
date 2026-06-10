import { format } from "date-fns";
import { downloadCsvFile } from "@/lib/analytics/export-csv";
import { formatDate } from "@/lib/format";
import { formatScore, ragLabel } from "@/lib/performance/scoring";
import type { VendorPerformanceOverview } from "@/lib/types/performance";

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

function formatTrendForCsv(overview: VendorPerformanceOverview): string {
  const { trendPercent: pct, latestScore, previousScore } = overview;
  if (latestScore == null || previousScore == null || pct == null) return "";
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
}

function formatRagForCsv(overview: VendorPerformanceOverview): string {
  if (overview.latestScore == null && overview.rag === "none") {
    return "Not reviewed";
  }
  return `${formatScore(overview.latestScore)}/10 · ${ragLabel(overview.rag)}`;
}

export function buildPerformanceOverviewCsvExport(
  overviews: VendorPerformanceOverview[]
): string {
  const lines: string[] = [];

  lines.push("Clarivo Vendor Performance Overview");
  lines.push(
    rowToCsv(["Generated", format(new Date(), "yyyy-MM-dd HH:mm")])
  );
  lines.push("");

  lines.push(
    rowToCsv([
      "Vendor",
      "Latest score",
      "Trend",
      "Reviews",
      "Last reviewed",
      "RAG",
    ])
  );

  for (const row of overviews) {
    lines.push(
      rowToCsv([
        row.vendorName,
        row.latestScore != null ? `${formatScore(row.latestScore)}/10` : "",
        formatTrendForCsv(row),
        row.reviewCount,
        row.lastReviewedAt ? formatDate(row.lastReviewedAt) : "",
        formatRagForCsv(row),
      ])
    );
  }

  return lines.join("\r\n");
}

export function performanceOverviewExportFilename(): string {
  return `clarivo-vendor-performance-${format(new Date(), "yyyy-MM-dd")}.csv`;
}

export function downloadPerformanceOverviewCsv(
  overviews: VendorPerformanceOverview[]
): void {
  const csv = buildPerformanceOverviewCsvExport(overviews);
  downloadCsvFile(performanceOverviewExportFilename(), csv);
}
