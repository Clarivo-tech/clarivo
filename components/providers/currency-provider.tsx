"use client";

import { createContext, useContext, useMemo } from "react";
import {
  formatConvertedAmount,
  convertToBaseCurrency,
  sumConvertedContractValue,
} from "@/lib/currency/convert";
import type { ExchangeRates } from "@/lib/currency/exchange-rates";
import { getRatesUpdatedLabel } from "@/lib/currency/exchange-rates";
import { formatCurrency } from "@/lib/format";
import type { ContractData } from "@/lib/types/contracts";
import {
  normalizeCurrencyCode,
  type SupportedCurrency,
} from "@/lib/currency/currencies";

type CurrencyContextValue = {
  baseCurrency: SupportedCurrency;
  rates: ExchangeRates;
  ratesUpdatedLabel: string;
  convert: (amount: number, fromCurrency?: string | null) => number;
  formatInBase: (value: number | null | undefined) => string;
  formatContractValue: (
    value: number | null | undefined,
    originalCurrency?: string | null
  ) => { display: string; originalNote?: string };
  sumContractValues: (contractData: ContractData[]) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  baseCurrency,
  rates,
  children,
}: {
  baseCurrency: string;
  rates: ExchangeRates;
  children: React.ReactNode;
}) {
  const base = normalizeCurrencyCode(baseCurrency);

  const value = useMemo<CurrencyContextValue>(() => {
    return {
      baseCurrency: base,
      rates,
      ratesUpdatedLabel: getRatesUpdatedLabel(rates),
      convert: (amount, fromCurrency) =>
        convertToBaseCurrency(amount, fromCurrency, base, rates),
      formatInBase: (value) => formatCurrency(value, base),
      formatContractValue: (value, originalCurrency) =>
        formatConvertedAmount(value, originalCurrency, base, rates),
      sumContractValues: (contractData) =>
        sumConvertedContractValue(contractData, base, rates),
    };
  }, [base, rates]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}
