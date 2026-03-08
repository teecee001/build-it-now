import { useMemo } from "react";

// Deterministic mock stock prices based on ticker
// In a real app, this would connect to a stock API
function seedFromTicker(ticker: string): number {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ((hash << 5) - hash) + ticker.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const BASE_PRICES: Record<string, number> = {
  AAPL: 198.50, MSFT: 420.30, GOOGL: 175.80, AMZN: 185.60, NVDA: 875.40,
  META: 515.20, TSLA: 245.70, "BRK.B": 415.90, JPM: 198.40, V: 282.50,
  UNH: 525.30, JNJ: 158.60, WMT: 175.20, PG: 168.90, MA: 465.80,
  HD: 385.40, XOM: 108.50, CVX: 155.30, BAC: 37.80, KO: 62.40,
  PEP: 172.60, ABBV: 178.40, COST: 745.20, MRK: 128.60, LLY: 785.40,
  AVGO: 1385.60, TMO: 565.80, CRM: 305.40, AMD: 178.90, NFLX: 625.40,
  DIS: 112.30, INTC: 42.80, CSCO: 52.40, ADBE: 545.60, NKE: 98.70,
  PYPL: 68.40, T: 18.50, VZ: 42.30, UBER: 75.80, SQ: 82.40,
};

export function useStockPrices() {
  const prices = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [ticker, base] of Object.entries(BASE_PRICES)) {
      // Add slight variation based on current hour for "live" feel
      const hourSeed = new Date().getHours();
      const variation = (Math.sin(seedFromTicker(ticker) + hourSeed * 0.5) * 0.02);
      result[ticker] = parseFloat((base * (1 + variation)).toFixed(2));
    }
    return result;
  }, []);

  const getPrice = (ticker: string) => prices[ticker] ?? 0;

  const getChange = (ticker: string) => {
    const seed = seedFromTicker(ticker);
    return parseFloat(((Math.sin(seed * 1.7 + 0.3) * 5) + 0.3).toFixed(2));
  };

  return { prices, getPrice, getChange };
}
