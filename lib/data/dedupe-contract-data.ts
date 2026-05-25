import { parseISO } from "date-fns";
import type { ContractData } from "@/lib/types/contracts";

/** Keep only the latest contract_data row per contract_id. */
export function dedupeContractDataByContractId(
  rows: ContractData[]
): ContractData[] {
  const latestByContract = new Map<string, ContractData>();

  for (const row of rows) {
    const existing = latestByContract.get(row.contract_id);
    if (!existing) {
      latestByContract.set(row.contract_id, row);
      continue;
    }

    const existingTime = new Date(existing.updated_at).getTime();
    const rowTime = new Date(row.updated_at).getTime();
    if (rowTime >= existingTime) {
      latestByContract.set(row.contract_id, row);
    }
  }

  return Array.from(latestByContract.values()).sort((a, b) => {
    if (!a.renewal_date && !b.renewal_date) return 0;
    if (!a.renewal_date) return 1;
    if (!b.renewal_date) return -1;
    return (
      parseISO(a.renewal_date).getTime() - parseISO(b.renewal_date).getTime()
    );
  });
}
