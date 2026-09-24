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

/** Company domain → Clearbit logo (stocks). */
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

/** Index operator / brand domain → official logo via Clearbit. */
const INDEX_DOMAIN: Record<string, string> = {
  SPX: "spglobal.com",
  DJI: "dowjones.com",
  IXIC: "nasdaq.com",
  RUT: "lseg.com",
  FTSE: "lseg.com",
  DAX: "deutsche-boerse.com",
  N225: "nikkei.co.jp",
  HSI: "hsi.com.hk",
  SSEC: "sse.com.cn",
  VIX: "cboe.com",
};

/** Commodity-related brand / council domain → logo. */
const COMMODITY_DOMAIN: Record<string, string> = {
  GOLD: "gold.org",
  SILVER: "silverinstitute.org",
  OIL: "eia.gov",
  BRENT: "ice.com",
  NATGAS: "eia.gov",
  COPPER: "lme.com",
  PLAT: "platinuminvestment.com",
  PALL: "palladium.com",
  WHEAT: "cbot.com",
  CORN: "cmegroup.com",
};

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

type Category = "crypto" | "stocks" | "forex" | "commodities" | "indices";

function cryptoLogoUrl(symbol: string): string {
  const s = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${s}.png`;
}

function clearbit(domain: string) {
  return `https://logo.clearbit.com/${domain}`;
}

function stockLogoUrl(ticker: string): string | null {
  const domain = STOCK_DOMAIN[ticker] ?? STOCK_DOMAIN[ticker.replace(".", "-")];
  return domain ? clearbit(domain) : null;
}

function indexLogoUrl(symbol: string): string | null {
  const domain = INDEX_DOMAIN[symbol];
  return domain ? clearbit(domain) : null;
}

function commodityLogoUrl(symbol: string): string | null {
  const domain = COMMODITY_DOMAIN[symbol];
  return domain ? clearbit(domain) : null;
}

function forexFlagUrl(symbol: string): string | null {
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

  if (category === "crypto") {
    src = cryptoLogoUrl(symbol);
  } else if (category === "stocks") {
    src = stockLogoUrl(symbol);
  } else if (category === "forex") {
    src = forexFlagUrl(symbol);
  } else if (category === "commodities") {
    src = commodityLogoUrl(symbol);
  } else if (category === "indices") {
    src = indexLogoUrl(symbol);
  }

  const dim = { width: size, height: size };

  if (src && !failed) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 bg-white/95 flex items-center justify-center ${className}`}
        style={dim}
      >
        <img
          src={src}
          alt={symbol}
          width={size}
          height={size}
          className="w-[85%] h-[85%] object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  // Letter fallback only when logo URL missing or failed
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
