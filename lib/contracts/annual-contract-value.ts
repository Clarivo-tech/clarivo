import {
  differenceInCalendarDays,
  differenceInMonths,
  parseISO,
} from "date-fns";
import type { ContractData } from "@/lib/types/contracts";

const DAYS_PER_YEAR = 365.25;

function contractTermEnd(row: ContractData): string | null {
  return row.end_date ?? row.renewal_date;
}

/** Contract length in years, or null when start/end cannot be determined. */
export function getContractTermYears(row: ContractData): number | null {
  if (!row.start_date) return null;
  const endRaw = contractTermEnd(row);
  if (!endRaw) return null;

  const start = parseISO(row.start_date);
  const end = parseISO(endRaw);
  const days = differenceInCalendarDays(end, start);
  if (days <= 0) return null;

  return days / DAYS_PER_YEAR;
}

/** Annualized contract value; falls back to the raw value when term is unknown. */
export function getAnnualContractValue(
  contractValue: number,
  row: ContractData
): number {
  const termYears = getContractTermYears(row);
  if (!termYears) return contractValue;
  return contractValue / termYears;
}

/** Human-readable contract duration, or null when dates are insufficient. */
export function formatContractLength(row: ContractData): string | null {
  if (!row.start_date) return null;
  const endRaw = contractTermEnd(row);
  if (!endRaw) return null;

  const start = parseISO(row.start_date);
  const end = parseISO(endRaw);
  const days = differenceInCalendarDays(end, start);
  if (days <= 0) return null;

  const months = differenceInMonths(end, start);
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} year${years === 1 ? "" : "s"}`;
    }
    return `${years} yr${years === 1 ? "" : "s"} ${remainingMonths} mo`;
  }
  if (months >= 1) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}
