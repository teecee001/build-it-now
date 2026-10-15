export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
}

export const STOCK_LIST: StockInfo[] = [
  { ticker: "AAPL", name: "Apple", sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft", sector: "Technology" },
  { ticker: "GOOGL", name: "Alphabet", sector: "Technology" },
  { ticker: "AMZN", name: "Amazon", sector: "Consumer Cyclical" },
  { ticker: "NVDA", name: "NVIDIA", sector: "Technology" },
  { ticker: "META", name: "Meta Platforms", sector: "Technology" },
  { ticker: "TSLA", name: "Tesla", sector: "Consumer Cyclical" },
  { ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Financials" },
  { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials" },
  { ticker: "V", name: "Visa", sector: "Financials" },
  { ticker: "UNH", name: "UnitedHealth", sector: "Healthcare" },
  { ticker: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { ticker: "WMT", name: "Walmart", sector: "Consumer Defensive" },
  { ticker: "PG", name: "Procter & Gamble", sector: "Consumer Defensive" },
  { ticker: "MA", name: "Mastercard", sector: "Financials" },
  { ticker: "HD", name: "Home Depot", sector: "Consumer Cyclical" },
  { ticker: "XOM", name: "Exxon Mobil", sector: "Energy" },
  { ticker: "CVX", name: "Chevron", sector: "Energy" },
  { ticker: "BAC", name: "Bank of America", sector: "Financials" },
  { ticker: "KO", name: "Coca-Cola", sector: "Consumer Defensive" },
  { ticker: "PEP", name: "PepsiCo", sector: "Consumer Defensive" },
  { ticker: "ABBV", name: "AbbVie", sector: "Healthcare" },
  { ticker: "COST", name: "Costco", sector: "Consumer Defensive" },
  { ticker: "MRK", name: "Merck", sector: "Healthcare" },
  { ticker: "LLY", name: "Eli Lilly", sector: "Healthcare" },
  { ticker: "AVGO", name: "Broadcom", sector: "Technology" },
  { ticker: "TMO", name: "Thermo Fisher", sector: "Healthcare" },
  { ticker: "CRM", name: "Salesforce", sector: "Technology" },
  { ticker: "AMD", name: "AMD", sector: "Technology" },
  { ticker: "NFLX", name: "Netflix", sector: "Communication" },
  { ticker: "DIS", name: "Walt Disney", sector: "Communication" },
  { ticker: "INTC", name: "Intel", sector: "Technology" },
  { ticker: "CSCO", name: "Cisco", sector: "Technology" },
  { ticker: "ADBE", name: "Adobe", sector: "Technology" },
  { ticker: "NKE", name: "Nike", sector: "Consumer Cyclical" },
  { ticker: "PYPL", name: "PayPal", sector: "Financials" },
  { ticker: "T", name: "AT&T", sector: "Communication" },
  { ticker: "VZ", name: "Verizon", sector: "Communication" },
  { ticker: "UBER", name: "Uber", sector: "Technology" },
  { ticker: "SQ", name: "Block (Square)", sector: "Financials" },
];

export const TRENDING_STOCKS = ["NVDA", "AAPL", "TSLA", "MSFT", "META", "AMZN", "GOOGL", "AMD"];

export const SECTOR_COLORS: Record<string, string> = {
  Technology: "text-blue-400",
  Financials: "text-emerald-400",
  Healthcare: "text-rose-400",
  "Consumer Cyclical": "text-amber-400",
  "Consumer Defensive": "text-teal-400",
  Energy: "text-orange-400",
  Communication: "text-purple-400",
};
