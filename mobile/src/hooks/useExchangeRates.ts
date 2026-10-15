// Copied from the web app (src/hooks/useExchangeRates.ts); keep the two in sync.
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { EXCHANGE_RATES } from "@/constants/currencies";
import { COINGECKO_IDS } from "@/constants/cryptoIds";

const FIAT_CODES = Object.keys(EXCHANGE_RATES).filter(
  (code) => !COINGECKO_IDS[code]
);

const CRYPTO_CODES = Object.keys(COINGECKO_IDS);

async function fetchFiatRates(): Promise<Record<string, number>> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error("Failed to fetch fiat rates");
  const data = await res.json();
  return data.rates as Record<string, number>;
}

type CryptoPayload = {
  rates: Record<string, number>;
  changes: Record<string, number>;
};

/** Crypto prices via our market-data edge function (server-side CoinGecko, cached),
 * so the browser never calls CoinGecko directly (CORS/rate-limit errors). */
async function fetchCryptoRates(): Promise<CryptoPayload> {
  const load = async (cls: string) => {
    const { data, error } = await supabase.functions.invoke("market-data", { body: { class: cls } });
    if (error) throw error;
    return (data?.crypto ?? {}) as Record<string, { price?: number; changePct?: number }>;
  };
  // "crypto_rates" covers every wallet coin; fall back to the core list if it is empty.
  let quotes: Record<string, { price?: number; changePct?: number }> = await load("crypto_rates").catch(() => ({}));
  if (!Object.keys(quotes).length) quotes = await load("crypto");
  const rates: Record<string, number> = {};
  const changes: Record<string, number> = {};
  for (const code of CRYPTO_CODES) {
    const q = quotes[code];
    const price = Number(q?.price);
    if (q && Number.isFinite(price) && price > 0) {
      rates[code] = 1 / price;
      if (typeof q.changePct === "number" && Number.isFinite(q.changePct)) changes[code] = q.changePct;
    }
  }
  if (!Object.keys(rates).length) throw new Error("Failed to fetch crypto rates");
  return { rates, changes };
}

export function useExchangeRates() {
  const fiatQuery = useQuery({
    queryKey: ["fiat-rates"],
    queryFn: fetchFiatRates,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const cryptoQuery = useQuery({
    queryKey: ["crypto-rates-v2"],
    queryFn: fetchCryptoRates,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const rates: Record<string, number> = { ...EXCHANGE_RATES };

  if (fiatQuery.data) {
    for (const code of FIAT_CODES) {
      if (fiatQuery.data[code] !== undefined) {
        rates[code] = fiatQuery.data[code];
      }
    }
  }

  if (cryptoQuery.data?.rates) {
    for (const code of CRYPTO_CODES) {
      if (cryptoQuery.data.rates[code] !== undefined) {
        rates[code] = cryptoQuery.data.rates[code];
      }
    }
  }

  const cryptoChanges: Record<string, number> = cryptoQuery.data?.changes ?? {};

  return {
    rates,
    cryptoChanges,
    isLoading: fiatQuery.isLoading || cryptoQuery.isLoading,
    isLive: !!(fiatQuery.data || cryptoQuery.data),
    lastUpdated: new Date(),
  };
}

export function useCryptoChartData(cryptoCode: string) {
  const geckoId = COINGECKO_IDS[cryptoCode];

  return useQuery({
    queryKey: ["crypto-chart", cryptoCode],
    queryFn: async () => {
      if (!geckoId) return null;
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=30`
      );
      if (!res.ok) throw new Error("Failed to fetch chart data");
      const data = await res.json();
      return (data.prices as [number, number][]).map(([timestamp, price]) => ({
        date: new Date(timestamp).toLocaleDateString(),
        price,
      }));
    },
    enabled: !!geckoId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
