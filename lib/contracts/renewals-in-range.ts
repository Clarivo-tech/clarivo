import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfToday,
} from "date-fns";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { formatContractValue } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";

export type RenewalUrgency = "urgent" | "soon" | "later";

export type RenewalListItem = {
  id: string;
  vendorName: string;
  renewalDateLabel: string;
  daysUntil: number;
  daysUntilLabel: string;
  valueLabel: string;
  urgency: RenewalUrgency;
};

function getUrgency(daysUntil: number): RenewalUrgency {
  if (daysUntil <= 30) return "urgent";
  if (daysUntil <= 90) return "soon";
  return "later";
}

function formatDaysUntil(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function getRenewalsInNext12Months(
  contractData: ContractData[]
): RenewalListItem[] {
  const today = startOfToday();
  const horizon = addDays(today, 365);
  const rows = dedupeContractDataByContractId(contractData);

  return rows
    .filter((row) => {
      if (!row.renewal_date) return false;
      const renewal = parseISO(row.renewal_date);
      return renewal >= today && renewal <= horizon;
    })
    .sort((a, b) => {
      if (!a.renewal_date || !b.renewal_date) return 0;
      return (
        parseISO(a.renewal_date).getTime() - parseISO(b.renewal_date).getTime()
      );
    })
    .map((row) => {
      const renewal = parseISO(row.renewal_date!);
      const daysUntil = differenceInCalendarDays(renewal, today);

      return {
        id: row.id,
        vendorName: row.vendor_name ?? "Unknown vendor",
        renewalDateLabel: format(renewal, "MMM d, yyyy"),
        daysUntil,
        daysUntilLabel: formatDaysUntil(daysUntil),
        valueLabel: formatContractValue(
          row.contract_value,
          row.currency
        ),
        urgency: getUrgency(daysUntil),
      };
    });
}

export function countRenewalsInNext12Months(
  contractData: ContractData[]
): number {
  return getRenewalsInNext12Months(contractData).length;
}
