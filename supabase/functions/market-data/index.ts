/**
 * Unified market-data edge function (FREE sources only).
 * Optional secrets (not required):
 *   COINGECKO_DEMO_API_KEY — higher CoinGecko Demo limits
 *   TWELVE_DATA_API_KEY    — future upgrade path
 *   FINNHUB_API_KEY        — future upgrade path
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Quote = { price: number; changePct: number; spark: number[] };

const STOCK_YAHOO = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V",
  "UNH", "JNJ", "WMT", "PG", "MA", "HD", "XOM", "CVX", "BAC", "KO",
  "PEP", "ABBV", "COST", "MRK", "LLY", "AVGO", "TMO", "CRM", "AMD", "NFLX",
  "DIS", "INTC", "CSCO", "ADBE", "NKE", "PYPL", "T", "VZ", "UBER", "SQ",
];
const STOCK_DISPLAY: Record<string, string> = { "BRK-B": "BRK.B" };

const COMMODITY_YAHOO: Record<string, string> = {
  GOLD: "GC=F",
  SILVER: "SI=F",
  OIL: "CL=F",
  BRENT: "BZ=F",
  NATGAS: "NG=F",
  COPPER: "HG=F",
  PLAT: "PL=F",
  PALL: "PA=F",
  WHEAT: "ZW=F",
  CORN: "ZC=F",
};

const INDEX_YAHOO: Record<string, string> = {
  SPX: "^GSPC",
  DJI: "^DJI",
  IXIC: "^IXIC",
  RUT: "^RUT",
  FTSE: "^FTSE",
  DAX: "^GDAXI",
  N225: "^N225",
  HSI: "^HSI",
  SSEC: "000001.SS",
  VIX: "^VIX",
};

const CRYPTO_IDS =
  "bitcoin,ethereum,tether,binancecoin,ripple,cardano,solana,dogecoin,matic-network,polkadot,shiba-inu,tron,avalanche-2,chainlink,uniswap,cosmos,litecoin,stellar,bitcoin-cash,algorand,vechain,filecoin,internet-computer,aptos,hedera-hashgraph,near,quant-network,arbitrum,optimism,the-graph,maker,aave,blockstack,elrond-erd-2,the-sandbox,decentraland,axie-infinity,theta-token,fantom,tezos";

const CRYPTO_CODE: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  tether: "USDT",
  binancecoin: "BNB",
  ripple: "XRP",
  cardano: "ADA",
  solana: "SOL",
  dogecoin: "DOGE",
  "matic-network": "MATIC",
  polkadot: "DOT",
  "shiba-inu": "SHIB",
  tron: "TRX",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  uniswap: "UNI",
  cosmos: "ATOM",
  litecoin: "LTC",
  stellar: "XLM",
  "bitcoin-cash": "BCH",
  algorand: "ALGO",
  vechain: "VET",
  filecoin: "FIL",
  "internet-computer": "ICP",
  aptos: "APT",
  "hedera-hashgraph": "HBAR",
  near: "NEAR",
  "quant-network": "QNT",
  arbitrum: "ARB",
  optimism: "OP",
  "the-graph": "GRT",
  maker: "MKR",
  aave: "AAVE",
  blockstack: "STX",
  "elrond-erd-2": "EGLD",
  "the-sandbox": "SAND",
  decentraland: "MANA",
  "axie-infinity": "AXS",
  "theta-token": "THETA",
  fantom: "FTM",
  tezos: "XTZ",
};

const cache = new Map<string, { at: number; body: string }>();
const TTL: Record<string, number> = {
  crypto: 60_000,
  forex: 5 * 60_000,
  stocks: 90_000,
  commodities: 90_000,
  indices: 90_000,
  all: 60_000,
};

async function yahooQuote(sym: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`,
      { headers: { "User-Agent": "Mozilla/5.0 ExoSky-market-data/1.0" } },
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
    if (!price || !Number.isFinite(price)) return null;
    return {
      price,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      spark: closes.slice(-14),
    };
  } catch {
    return null;
  }
}

async function fetchYahooMap(
  mapping: Record<string, string> | string[],
  displayMap?: Record<string, string>,
): Promise<Record<string, Quote>> {
  const entries: [string, string][] = Array.isArray(mapping)
    ? mapping.map((s) => [displayMap?.[s] ?? s, s])
    : Object.entries(mapping).map(([app, y]) => [app, y]);

  const out: Record<string, Quote> = {};
  for (let i = 0; i < entries.length; i += 6) {
    const chunk = entries.slice(i, i + 6);
    const results = await Promise.allSettled(chunk.map(([, y]) => yahooQuote(y)));
    results.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value) {
        out[chunk[idx][0]] = r.value;
      }
    });
  }
  return out;
}

async function fetchCrypto(): Promise<Record<string, Quote>> {
  const key = Deno.env.get("COINGECKO_DEMO_API_KEY");
  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_IDS}&vs_currencies=usd&include_24hr_change=true` +
    (key ? `&x_cg_demo_api_key=${key}` : "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) headers["x-cg-demo-api-key"] = key;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const out: Record<string, Quote> = {};
  for (const [id, row] of Object.entries(data as Record<string, { usd?: number; usd_24h_change?: number }>)) {
    const code = CRYPTO_CODE[id];
    if (!code || row.usd == null) continue;
    const change = typeof row.usd_24h_change === "number" ? row.usd_24h_change : 0;
    const n = 14;
    const end = row.usd;
    const start = end / (1 + change / 100);
    const spark = Array.from({ length: n }, (_, j) => start + (end - start) * (j / (n - 1)));
    out[code] = { price: row.usd, changePct: change, spark };
  }
  return out;
}

async function fetchForex(): Promise<Record<string, Quote>> {
  const res = await fetch("https://api.frankfurter.app/latest?from=USD");
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = await res.json();
  const rates = data.rates as Record<string, number>;

  const pairs: { symbol: string; price: number }[] = [];
  if (rates.EUR) pairs.push({ symbol: "EUR/USD", price: 1 / rates.EUR });
  if (rates.GBP) pairs.push({ symbol: "GBP/USD", price: 1 / rates.GBP });
  if (rates.JPY) pairs.push({ symbol: "USD/JPY", price: rates.JPY });
  if (rates.CHF) pairs.push({ symbol: "USD/CHF", price: rates.CHF });
  if (rates.AUD) pairs.push({ symbol: "AUD/USD", price: 1 / rates.AUD });
  if (rates.CAD) pairs.push({ symbol: "USD/CAD", price: rates.CAD });
  if (rates.NZD) pairs.push({ symbol: "NZD/USD", price: 1 / rates.NZD });
  if (rates.EUR && rates.GBP) pairs.push({ symbol: "EUR/GBP", price: rates.GBP / rates.EUR });
  if (rates.EUR && rates.JPY) pairs.push({ symbol: "EUR/JPY", price: rates.JPY / rates.EUR });
  if (rates.GBP && rates.JPY) pairs.push({ symbol: "GBP/JPY", price: rates.JPY / rates.GBP });

  let prevRates: Record<string, number> = {};
  try {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const ymd = d.toISOString().slice(0, 10);
    const prevRes = await fetch(`https://api.frankfurter.app/${ymd}?from=USD`);
    if (prevRes.ok) {
      const pj = await prevRes.json();
      prevRates = pj.rates ?? {};
    }
  } catch {
    /* ignore */
  }

  const out: Record<string, Quote> = {};
  for (const p of pairs) {
    let changePct = 0;
    const [base, quote] = p.symbol.split("/");
    let prevPrice = 0;
    if (quote === "USD" && prevRates[base]) prevPrice = 1 / prevRates[base];
    else if (base === "USD" && prevRates[quote]) prevPrice = prevRates[quote];
    else if (prevRates[base] && prevRates[quote]) prevPrice = prevRates[quote] / prevRates[base];
    if (prevPrice) changePct = ((p.price - prevPrice) / prevPrice) * 100;

    const n = 14;
    const end = p.price;
    const start = end / (1 + (changePct || 0.1) / 100);
    const spark = Array.from({ length: n }, (_, j) => start + (end - start) * (j / (n - 1)));
    out[p.symbol] = { price: p.price, changePct, spark };
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let cls = (url.searchParams.get("class") || "all").toLowerCase();
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.class) cls = String(body.class).toLowerCase();
    } catch {
      /* empty body ok */
    }
  }

  const cached = cache.get(cls);
  const ttl = TTL[cls] ?? TTL.all;
  if (cached && Date.now() - cached.at < ttl) {
    return new Response(cached.body, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  try {
    const payload: Record<string, unknown> = {
      at: new Date().toISOString(),
      sources: {} as Record<string, string>,
    };

    const need = (c: string) => cls === "all" || cls === c;

    if (need("crypto")) {
      try {
        payload.crypto = await fetchCrypto();
        (payload.sources as Record<string, string>).crypto = "CoinGecko";
      } catch (e) {
        payload.crypto = {};
        (payload.sources as Record<string, string>).crypto = `error:${String(e)}`;
      }
    }

    if (need("forex")) {
      try {
        payload.forex = await fetchForex();
        (payload.sources as Record<string, string>).forex = "Frankfurter/ECB";
      } catch (e) {
        payload.forex = {};
        (payload.sources as Record<string, string>).forex = `error:${String(e)}`;
      }
    }

    if (need("stocks")) {
      payload.stocks = await fetchYahooMap(STOCK_YAHOO, STOCK_DISPLAY);
      (payload.sources as Record<string, string>).stocks = "Yahoo Finance";
    }

    if (need("commodities")) {
      payload.commodities = await fetchYahooMap(COMMODITY_YAHOO);
      (payload.sources as Record<string, string>).commodities = "Yahoo Finance";
    }

    if (need("indices")) {
      payload.indices = await fetchYahooMap(INDEX_YAHOO);
      (payload.sources as Record<string, string>).indices = "Yahoo Finance";
    }

    const body = JSON.stringify(payload);
    cache.set(cls, { at: Date.now(), body });
    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
