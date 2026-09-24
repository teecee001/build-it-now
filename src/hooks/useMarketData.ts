import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MarketQuote = {
  price: number;
  changePct: number;
  spark: number[];
};

export type MarketDataPayload = {
  at?: string;
  sources?: Record<string, string>;
  crypto?: Record<string, MarketQuote>;
  forex?: Record<string, MarketQuote>;
  stocks?: Record<string, MarketQuote>;
  commodities?: Record<string, MarketQuote>;
  indices?: Record<string, MarketQuote>;
  error?: string;
};

async function fetchClass(cls: string): Promise<MarketDataPayload> {
  const { data, error } = await supabase.functions.invoke("market-data", {
    body: { class: cls },
  });

  if (!error && data && typeof data === "object" && !("error" in data && !(data as MarketDataPayload).crypto)) {
    return data as MarketDataPayload;
  }

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (base) {
    const res = await fetch(`${base}/functions/v1/market-data?class=${encodeURIComponent(cls)}`, {
      headers: {
        apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "",
        Authorization: `Bearer ${(import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? ""}`,
      },
    });
    if (res.ok) return (await res.json()) as MarketDataPayload;
  }

  throw new Error(error?.message ?? "market-data unavailable");
}

export function useMarketData(
  cls: "all" | "crypto" | "forex" | "stocks" | "commodities" | "indices" = "all",
) {
  const query = useQuery({
    queryKey: ["market-data", cls],
    queryFn: () => fetchClass(cls),
    staleTime: 45_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const d = query.data;

  const get = (bucket: keyof MarketDataPayload, symbol: string): MarketQuote | undefined => {
    const map = d?.[bucket] as Record<string, MarketQuote> | undefined;
    return map?.[symbol];
  };

  return {
    data: d,
    isLoading: query.isLoading,
    isError: query.isError,
    sources: d?.sources ?? {},
    getCrypto: (code: string) => get("crypto", code),
    getForex: (pair: string) => get("forex", pair),
    getStock: (ticker: string) => get("stocks", ticker),
    getCommodity: (sym: string) => get("commodities", sym),
    getIndex: (sym: string) => get("indices", sym),
    cryptoLive: !!d?.crypto && Object.keys(d.crypto).length > 0,
    forexLive: !!d?.forex && Object.keys(d.forex).length > 0,
    stocksLive: !!d?.stocks && Object.keys(d.stocks).length > 0,
    commoditiesLive: !!d?.commodities && Object.keys(d.commodities).length > 0,
    indicesLive: !!d?.indices && Object.keys(d.indices).length > 0,
    refetch: query.refetch,
  };
}
