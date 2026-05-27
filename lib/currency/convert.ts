import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import { formatCurrency } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";
import {
  DEFAULT_BASE_CURRENCY,
  normalizeCurrencyCode,
  type SupportedCurrency,
} from "@/lib/currency/currencies";
import type { ExchangeRates } from "@/lib/currency/exchange-rates";

function rateFromGbp(
  currency: SupportedCurrency,
  rates: ExchangeRates
): number | null {
  if (currency === "GBP") return 1;
  const rate = rates.rates[currency];
  return rate != null && rate > 0 ? rate : null;
}

/** Convert an amount from `from` currency into the user's base currency. */
export function convertToBaseCurrency(
  amount: number,
  fromCurrency: string | null | undefined,
  baseCurrency: SupportedCurrency,
  rates: ExchangeRates
): number {
  const from = normalizeCurrencyCode(fromCurrency);
  if (from === baseCurrency) return amount;

  const fromRate = rateFromGbp(from, rates);
  const baseRate = rateFromGbp(baseCurrency, rates);

  if (fromRate == null || baseRate == null) return amount;

  const amountInGbp = from === "GBP" ? amount : amount / fromRate;
  return baseCurrency === "GBP" ? amountInGbp : amountInGbp * baseRate;
}

export function formatConvertedAmount(
  value: number | null | undefined,
  originalCurrency: string | null | undefined,
  baseCurrency: SupportedCurrency,
  rates: ExchangeRates
): { display: string; originalNote?: string } {
  if (value == null) return { display: "—" };

  const from = normalizeCurrencyCode(originalCurrency);
  const converted = convertToBaseCurrency(value, from, baseCurrency, rates);
  const display = formatCurrency(converted, baseCurrency);

  if (from !== baseCurrency) {
    return {
      display,
      originalNote: `(orig. ${formatCurrency(value, from)})`,
    };
  }

  return { display };
}

export function sumConvertedContractValue(
  contractData: ContractData[],
  baseCurrency: SupportedCurrency,
  rates: ExchangeRates
): number {
  const rows = dedupeContractDataByContractId(contractData);
  return rows.reduce((sum, row) => {
    const value = Number(row.contract_value) || 0;
    if (value === 0) return sum;
    return (
      sum + convertToBaseCurrency(value, row.currency, baseCurrency, rates)
    );
  }, 0);
}
