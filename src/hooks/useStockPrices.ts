import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "JPM", "V",
  "UNH", "JNJ", "WMT", "PG", "MA", "HD", "XOM", "CVX", "BAC", "KO",
  "PEP", "ABBV", "COST", "MRK", "LLY", "AVGO", "TMO", "CRM", "AMD", "NFLX",
  "DIS", "INTC", "CSCO", "ADBE", "NKE", "PYPL", "T", "VZ", "UBER", "SQ",
] as const;

export type LiveQuote = {
  price: number;
  changePct: number;
  spark: number[];
};

async function fetchQuotesClient(): Promise<Record<string, LiveQuote>> {
  // Yahoo chart batch via query1 (may fail CORS in browser — edge is preferred)
  const out: Record<string, LiveQuote> = {};
  const batch = TICKERS.slice(0, 12); // keep client fallback light
  await Promise.all(
    batch.map(async (t) => {
      try {
        const sym = encodeURIComponent(t.replace(".", "-"));
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1mo`,
        );
        if (!res.ok) return;
        const j = await res.json();
        const r = j?.chart?.result?.[0];
        if (!r) return;
        const meta = r.meta;
        const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter(
          (n: unknown) => typeof n === "number" && Number.isFinite(n),
        );
        const price = Number(meta?.regularMarketPrice) || closes[closes.length - 1];
        const prev = Number(meta?.chartPreviousClose) || closes[closes.length - 2] || price;
        if (!price) return;
        out[t] = {
          price,
          changePct: prev ? ((price - prev) / prev) * 100 : 0,
          spark: closes.slice(-14),
        };
      } catch {
        /* ignore */
      }
    }),
  );
  return out;
}

async function fetchStockQuotes(): Promise<Record<string, LiveQuote>> {
  try {
    const { data, error } = await supabase.functions.invoke("stock-data");
    if (!error && data?.quotes && Object.keys(data.quotes).length) {
      return data.quotes as Record<string, LiveQuote>;
    }
  } catch {
    /* fall through */
  }
  return fetchQuotesClient();
}

export function useStockPrices() {
  const query = useQuery({
    queryKey: ["live-stock-quotes-v1"],
    queryFn: fetchStockQuotes,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  const quotes = query.data ?? {};
  const isLive = Object.keys(quotes).length > 0;

  const getPrice = (ticker: string) => quotes[ticker]?.price ?? 0;
  const getChange = (ticker: string) => quotes[ticker]?.changePct ?? 0;
  const getSpark = (ticker: string) => quotes[ticker]?.spark ?? [];

  return {
    quotes,
    getPrice,
    getChange,
    getSpark,
    isLive,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
