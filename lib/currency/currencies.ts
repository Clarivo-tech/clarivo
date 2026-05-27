export const DEFAULT_BASE_CURRENCY = "GBP";

export type SupportedCurrency =
  | "GBP"
  | "USD"
  | "EUR"
  | "AED"
  | "PHP"
  | "AUD"
  | "CAD";

export const SUPPORTED_CURRENCIES: {
  code: SupportedCurrency;
  label: string;
}[] = [
  { code: "GBP", label: "GBP (£)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "AED", label: "AED (د.إ)" },
  { code: "PHP", label: "PHP (₱)" },
  { code: "AUD", label: "AUD (A$)" },
  { code: "CAD", label: "CAD (C$)" },
];

export function normalizeCurrencyCode(
  currency: string | null | undefined
): SupportedCurrency {
  const code = (currency ?? DEFAULT_BASE_CURRENCY).toUpperCase().trim();
  const supported = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return supported?.code ?? DEFAULT_BASE_CURRENCY;
}

export function isSupportedCurrency(
  currency: string
): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.some((c) => c.code === currency);
}

export function getCurrencySymbol(code: SupportedCurrency): string {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const symbol = parts.find((p) => p.type === "currency")?.value;
    return symbol ?? code;
  } catch {
    return code;
  }
}

export function isMissingContractValue(
  value: number | null | undefined
): boolean {
  return value == null || value === 0;
}
