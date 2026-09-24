import { useState, useMemo } from "react";

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

/** Stock ticker → company domain */
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

/** Index symbol → operator brand domain (official logos) */
const INDEX_DOMAIN: Record<string, string> = {
  SPX: "spglobal.com",
  DJI: "dowjones.com",
  IXIC: "nasdaq.com",
  RUT: "lseg.com",
  FTSE: "lseg.com",
  DAX: "deutsche-boerse.com",
  N225: "nikkei.co.jp",
  HSI: "hkex.com.hk",
  SSEC: "sse.com.cn",
  VIX: "cboe.com",
};

/** Commodity → related brand / exchange domain */
const COMMODITY_DOMAIN: Record<string, string> = {
  GOLD: "gold.org",
  SILVER: "silverinstitute.org",
  OIL: "cmegroup.com",
  BRENT: "ice.com",
  NATGAS: "cmegroup.com",
  COPPER: "lme.com",
  PLAT: "platinuminvestment.com",
  PALL: "stillwaterpalladium.com",
  WHEAT: "cmegroup.com",
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

/** Symbol aliases for icon packs that use older tickers */
const CRYPTO_ICON_ALIAS: Record<string, string> = {
  MATIC: "matic",
  POL: "matic",
  DOT: "dot",
  AVAX: "avax",
  SHIB: "shib",
  TRX: "trx",
  LINK: "link",
  UNI: "uni",
  ATOM: "atom",
  XLM: "xlm",
  BCH: "bch",
  NEAR: "near",
  APT: "apt",
  ARB: "arb",
  OP: "op",
  AAVE: "aave",
  MKR: "mkr",
  FIL: "fil",
  ICP: "icp",
  HBAR: "hbar",
  VET: "vet",
  ALGO: "algo",
  QNT: "qnt",
  GRT: "grt",
  SAND: "sand",
  MANA: "mana",
  AXS: "axs",
  FTM: "ftm",
  XTZ: "xtz",
  EOS: "eos",
  THETA: "theta",
  STX: "stx",
  EGLD: "egld",
};

type Category = "crypto" | "stocks" | "forex" | "commodities" | "indices";

function domainLogoUrls(domain: string): string[] {
  // Clearbit is dead (Dec 2025). Use working free providers.
  return [
    `https://logos-api.apistemic.com/domain:${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}

function cryptoLogoUrls(symbol: string): string[] {
  const raw = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  const alias = CRYPTO_ICON_ALIAS[symbol.toUpperCase()] ?? raw;
  return [
    `https://assets.coincap.io/assets/icons/${alias}@2x.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${alias}.png`,
    `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/${alias}.png`,
    `https://assets.coincap.io/assets/icons/${raw}@2x.png`,
  ];
}

function forexFlagUrls(symbol: string): string[] {
  const [base, quote] = symbol.split("/");
  const code = (quote === "USD" ? base : base === "USD" ? quote : base)?.toUpperCase();
  const iso = code ? FOREX_FLAG[code] : null;
  if (!iso) return [];
  return [
    `https://flagcdn.com/w80/${iso}.png`,
    `https://flagcdn.com/48x36/${iso}.png`,
  ];
}

function resolveUrls(symbol: string, category: Category): string[] {
  if (category === "crypto") return cryptoLogoUrls(symbol);
  if (category === "forex") return forexFlagUrls(symbol);
  if (category === "stocks") {
    const domain = STOCK_DOMAIN[symbol] ?? STOCK_DOMAIN[symbol.replace(".", "-")];
    return domain ? domainLogoUrls(domain) : [];
  }
  if (category === "indices") {
    const domain = INDEX_DOMAIN[symbol];
    return domain ? domainLogoUrls(domain) : [];
  }
  if (category === "commodities") {
    const domain = COMMODITY_DOMAIN[symbol];
    return domain ? domainLogoUrls(domain) : [];
  }
  return [];
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
  const urls = useMemo(() => resolveUrls(symbol, category), [symbol, category]);
  const [idx, setIdx] = useState(0);
  const label = symbol.replace("/", "").slice(0, 3).toUpperCase();
  const palette = PALETTE[seedHash(symbol) % PALETTE.length];
  const dim = { width: size, height: size };

  const src = urls[idx];

  if (src) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 bg-white/95 flex items-center justify-center ${className}`}
        style={dim}
      >
        <img
          key={src}
          src={src}
          alt={symbol}
          width={size}
          height={size}
          className="w-[85%] h-[85%] object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (idx < urls.length - 1) setIdx((i) => i + 1);
            else setIdx(urls.length); // force fallback
          }}
        />
      </div>
    );
  }

  // Letter fallback when all URLs exhausted or none available
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
