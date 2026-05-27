import { cache } from "react";

export type ExchangeRates = {
  base: "GBP";
  date: string;
  rates: Record<string, number>;
};

const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=GBP";
const CACHE_TTL_MS = 60 * 60 * 1000;

let sessionCache: { data: ExchangeRates; fetchedAt: number } | null = null;

async function fetchRatesFromApi(): Promise<ExchangeRates> {
  const response = await fetch(FRANKFURTER_URL, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Exchange rate API failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  return {
    base: "GBP",
    date: payload.date,
    rates: payload.rates,
  };
}

/** Session-scoped cache (module) + React cache per request on server. */
export const getExchangeRates = cache(async (): Promise<ExchangeRates> => {
  const now = Date.now();
  if (sessionCache && now - sessionCache.fetchedAt < CACHE_TTL_MS) {
    return sessionCache.data;
  }

  try {
    const data = await fetchRatesFromApi();
    sessionCache = { data, fetchedAt: now };
    return data;
  } catch (error) {
    console.error("[currency] fetch rates:", error);
    if (sessionCache) return sessionCache.data;
    return {
      base: "GBP",
      date: new Date().toISOString().slice(0, 10),
      rates: {},
    };
  }
});

export function getRatesUpdatedLabel(rates: ExchangeRates): string {
  const today = new Date().toISOString().slice(0, 10);
  if (rates.date === today) return "Rates updated today";
  return `Rates updated ${rates.date}`;
}
