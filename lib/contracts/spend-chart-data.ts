import { format, parseISO } from "date-fns";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { isMissingContractValue } from "@/lib/currency/currencies";
import type { ContractData } from "@/lib/types/contracts";

export type SpendChartPoint = {
  id: string;
  xLabel: string;
  value: number;
  vendor?: string;
  monthKey?: string;
};

function contractDate(row: ContractData): Date | null {
  const raw =
    row.start_date ?? row.end_date ?? row.renewal_date ?? row.created_at;
  if (!raw) return null;
  try {
    return parseISO(raw);
  } catch {
    return null;
  }
}

function vendorHasDuplicates(rows: ContractData[]): boolean {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const vendor = row.vendor_name?.trim() || "Unknown vendor";
    counts.set(vendor, (counts.get(vendor) ?? 0) + 1);
  }
  return Array.from(counts.values()).some((count) => count > 1);
}

export function buildSpendChartPoints(
  contractData: ContractData[],
  convertValue: (amount: number, currency: string | null) => number
): { points: SpendChartPoint[]; mode: "vendor" | "timeline" } {
  const rows = dedupeContractDataByContractId(contractData).filter(
    (row) => !isMissingContractValue(row.contract_value)
  );

  if (rows.length === 0) {
    return { points: [], mode: "vendor" };
  }

  const useTimeline = vendorHasDuplicates(rows);

  if (useTimeline) {
    const byMonth = new Map<
      string,
      { date: Date; value: number; vendors: Set<string> }
    >();

    for (const row of rows) {
      const date = contractDate(row) ?? new Date(row.created_at);
      const monthKey = format(date, "yyyy-MM");
      const xLabel = format(date, "MMM yyyy");
      const converted = convertValue(
        Number(row.contract_value) || 0,
        row.currency
      );
      const existing = byMonth.get(monthKey);
      if (existing) {
        existing.value += converted;
        existing.vendors.add(row.vendor_name ?? "Unknown");
      } else {
        byMonth.set(monthKey, {
          date,
          value: converted,
          vendors: new Set([row.vendor_name ?? "Unknown"]),
        });
      }
    }

    const points = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, entry]) => ({
        id: monthKey,
        xLabel: format(entry.date, "MMM yyyy"),
        value: entry.value,
        monthKey,
      }));

    return { points, mode: "timeline" };
  }

  const totals = new Map<string, number>();
  for (const row of rows) {
    const vendor = row.vendor_name?.trim() || "Unknown vendor";
    const converted = convertValue(
      Number(row.contract_value) || 0,
      row.currency
    );
    totals.set(vendor, (totals.get(vendor) ?? 0) + converted);
  }

  const points = Array.from(totals.entries())
    .map(([vendor, value]) => ({
      id: vendor,
      xLabel: vendor,
      value,
      vendor,
    }))
    .sort((a, b) => b.value - a.value);

  return { points, mode: "vendor" };
}
