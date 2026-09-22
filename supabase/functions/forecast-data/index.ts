const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FX_TARGETS = ["EUR", "GBP", "CHF", "JPY", "CAD", "AUD", "BRL", "INR", "MXN", "ZAR", "PLN", "SEK"];
const COIN_IDS = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "dogecoin", "cardano", "chainlink", "litecoin", "polkadot",
  "pax-gold", "tether-gold",
];

let cache: { at: number; body: string } | null = null;
const TTL = 60_000;

async function fetchFx() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 120);
  const from = start.toISOString().slice(0, 10);
  const res = await fetch(
    `https://api.frankfurter.dev/v1/${from}..?from=USD&to=${FX_TARGETS.join(",")}`,
  );
  if (!res.ok) throw new Error("fx failed");
  const data = await res.json();
  const dates = Object.keys(data.rates ?? {}).sort();
  const rates: Record<string, number[]> = {};
  for (const code of FX_TARGETS) {
    rates[code] = dates
      .map((d: string) => data.rates[d]?.[code])
      .filter((v: unknown) => typeof v === "number") as number[];
  }
  if (!Object.values(rates).some((s) => s.length > 5)) throw new Error("fx empty");
  return rates;
}

async function fetchCoins() {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}&sparkline=true&price_change_percentage=7d,30d`,
  );
  if (!res.ok) throw new Error("coins failed");
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((r: {
    id: string; current_price: number; total_volume: number; ath: number;
    sparkline_in_7d?: { price?: number[] };
    price_change_percentage_7d_in_currency?: number;
  }) => ({
    id: r.id,
    prices: r.sparkline_in_7d?.price?.filter((n) => typeof n === "number" && n > 0) ?? [],
    spot: r.current_price,
    volume: r.total_volume,
    ath: r.ath,
    change7d: r.price_change_percentage_7d_in_currency ?? 0,
  })).filter((c: { spot: number; prices: number[] }) => c.spot > 0 && c.prices.length > 5);
}

async function fetchMacro() {
  const [fngRes, globRes] = await Promise.all([
    fetch("https://api.alternative.me/fng/?limit=14&format=json"),
    fetch("https://api.coingecko.com/api/v3/global"),
  ]);
  let fng: number[] = [];
  if (fngRes.ok) {
    const j = await fngRes.json();
    fng = ((j?.data ?? []) as { value: string }[])
      .map((d) => Number(d.value))
      .filter((n) => Number.isFinite(n))
      .reverse();
  }
  let btcDom = 0, mcapChange = 0;
  if (globRes.ok) {
    const g = await globRes.json();
    btcDom = Number(g?.data?.market_cap_percentage?.btc) || 0;
    mcapChange = Number(g?.data?.market_cap_change_percentage_24h_usd) || 0;
  }
  if (!fng.length && !btcDom) return null;
  return { fng, btcDom, mcapChange };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (cache && Date.now() - cache.at < TTL) {
    return new Response(cache.body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [fxRes, coinsRes, macroRes] = await Promise.allSettled([
    fetchFx(),
    fetchCoins(),
    fetchMacro(),
  ]);

  const payload = {
    fx: fxRes.status === "fulfilled" ? fxRes.value : null,
    coins: coinsRes.status === "fulfilled" ? coinsRes.value : [],
    macro: macroRes.status === "fulfilled" ? macroRes.value : null,
  };

  if (!payload.fx && !payload.coins.length) {
    return new Response(JSON.stringify({ error: "Upstream market data unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = JSON.stringify(payload);
  cache = { at: Date.now(), body };
  return new Response(body, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
