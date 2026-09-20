const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FX_TARGETS = ["EUR", "GBP", "BRL", "JPY", "INR"];
const COINS = ["bitcoin", "ethereum", "pax-gold"];

let cache: { at: number; body: string } | null = null;
const TTL = 60_000;

async function fetchFx() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 120);
  const from = start.toISOString().slice(0, 10);
  const res = await fetch(`https://api.frankfurter.dev/v1/${from}..?from=USD&to=${FX_TARGETS.join(",")}`);
  if (!res.ok) throw new Error("fx failed");
  const data = await res.json();
  const dates = Object.keys(data.rates ?? {}).sort();
  const rates: Record<string, number[]> = {};
  for (const code of FX_TARGETS) {
    rates[code] = dates
      .map((d: string) => data.rates[d]?.[code])
      .filter((v: unknown) => typeof v === "number");
  }
  return rates;
}

async function fetchCoin(id: string) {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=90&interval=daily`
  );
  if (!res.ok) throw new Error(`${id} failed`);
  const data = await res.json();
  const prices: number[] = (data.prices ?? []).map((p: [number, number]) => p[1]);
  const volumes: number[] = (data.total_volumes ?? []).map((p: [number, number]) => p[1]);
  return {
    prices,
    spot: prices[prices.length - 1] ?? 0,
    volume: volumes[volumes.length - 1] ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (cache && Date.now() - cache.at < TTL) {
    return new Response(cache.body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [fxRes, ...coinRes] = await Promise.allSettled([
    fetchFx(),
    ...COINS.map((id) => fetchCoin(id)),
  ]);

  const crypto: Record<string, unknown> = {};
  COINS.forEach((id, i) => {
    const r = coinRes[i];
    if (r.status === "fulfilled") crypto[id] = r.value;
  });

  const payload = {
    fx: fxRes.status === "fulfilled" ? fxRes.value : null,
    crypto,
  };

  if (!payload.fx && Object.keys(crypto).length === 0) {
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
