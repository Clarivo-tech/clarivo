import type { ContractData } from "@/lib/types/contracts";

export type VendorSpend = {
  vendor: string;
  value: number;
};

export function aggregateSpendByVendor(
  rows: ContractData[]
): VendorSpend[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const vendor = row.vendor_name?.trim() || "Unknown vendor";
    const value = Number(row.contract_value) || 0;
    totals.set(vendor, (totals.get(vendor) ?? 0) + value);
  }

  return Array.from(totals.entries())
    .map(([vendor, value]) => ({ vendor, value }))
    .sort((a, b) => b.value - a.value);
}
