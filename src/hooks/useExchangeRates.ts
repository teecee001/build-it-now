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

async function fetchCryptoRates(): Promise<CryptoPayload> {
  const ids = CRYPTO_CODES.map((c) => COINGECKO_IDS[c]).filter(Boolean).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
  if (!res.ok) throw new Error("Failed to fetch crypto rates");
  const data = await res.json();

  const rates: Record<string, number> = {};
  const changes: Record<string, number> = {};
  for (const code of CRYPTO_CODES) {
    const geckoId = COINGECKO_IDS[code];
    if (geckoId && data[geckoId]?.usd != null) {
      rates[code] = 1 / data[geckoId].usd;
      if (typeof data[geckoId].usd_24h_change === "number") {
        changes[code] = data[geckoId].usd_24h_change;
      }
    }
  }
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
