export interface MarketAsset {
  symbol: string;
  name: string;
  category: "commodity" | "index" | "forex";
  price: number;
  change: number;
}

export const COMMODITIES: MarketAsset[] = [
  { symbol: "GOLD", name: "Gold", category: "commodity", price: 2345.80, change: 0.82 },
  { symbol: "SILVER", name: "Silver", category: "commodity", price: 28.45, change: -0.35 },
  { symbol: "OIL", name: "Crude Oil (WTI)", category: "commodity", price: 78.60, change: 1.24 },
  { symbol: "BRENT", name: "Brent Crude", category: "commodity", price: 82.15, change: 0.95 },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodity", price: 2.18, change: -1.82 },
  { symbol: "COPPER", name: "Copper", category: "commodity", price: 4.52, change: 0.67 },
  { symbol: "PLAT", name: "Platinum", category: "commodity", price: 985.40, change: -0.42 },
  { symbol: "PALL", name: "Palladium", category: "commodity", price: 1025.60, change: 1.15 },
  { symbol: "WHEAT", name: "Wheat", category: "commodity", price: 612.50, change: -0.28 },
  { symbol: "CORN", name: "Corn", category: "commodity", price: 445.75, change: 0.53 },
];

export const INDICES: MarketAsset[] = [
  { symbol: "SPX", name: "S&P 500", category: "index", price: 5248.50, change: 0.45 },
  { symbol: "DJI", name: "Dow Jones", category: "index", price: 39280.75, change: 0.32 },
  { symbol: "IXIC", name: "NASDAQ", category: "index", price: 16420.30, change: 0.78 },
  { symbol: "RUT", name: "Russell 2000", category: "index", price: 2085.40, change: -0.15 },
  { symbol: "FTSE", name: "FTSE 100", category: "index", price: 8145.20, change: 0.28 },
  { symbol: "DAX", name: "DAX 40", category: "index", price: 18425.60, change: 0.52 },
  { symbol: "N225", name: "Nikkei 225", category: "index", price: 40250.80, change: 1.12 },
  { symbol: "HSI", name: "Hang Seng", category: "index", price: 16890.45, change: -0.68 },
  { symbol: "SSEC", name: "Shanghai Composite", category: "index", price: 3045.20, change: 0.18 },
  { symbol: "VIX", name: "VIX (Volatility)", category: "index", price: 14.85, change: -3.42 },
];

export const FOREX_PAIRS: MarketAsset[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", price: 1.0845, change: 0.12 },
  { symbol: "GBP/USD", name: "Pound / US Dollar", category: "forex", price: 1.2685, change: -0.08 },
  { symbol: "USD/JPY", name: "US Dollar / Yen", category: "forex", price: 151.42, change: 0.25 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex", price: 0.8825, change: -0.15 },
  { symbol: "AUD/USD", name: "Aussie / US Dollar", category: "forex", price: 0.6542, change: 0.32 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian", category: "forex", price: 1.3645, change: -0.18 },
  { symbol: "NZD/USD", name: "Kiwi / US Dollar", category: "forex", price: 0.6085, change: 0.45 },
  { symbol: "EUR/GBP", name: "Euro / Pound", category: "forex", price: 0.8548, change: 0.22 },
  { symbol: "EUR/JPY", name: "Euro / Yen", category: "forex", price: 164.18, change: 0.38 },
  { symbol: "GBP/JPY", name: "Pound / Yen", category: "forex", price: 192.05, change: 0.15 },
];
