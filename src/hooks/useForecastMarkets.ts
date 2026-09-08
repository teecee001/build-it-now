import { useQuery } from "@tanstack/react-query";
import {
  dailyVol, probAbove, probTouch, toCents, toSpark,
  addDays, fmtDate, daysToMonthEnd, daysToQuarterEnd,
} from "@/lib/forecastModel";

export type MarketCategory = "rates" | "crypto" | "economy";

export interface ForecastMarket {
  id: string;
  category: MarketCategory;
  question: string;
  detail: string;
  yesPrice: number;      // cents 1–99, derived from live data
  volume?: number;       // USD 24h volume where the source reports it
  spot: number;
  unit: string;
  source: string;
  resolvesAt: string;
  resolvesInDays: number;
  spark: number[];
  hot?: boolean;
}

// ── Data sources ─────────────────────────────────────────────
// FX: Frankfurter (European Central Bank reference rates, free, no key)
// Crypto & gold: CoinGecko public API (PAXG tracks the spot gold ounce)

const FX_TARGETS = ["EUR", "GBP", "BRL", "JPY", "INR"] as const;

interface FxSeries { rates: Record<string, number[]>; latest: Record<string, number> }

async function fetchFxSeries(): Promise<FxSeries> {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 120);
  const from = start.toISOString().slice(0, 10);
  const res = await fetch(
    `https://api.frankfurter.app/${from}..?from=USD&to=${FX_TARGETS.join(",")}`
  );
  if (!res.ok) throw new Error("Failed to load FX history");
  const data = await res.json();
  const dates = Object.keys(data.rates).sort();
  const rates: Record<string, number[]> = {};
  const latest: Record<string, number> = {};
  for (const code of FX_TARGETS) {
    rates[code] = dates.map((d) => data.rates[d][code]).filter((v: number) => typeof v === "number");
    latest[code] = rates[code][rates[code].length - 1];
  }
  return { rates, latest };
}

interface CoinSeries { prices: number[]; spot: number; volume: number }

async function fetchCoin(id: string): Promise<CoinSeries> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=90&interval=daily`
  );
  if (!res.ok) throw new Error(`Failed to load ${id} history`);
  const data = await res.json();
  const prices: number[] = (data.prices ?? []).map((p: [number, number]) => p[1]);
  const volumes: number[] = (data.total_volumes ?? []).map((p: [number, number]) => p[1]);
  return {
    prices,
    spot: prices[prices.length - 1] ?? 0,
    volume: volumes[volumes.length - 1] ?? 0,
  };
}

async function fetchCrypto(): Promise<Record<string, CoinSeries>> {
  const ids = ["bitcoin", "ethereum", "pax-gold"];
  const results = await Promise.all(ids.map(fetchCoin));
  return Object.fromEntries(ids.map((id, i) => [id, results[i]]));
}

// ── Market construction ──────────────────────────────────────

const FX_NAMES: Record<string, string> = {
  EUR: "euros", GBP: "pounds", BRL: "Brazilian real", JPY: "Japanese yen", INR: "Indian rupees",
};

function fx(code: string, series: number[]): ForecastMarket[] {
  const spot = series[series.length - 1];
  const vol = dailyVol(series);
  const spark = toSpark(series);
  const out: ForecastMarket[] = [];

  // 1) Rolling 7-day "does the rate improve?" market
  const d7 = addDays(7);
  out.push({
    id: `usd-${code.toLowerCase()}-7d`,
    category: "rates",
    question: `Will USD buy more ${FX_NAMES[code] ?? code} in 7 days than today?`,
    detail: `Resolves YES if the ECB reference USD→${code} rate on ${fmtDate(d7)} is above today's ${spot.toFixed(4)}.`,
    yesPrice: toCents(probAbove(spot, spot, vol, 7)),
    spot, unit: `USD/${code}`, source: "ECB via Frankfurter",
    resolvesAt: fmtDate(d7), resolvesInDays: 7,
    spark,
    hot: code === "EUR",
  });

  // 2) Rolling 30-day 2% move market
  const target = spot * 1.02;
  const d30 = addDays(30);
  out.push({
    id: `usd-${code.toLowerCase()}-30d`,
    category: "rates",
    question: `Will USD→${code} touch ${target.toFixed(4)} within 30 days?`,
    detail: `A 2% strengthening from today's ${spot.toFixed(4)}. Resolves YES if the reference rate reaches it before ${fmtDate(d30)}.`,
    yesPrice: toCents(probTouch(spot, target, vol, 30)),
    spot, unit: `USD/${code}`, source: "ECB via Frankfurter",
    resolvesAt: fmtDate(d30), resolvesInDays: 30,
    spark,
  });

  return out;
}

function roundTargetUp(spot: number, step: number) {
  return Math.ceil((spot * 1.0001) / step) * step;
}

function crypto(coins: Record<string, CoinSeries>): ForecastMarket[] {
  const out: ForecastMarket[] = [];
  const monthDays = daysToMonthEnd();
  const monthEnd = addDays(monthDays);

  const btc = coins["bitcoin"];
  if (btc?.spot) {
    const vol = dailyVol(btc.prices);
    const target = roundTargetUp(btc.spot, 25000);
    out.push({
      id: "btc-target",
      category: "crypto",
      question: `Will BTC close above $${target.toLocaleString()} by ${fmtDate(monthEnd)}?`,
      detail: `Spot is $${Math.round(btc.spot).toLocaleString()}. Resolves YES if the BTC/USD daily close exceeds $${target.toLocaleString()}.`,
      yesPrice: toCents(probAbove(btc.spot, target, vol, monthDays)),
      volume: btc.volume, spot: btc.spot, unit: "USD", source: "CoinGecko",
      resolvesAt: fmtDate(monthEnd), resolvesInDays: monthDays,
      spark: toSpark(btc.prices), hot: true,
    });
  }

  const eth = coins["ethereum"];
  if (eth?.spot) {
    const vol = dailyVol(eth.prices);
    const target = roundTargetUp(eth.spot, 500);
    out.push({
      id: "eth-target",
      category: "crypto",
      question: `Will ETH touch $${target.toLocaleString()} before ${fmtDate(monthEnd)}?`,
      detail: `Spot is $${Math.round(eth.spot).toLocaleString()}. Resolves YES if ETH/USD reaches $${target.toLocaleString()} at any point.`,
      yesPrice: toCents(probTouch(eth.spot, target, vol, monthDays)),
      volume: eth.volume, spot: eth.spot, unit: "USD", source: "CoinGecko",
      resolvesAt: fmtDate(monthEnd), resolvesInDays: monthDays,
      spark: toSpark(eth.prices),
    });
  }

  const gold = coins["pax-gold"];
  if (gold?.spot) {
    const vol = dailyVol(gold.prices);
    const qDays = daysToQuarterEnd();
    const qEnd = addDays(qDays);
    const target = roundTargetUp(gold.spot, 250);
    out.push({
      id: "gold-target",
      category: "economy",
      question: `Will gold close above $${target.toLocaleString()}/oz this quarter?`,
      detail: `Tracked via PAXG (1 token = 1 fine troy ounce), now $${Math.round(gold.spot).toLocaleString()}.`,
      yesPrice: toCents(probAbove(gold.spot, target, vol, qDays)),
      volume: gold.volume, spot: gold.spot, unit: "USD/oz", source: "CoinGecko (PAXG)",
      resolvesAt: fmtDate(qEnd), resolvesInDays: qDays,
      spark: toSpark(gold.prices),
    });
  }

  return out;
}

export function useForecastMarkets() {
  const fxQuery = useQuery({
    queryKey: ["forecast-fx"],
    queryFn: fetchFxSeries,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
  });

  const cryptoQuery = useQuery({
    queryKey: ["forecast-crypto"],
    queryFn: fetchCrypto,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const markets: ForecastMarket[] = [];
  if (fxQuery.data) {
    for (const code of FX_TARGETS) {
      const series = fxQuery.data.rates[code];
      if (series?.length > 5) markets.push(...fx(code, series));
    }
  }
  if (cryptoQuery.data) markets.push(...crypto(cryptoQuery.data));

  return {
    markets,
    isLoading: fxQuery.isLoading || cryptoQuery.isLoading,
    isError: fxQuery.isError && cryptoQuery.isError,
    isFetching: fxQuery.isFetching || cryptoQuery.isFetching,
    lastUpdated: new Date(Math.max(fxQuery.dataUpdatedAt || 0, cryptoQuery.dataUpdatedAt || 0)),
    refetch: () => { fxQuery.refetch(); cryptoQuery.refetch(); },
  };
}
