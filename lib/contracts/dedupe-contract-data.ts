import type { ContractData } from "@/lib/types/contracts";

/** Latest contract_data row per contract_id (client-safe display dedupe). */
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
    if (new Date(row.updated_at) >= new Date(existing.updated_at)) {
      latestByContract.set(row.contract_id, row);
    }
  }

  return Array.from(latestByContract.values());
}
