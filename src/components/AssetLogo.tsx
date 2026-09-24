import { useState } from "react";

function seedHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

const PALETTE = [
  "bg-amber-500/25 text-amber-400",
  "bg-orange-500/25 text-orange-400",
  "bg-emerald-500/25 text-emerald-400",
  "bg-sky-500/25 text-sky-400",
  "bg-violet-500/25 text-violet-400",
  "bg-rose-500/25 text-rose-400",
  "bg-cyan-500/25 text-cyan-400",
  "bg-lime-500/25 text-lime-400",
  "bg-fuchsia-500/25 text-fuchsia-400",
  "bg-blue-500/25 text-blue-400",
];

/** Official-ish logo URLs + letter fallback (CoinMarketCap-style). */
const STOCK_DOMAIN: Record<string, string> = {
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  GOOGL: "abc.xyz",
  AMZN: "amazon.com",
  NVDA: "nvidia.com",
  META: "meta.com",
  TSLA: "tesla.com",
  "BRK.B": "berkshirehathaway.com",
  JPM: "jpmorganchase.com",
  V: "visa.com",
  UNH: "unitedhealthgroup.com",
  JNJ: "jnj.com",
  WMT: "walmart.com",
  PG: "pg.com",
  MA: "mastercard.com",
  HD: "homedepot.com",
  XOM: "exxonmobil.com",
  CVX: "chevron.com",
  BAC: "bankofamerica.com",
  KO: "coca-cola.com",
  PEP: "pepsico.com",
  ABBV: "abbvie.com",
  COST: "costco.com",
  MRK: "merck.com",
  LLY: "lilly.com",
  AVGO: "broadcom.com",
  TMO: "thermofisher.com",
  CRM: "salesforce.com",
  AMD: "amd.com",
  NFLX: "netflix.com",
  DIS: "disney.com",
  INTC: "intel.com",
  CSCO: "cisco.com",
  ADBE: "adobe.com",
  NKE: "nike.com",
  PYPL: "paypal.com",
  T: "att.com",
  VZ: "verizon.com",
  UBER: "uber.com",
  SQ: "block.xyz",
};

/** ISO country/region codes for flagcdn (base of pair or both for crosses). */
const FOREX_FLAG: Record<string, string> = {
  EUR: "eu",
  GBP: "gb",
  USD: "us",
  JPY: "jp",
  CHF: "ch",
  AUD: "au",
  CAD: "ca",
  NZD: "nz",
};

const COMMODITY_EMOJI: Record<string, string> = {
  GOLD: "🥇",
  SILVER: "🥈",
  OIL: "🛢️",
  BRENT: "🛢️",
  NATGAS: "🔥",
  COPPER: "🟠",
  PLAT: "⚪",
  PALL: "🔘",
  WHEAT: "🌾",
  CORN: "🌽",
};

const INDEX_EMOJI: Record<string, string> = {
  SPX: "📈",
  DJI: "📊",
  IXIC: "💻",
  RUT: "📉",
  FTSE: "🇬🇧",
  DAX: "🇩🇪",
  N225: "🇯🇵",
  HSI: "🇭🇰",
  SSEC: "🇨🇳",
  VIX: "⚡",
};

type Category = "crypto" | "stocks" | "forex" | "commodities" | "indices";

function cryptoLogoUrl(symbol: string): string {
  const s = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  // spothq cryptocurrency-icons (color, 128px)
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${s}.png`;
}

function stockLogoUrl(ticker: string): string | null {
  const domain = STOCK_DOMAIN[ticker] ?? STOCK_DOMAIN[ticker.replace(".", "-")];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

function forexFlagUrl(symbol: string): string | null {
  // Prefer quote currency for USD/xxx, else base
  const [base, quote] = symbol.split("/");
  const code = (quote === "USD" ? base : base === "USD" ? quote : base)?.toUpperCase();
  const iso = code ? FOREX_FLAG[code] : null;
  if (!iso) return null;
  return `https://flagcdn.com/w80/${iso}.png`;
}

export function AssetLogo({
  symbol,
  category,
  size = 36,
  className = "",
}: {
  symbol: string;
  category: Category;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const label = symbol.replace("/", "").slice(0, 3).toUpperCase();
  const palette = PALETTE[seedHash(symbol) % PALETTE.length];

  let src: string | null = null;
  let emoji: string | null = null;

  if (category === "crypto") {
    src = cryptoLogoUrl(symbol);
  } else if (category === "stocks") {
    src = stockLogoUrl(symbol);
  } else if (category === "forex") {
    src = forexFlagUrl(symbol);
  } else if (category === "commodities") {
    emoji = COMMODITY_EMOJI[symbol] ?? "📦";
  } else if (category === "indices") {
    emoji = INDEX_EMOJI[symbol] ?? "📊";
  }

  const dim = { width: size, height: size };

  if (emoji && !src) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 text-base ${palette} ${className}`}
        style={dim}
        title={symbol}
      >
        <span className="leading-none">{emoji}</span>
      </div>
    );
  }

  if (src && !failed) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 bg-secondary/80 flex items-center justify-center ${className}`}
        style={dim}
      >
        <img
          src={src}
          alt={symbol}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  // Letter fallback
  return (
    <div
      className={`rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${palette} ${className}`}
      style={dim}
      title={symbol}
    >
      {label}
    </div>
  );
}
