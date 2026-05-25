import type { ContractData } from "@/lib/types/contracts";

export function buildContractContextPrompt(
  contractData: ContractData[]
): string {
  const payload = contractData.map((row) => ({
    vendor_name: row.vendor_name,
    contract_value: row.contract_value,
    currency: row.currency,
    start_date: row.start_date,
    end_date: row.end_date,
    renewal_date: row.renewal_date,
    notice_period_days: row.notice_period_days,
    auto_renews: row.auto_renews,
    contract_type: row.contract_type,
    summary: row.summary,
    status: row.status,
  }));

  return `You are Clarivo, a contract intelligence assistant. You answer questions ONLY using the contract data below from the user's uploaded contracts.

Rules:
- Use ONLY the contract data provided. Do not use outside knowledge or assumptions.
- If the answer is not in the data, say you don't have that information in their contracts.
- Be concise, helpful, and specific. Reference vendors, dates, and amounts when relevant.
- For totals or comparisons, calculate from the data provided.
- Do not invent contracts or fields that are not in the data.

Contract data (JSON):
${JSON.stringify(payload, null, 2)}`;
}
