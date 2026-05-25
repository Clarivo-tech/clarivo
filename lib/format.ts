import { format, parseISO } from "date-fns";

export function formatCurrency(
  value: number | null | undefined,
  currency = "USD"
): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
}

export function formatContractValue(
  value: number | null | undefined,
  currency: string | null | undefined
): string {
  return formatCurrency(value, currency ?? "USD");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}
