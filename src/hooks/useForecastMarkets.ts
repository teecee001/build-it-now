import { useQuery } from "@tanstack/react-query";

import {
  dailyVol, probAbove, probTouch, toCents, toSpark,
  addDays, fmtDate, daysToMonthEnd, daysToQuarterEnd,
} from "@/lib/forecastModel";

export type MarketCategory = "rates" | "crypto" | "commodities" | "events";

export interface ForecastMarket {
  id: string;
  category: MarketCategory;
  question: string;
  detail: string;
  yesPrice: number;
  volume?: number;
  spot: number;
  spotLabel?: string;
  unit: string;
  source: string;
  resolvesAt: string;
  resolvesInDays: number;
  spark: number[];
  hot?: boolean;
}

const FX_TARGETS = ["EUR", "GBP", "CHF", "JPY", "CAD", "AUD", "BRL", "INR", "MXN", "ZAR", "PLN", "SEK"] as const;

const FX_NAMES: Record<string, string> = {
  EUR: "euros", GBP: "pounds", CHF: "francs", JPY: "yen", CAD: "Canadian dollars",
  AUD: "Aussie dollars", BRL: "reais", INR: "rupees", MXN: "pesos",
  ZAR: "rand", PLN: "zloty", SEK: "krona",
};

const COIN_IDS = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "dogecoin", "cardano", "chainlink", "litecoin", "polkadot",
  "pax-gold", "tether-gold",
] as const;

const COIN_META: Record<string, { ticker: string; step: number; category: "crypto" | "commodities" }> = {
  bitcoin: { ticker: "BTC", step: 5000, category: "crypto" },
  ethereum: { ticker: "ETH", step: 100, category: "crypto" },
  solana: { ticker: "SOL", step: 10, category: "crypto" },
  binancecoin: { ticker: "BNB", step: 25, category: "crypto" },
  ripple: { ticker: "XRP", step: 0.05, category: "crypto" },
  dogecoin: { ticker: "DOGE", step: 0.02, category: "crypto" },
  cardano: { ticker: "ADA", step: 0.05, category: "crypto" },
  chainlink: { ticker: "LINK", step: 2, category: "crypto" },
  litecoin: { ticker: "LTC", step: 5, category: "crypto" },
  polkadot: { ticker: "DOT", step: 0.5, category: "crypto" },
  "pax-gold": { ticker: "XAU", step: 50, category: "commodities" },
  "tether-gold": { ticker: "XAUT", step: 50, category: "commodities" },
};

const CITIES = [
  { id: "lagos", name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { id: "london", name: "London", lat: 51.5074, lon: -0.1278 },
  { id: "nyc", name: "New York", lat: 40.7128, lon: -74.006 },
  { id: "tokyo", name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { id: "dubai", name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { id: "singapore", name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { id: "sao-paulo", name: "São Paulo", lat: -23.5505, lon: -46.6333 },
  { id: "nairobi", name: "Nairobi", lat: -1.2921, lon: 36.8219 },
];

interface CoinRow {
  id: string;
  prices: number[];
  spot: number;
  volume: number;
  ath: number;
  change7d: number;
}

interface WeatherRow {
  id: string;
  name: string;
  tomorrow: number;
  weekend: number;
  spark: number[];
}

interface MacroRow {
  fng: number[];
  btcDom: number;
  mcapChange: number;
}

interface MarketData {
  fx: Record<string, number[]> | null;
  coins: CoinRow[];
  weather: WeatherRow[];
  macro: MacroRow | null;
}

function roundTargetUp(spot: number, step: number) {
  if (step <= 0) return spot * 1.05;
  return Math.ceil((spot * 1.0001) / step) * step;
}

function fmtPx(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

async function fetchFx(): Promise<Record<string, number[]> | null> {
  try {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 120);
    const from = start.toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.frankfurter.dev/v1/${from}..?from=USD&to=${FX_TARGETS.join(",")}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const dates = Object.keys(data.rates ?? {}).sort();
    const rates: Record<string, number[]> = {};
    for (const code of FX_TARGETS) {
      rates[code] = dates
        .map((d: string) => data.rates[d]?.[code])
        .filter((v: unknown) => typeof v === "number") as number[];
    }
    return Object.values(rates).some((s) => s.length > 5) ? rates : null;
  } catch {
    return null;
  }
}

async function fetchCoins(): Promise<CoinRow[]> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}&sparkline=true&price_change_percentage=7d,30d`
    );
    if (!res.ok) return [];
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
    })).filter((c: CoinRow) => c.spot > 0 && c.prices.length > 5);
  } catch {
    return [];
  }
}

async function fetchWeatherCity(city: (typeof CITIES)[number]): Promise<WeatherRow | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=precipitation_probability_max&forecast_days=7&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const p: number[] = data?.daily?.precipitation_probability_max ?? [];
    if (!p.length) return null;
    const tomorrow = p[1] ?? p[0] ?? 0;
    const weekend = Math.max(p[5] ?? 0, p[6] ?? 0);
    return { id: city.id, name: city.name, tomorrow, weekend, spark: p.map((n) => Math.max(0, Math.min(100, n))) };
  } catch {
    return null;
  }
}

async function fetchMacro(): Promise<MacroRow | null> {
  try {
    const [fngRes, globRes] = await Promise.all([
      fetch("https://api.alternative.me/fng/?limit=14&format=json"),
      fetch("https://api.coingecko.com/api/v3/global"),
    ]);
    let fng: number[] = [];
    if (fngRes.ok) {
      const j = await fngRes.json();
      const arr = (j?.data ?? []) as { value: string }[];
      fng = arr.map((d) => Number(d.value)).filter((n) => Number.isFinite(n)).reverse();
    }
    let btcDom = 0, mcapChange = 0;
    if (globRes.ok) {
      const g = await globRes.json();
      btcDom = Number(g?.data?.market_cap_percentage?.btc) || 0;
      mcapChange = Number(g?.data?.market_cap_change_percentage_24h_usd) || 0;
    }
    if (!fng.length && !btcDom) return null;
    return { fng, btcDom, mcapChange };
  } catch {
    return null;
  }
}

async function fetchMarketData(): Promise<MarketData> {
  const [fx, coins, weatherSettled, macro] = await Promise.all([
    fetchFx(),
    fetchCoins(),
    Promise.all(CITIES.map(fetchWeatherCity)),
    fetchMacro(),
  ]);
  const weather = weatherSettled.filter((w): w is WeatherRow => !!w);
  if (!fx && !coins.length && !weather.length) throw new Error("No market data");
  return { fx, coins, weather, macro };
}

function fxMarkets(code: string, series: number[]): ForecastMarket[] {
  const spot = series[series.length - 1];
  const vol = dailyVol(series);
  const spark = toSpark(series);
  const name = FX_NAMES[code] ?? code;
  const d7 = addDays(7);
  const d30 = addDays(30);
  const t7 = spot * 1.005;
  const t30 = spot * 1.02;
  return [
    {
      id: `usd-${code.toLowerCase()}-7d`,
      category: "rates",
      question: `Will USD buy 0.5% more ${name} within 7 days?`,
      detail: `YES if ECB USD→${code} prints above ${t7.toFixed(4)} by ${fmtDate(d7)}. Spot ${spot.toFixed(4)}.`,
      yesPrice: toCents(probAbove(spot, t7, vol, 7)),
      spot, spotLabel: `${spot.toFixed(4)} USD/${code}`, unit: `USD/${code}`,
      source: "ECB via Frankfurter", resolvesAt: fmtDate(d7), resolvesInDays: 7, spark,
      hot: code === "EUR" || code === "GBP",
    },
    {
      id: `usd-${code.toLowerCase()}-30d`,
      category: "rates",
      question: `Will USD→${code} touch ${t30.toFixed(4)} within 30 days?`,
      detail: `A 2% USD bid from today's ${spot.toFixed(4)}. YES if the ECB reference trades there before ${fmtDate(d30)}.`,
      yesPrice: toCents(probTouch(spot, t30, vol, 30)),
      spot, spotLabel: `${spot.toFixed(4)} USD/${code}`, unit: `USD/${code}`,
      source: "ECB via Frankfurter", resolvesAt: fmtDate(d30), resolvesInDays: 30, spark,
    },
  ];
}

function coinMarkets(c: CoinRow): ForecastMarket[] {
  const meta = COIN_META[c.id];
  if (!meta) return [];
  const vol = dailyVol(c.prices);
  const spark = toSpark(c.prices);
  const monthDays = daysToMonthEnd();
  const monthEnd = addDays(monthDays);
  const target = roundTargetUp(c.spot, meta.step);
  const t7 = c.spot * 1.05;
  const out: ForecastMarket[] = [];
  const cat = meta.category;

  out.push({
    id: `${c.id}-month`,
    category: cat,
    question: cat === "commodities"
      ? `Will gold close above $${fmtPx(target)}/oz by ${fmtDate(monthEnd)}?`
      : `Will ${meta.ticker} close above $${fmtPx(target)} by ${fmtDate(monthEnd)}?`,
    detail: `Spot $${fmtPx(c.spot)}. YES if the daily close clears $${fmtPx(target)}.`,
    yesPrice: toCents(probAbove(c.spot, target, vol, monthDays)),
    volume: c.volume, spot: c.spot, spotLabel: `$${fmtPx(c.spot)}`,
    unit: "USD", source: "CoinGecko",
    resolvesAt: fmtDate(monthEnd), resolvesInDays: monthDays, spark,
    hot: c.id === "bitcoin" || c.id === "ethereum" || c.id === "pax-gold",
  });

  out.push({
    id: `${c.id}-7d-up5`,
    category: cat,
    question: `Will ${meta.ticker} rally 5% within 7 days?`,
    detail: `YES if price trades at or above $${fmtPx(t7)} (from $${fmtPx(c.spot)}) in the next week.`,
    yesPrice: toCents(probTouch(c.spot, t7, vol, 7)),
    volume: c.volume, spot: c.spot, spotLabel: `$${fmtPx(c.spot)}`,
    unit: "USD", source: "CoinGecko",
    resolvesAt: fmtDate(addDays(7)), resolvesInDays: 7, spark,
  });

  if (c.ath > c.spot * 1.02 && cat === "crypto") {
    const athDays = Math.min(90, Math.max(14, daysToQuarterEnd()));
    out.push({
      id: `${c.id}-ath`,
      category: "crypto",
      question: `Will ${meta.ticker} retouch its ATH of $${fmtPx(c.ath)} in ${athDays} days?`,
      detail: `${((1 - c.spot / c.ath) * 100).toFixed(1)}% below the all-time high.`,
      yesPrice: toCents(probTouch(c.spot, c.ath, vol, athDays)),
      volume: c.volume, spot: c.spot, spotLabel: `$${fmtPx(c.spot)}`,
      unit: "USD", source: "CoinGecko",
      resolvesAt: fmtDate(addDays(athDays)), resolvesInDays: athDays, spark,
    });
  }
  return out;
}

function eventMarkets(data: MarketData): ForecastMarket[] {
  const out: ForecastMarket[] = [];
  const d1 = addDays(1);
  const d7 = addDays(7);

  for (const w of data.weather) {
    out.push({
      id: `wx-${w.id}-tmr`,
      category: "events",
      question: `Will it rain in ${w.name} tomorrow?`,
      detail: `YES if Open-Meteo records precipitation tomorrow. Model rain chance ${Math.round(w.tomorrow)}%.`,
      yesPrice: toCents(w.tomorrow / 100),
      spot: w.tomorrow, spotLabel: `${Math.round(w.tomorrow)}% rain`,
      unit: "%", source: "Open-Meteo",
      resolvesAt: fmtDate(d1), resolvesInDays: 1, spark: w.spark,
      hot: w.id === "lagos" || w.id === "nyc",
    });
    out.push({
      id: `wx-${w.id}-wknd`,
      category: "events",
      question: `Will it rain in ${w.name} this weekend?`,
      detail: `YES if Sat or Sun has rain. Peak weekend probability ${Math.round(w.weekend)}%.`,
      yesPrice: toCents(w.weekend / 100),
      spot: w.weekend, spotLabel: `${Math.round(w.weekend)}% rain`,
      unit: "%", source: "Open-Meteo",
      resolvesAt: fmtDate(addDays(7)), resolvesInDays: 7, spark: w.spark,
    });
  }

  const btc = data.coins.find((c) => c.id === "bitcoin");
  const eth = data.coins.find((c) => c.id === "ethereum");
  if (btc && eth && btc.prices.length && eth.prices.length) {
    const n = Math.min(btc.prices.length, eth.prices.length);
    const ratio = btc.prices.slice(-n).map((p, i) => p / eth.prices[eth.prices.length - n + i]);
    const rSpot = ratio[ratio.length - 1];
    const rVol = dailyVol(ratio);
    out.push({
      id: "btc-eth-7d",
      category: "events",
      question: "Will BTC outperform ETH over the next 7 days?",
      detail: `YES if BTC/ETH finishes above ${rSpot.toFixed(3)} (today's ratio).`,
      yesPrice: toCents(probAbove(rSpot, rSpot * 1.01, rVol, 7)),
      spot: rSpot, spotLabel: `${rSpot.toFixed(3)} BTC/ETH`,
      unit: "BTC/ETH", source: "CoinGecko",
      resolvesAt: fmtDate(d7), resolvesInDays: 7, spark: toSpark(ratio), hot: true,
    });
    out.push({
      id: "btc-eth-both-up",
      category: "events",
      question: "Will BTC and ETH both finish the week higher?",
      detail: `Joint 7-day up-week. BTC 7d ${btc.change7d.toFixed(1)}%, ETH ${eth.change7d.toFixed(1)}%.`,
      yesPrice: toCents(
        probAbove(btc.spot, btc.spot, dailyVol(btc.prices), 7) *
        probAbove(eth.spot, eth.spot, dailyVol(eth.prices), 7)
      ),
      spot: btc.spot, spotLabel: `BTC $${fmtPx(btc.spot)}`,
      unit: "USD", source: "CoinGecko",
      resolvesAt: fmtDate(d7), resolvesInDays: 7, spark: toSpark(btc.prices),
    });
  }

  if (data.macro?.btcDom) {
    const dom = data.macro.btcDom;
    const target = dom + 0.5;
    out.push({
      id: "btc-dom-7d",
      category: "events",
      question: `Will Bitcoin dominance rise above ${target.toFixed(1)}% this week?`,
      detail: `BTC is ${dom.toFixed(2)}% of total crypto market cap (CoinGecko global).`,
      yesPrice: toCents(probAbove(dom, target, 0.004, 7)),
      spot: dom, spotLabel: `${dom.toFixed(2)}% dominance`,
      unit: "%", source: "CoinGecko Global",
      resolvesAt: fmtDate(d7), resolvesInDays: 7,
      spark: toSpark([dom - 1, dom - 0.4, dom, dom + data.macro.mcapChange / 20]),
    });
  }

  if (data.macro?.fng.length) {
    const series = data.macro.fng;
    const spot = series[series.length - 1];
    const vol = dailyVol(series.map((n) => Math.max(1, n)));
    out.push({
      id: "fng-greed-7d",
      category: "events",
      question: "Will Crypto Fear & Greed close the week in Greed (≥60)?",
      detail: `Index is ${spot} today. YES if it prints 60 or higher in 7 days.`,
      yesPrice: toCents(probAbove(Math.max(1, spot), 60, Math.max(vol, 0.05), 7)),
      spot, spotLabel: `${spot} F&G`,
      unit: "index", source: "alternative.me",
      resolvesAt: fmtDate(d7), resolvesInDays: 7, spark: toSpark(series),
      hot: spot <= 30 || spot >= 70,
    });
  }

  return out;
}

function buildMarkets(data: MarketData): ForecastMarket[] {
  const out: ForecastMarket[] = [];
  if (data.fx) {
    for (const code of FX_TARGETS) {
      const series = data.fx[code];
      if (series && series.length > 5) out.push(...fxMarkets(code, series));
    }
  }
  for (const c of data.coins) out.push(...coinMarkets(c));
  out.push(...eventMarkets(data));
  out.sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || b.yesPrice - a.yesPrice);
  return out;
}

export function useForecastMarkets() {
  const query = useQuery({
    queryKey: ["forecast-market-data-v3"],
    queryFn: fetchMarketData,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const markets = query.data ? buildMarkets(query.data) : [];
  const counts = {
    all: markets.length,
    rates: markets.filter((m) => m.category === "rates").length,
    crypto: markets.filter((m) => m.category === "crypto").length,
    commodities: markets.filter((m) => m.category === "commodities").length,
    events: markets.filter((m) => m.category === "events").length,
  };

  return {
    markets,
    counts,
    isLoading: query.isLoading,
    isError: query.isError || (!!query.data && markets.length === 0),
    isFetching: query.isFetching,
    lastUpdated: new Date(query.dataUpdatedAt || Date.now()),
    refetch: () => { query.refetch(); },
  };
}
