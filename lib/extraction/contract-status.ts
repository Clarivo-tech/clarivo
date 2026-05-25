import { addDays, parseISO, startOfToday } from "date-fns";
import type { ContractDataStatus } from "@/lib/types/contracts";

export function deriveContractDataStatus(
  endDate: string | null,
  renewalDate: string | null
): ContractDataStatus {
  const today = startOfToday();

  if (endDate) {
    const end = parseISO(endDate);
    if (end < today) return "expired";
  }

  if (renewalDate) {
    const renewal = parseISO(renewalDate);
    const in30Days = addDays(today, 30);
    if (renewal >= today && renewal <= in30Days) return "expiring";
  }

  return "active";
}
