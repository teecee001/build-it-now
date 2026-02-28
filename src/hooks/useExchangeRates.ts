import { useQuery } from "@tanstack/react-query";
import { EXCHANGE_RATES } from "@/constants/currencies";
import { COINGECKO_IDS } from "@/constants/cryptoIds";

// Fiat currencies list (non-crypto)
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

async function fetchCryptoRates(): Promise<Record<string, number>> {
  // CoinGecko free API: get prices in USD for all cryptos
  const ids = CRYPTO_CODES.map((c) => COINGECKO_IDS[c]).filter(Boolean).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  );
  if (!res.ok) throw new Error("Failed to fetch crypto rates");
  const data = await res.json();

  // Convert to our format: code -> rate relative to 1 USD
  const rates: Record<string, number> = {};
  for (const code of CRYPTO_CODES) {
    const geckoId = COINGECKO_IDS[code];
    if (geckoId && data[geckoId]?.usd) {
      // Rate = how many units of crypto per 1 USD
      rates[code] = 1 / data[geckoId].usd;
    }
  }
  return rates;
}

export function useExchangeRates() {
  const fiatQuery = useQuery({
    queryKey: ["fiat-rates"],
    queryFn: fetchFiatRates,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const cryptoQuery = useQuery({
    queryKey: ["crypto-rates"],
    queryFn: fetchCryptoRates,
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  // Merge: live rates first, fallback to mock
  const rates: Record<string, number> = { ...EXCHANGE_RATES };

  if (fiatQuery.data) {
    for (const code of FIAT_CODES) {
      if (fiatQuery.data[code] !== undefined) {
        rates[code] = fiatQuery.data[code];
      }
    }
  }

  if (cryptoQuery.data) {
    for (const code of CRYPTO_CODES) {
      if (cryptoQuery.data[code] !== undefined) {
        rates[code] = cryptoQuery.data[code];
      }
    }
  }

  return {
    rates,
    isLoading: fiatQuery.isLoading || cryptoQuery.isLoading,
    isLive: !!(fiatQuery.data || cryptoQuery.data),
    lastUpdated: new Date(),
  };
}

// Hook for crypto chart price history
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
