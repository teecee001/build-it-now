const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V",
  "UNH", "JNJ", "WMT", "PG", "MA", "HD", "XOM", "CVX", "BAC", "KO",
  "PEP", "ABBV", "COST", "MRK", "LLY", "AVGO", "TMO", "CRM", "AMD", "NFLX",
  "DIS", "INTC", "CSCO", "ADBE", "NKE", "PYPL", "T", "VZ", "UBER",
];

const DISPLAY: Record<string, string> = { "BRK-B": "BRK.B" };

let cache: { at: number; body: string } | null = null;
const TTL = 60_000;

async function quoteOne(sym: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`,
    { headers: { "User-Agent": "Mozilla/5.0 ExoSky/1.0" } },
  );
  if (!res.ok) return null;
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if (!r) return null;
  const meta = r.meta;
  const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter(
    (n: unknown) => typeof n === "number" && Number.isFinite(n),
  );
  const price = Number(meta?.regularMarketPrice) || closes[closes.length - 1];
  const prev = Number(meta?.chartPreviousClose) || closes[closes.length - 2] || price;
  if (!price) return null;
  return {
    price,
    changePct: prev ? ((price - prev) / prev) * 100 : 0,
    spark: closes.slice(-14),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (cache && Date.now() - cache.at < TTL) {
    return new Response(cache.body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const quotes: Record<string, { price: number; changePct: number; spark: number[] }> = {};
  for (let i = 0; i < TICKERS.length; i += 8) {
    const chunk = TICKERS.slice(i, i + 8);
    const results = await Promise.allSettled(chunk.map((s) => quoteOne(s)));
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value) {
        const key = DISPLAY[chunk[idx]] ?? chunk[idx];
        quotes[key] = r.value;
      }
    });
  }

  if (!Object.keys(quotes).length) {
    return new Response(JSON.stringify({ error: "Stock upstream unavailable", quotes: {} }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = JSON.stringify({ quotes, source: "Yahoo Finance", at: new Date().toISOString() });
  cache = { at: Date.now(), body };
  return new Response(body, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
