// Port of src/components/AssetLogo.tsx (same logo sources and fallbacks; maps copied verbatim).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';

import type { IconName } from '@/components/kit';

function seedHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}
const PALETTE = [
  ['rgba(245,158,11,0.25)', '#FBBF24'], ['rgba(249,115,22,0.25)', '#FB923C'], ['rgba(16,185,129,0.25)', '#34D399'],
  ['rgba(14,165,233,0.25)', '#38BDF8'], ['rgba(139,92,246,0.25)', '#A78BFA'], ['rgba(244,63,94,0.25)', '#FB7185'],
  ['rgba(6,182,212,0.25)', '#22D3EE'], ['rgba(132,204,22,0.25)', '#A3E635'], ['rgba(217,70,239,0.25)', '#E879F9'],
  ['rgba(59,130,246,0.25)', '#60A5FA'],
];
const COMMODITY_GLYPH: Record<string, { icon: IconName; bg: string; fg: string }> = {
  GOLD: { icon: 'ellipse', bg: 'rgba(251,191,36,0.2)', fg: '#F59E0B' },
  SILVER: { icon: 'ellipse-outline', bg: 'rgba(203,213,225,0.2)', fg: '#94A3B8' },
  OIL: { icon: 'water', bg: 'rgba(113,113,122,0.25)', fg: '#A1A1AA' },
  BRENT: { icon: 'water', bg: 'rgba(120,113,108,0.25)', fg: '#A8A29E' },
  NATGAS: { icon: 'flame', bg: 'rgba(14,165,233,0.2)', fg: '#0EA5E9' },
  COPPER: { icon: 'cube-outline', bg: 'rgba(249,115,22,0.2)', fg: '#F97316' },
  PLAT: { icon: 'diamond-outline', bg: 'rgba(148,163,184,0.2)', fg: '#94A3B8' },
  PALL: { icon: 'diamond', bg: 'rgba(129,140,248,0.2)', fg: '#818CF8' },
  WHEAT: { icon: 'leaf-outline', bg: 'rgba(234,179,8,0.2)', fg: '#EAB308' },
  CORN: { icon: 'leaf', bg: 'rgba(132,204,22,0.2)', fg: '#84CC16' },
};
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
  ORCL: "oracle.com",
  IBM: "ibm.com",
  QCOM: "qualcomm.com",
  TXN: "ti.com",
  AMAT: "appliedmaterials.com",
  NOW: "servicenow.com",
  INTU: "intuit.com",
  SNOW: "snowflake.com",
  PLTR: "palantir.com",
  COIN: "coinbase.com",
};

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

type Category = 'crypto' | 'stocks' | 'forex' | 'commodities' | 'indices';
function domainLogoUrls(domain: string): string[] {
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

export function AssetLogo({ symbol, category, size = 36 }: { symbol: string; category: Category; size?: number }) {
  const urls = useMemo(() => resolveUrls(symbol, category), [symbol, category]);
  const [idx, setIdx] = useState(0);
  const label = symbol.replace('/', '').slice(0, 3).toUpperCase();
  const [bg, fg] = PALETTE[seedHash(symbol) % PALETTE.length];
  const dim = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const, alignItems: 'center' as const, justifyContent: 'center' as const };
  const src = urls[idx];
  const commodity = category === 'commodities' ? COMMODITY_GLYPH[symbol] : undefined;
  if (commodity) {
    return (
      <View style={[dim, { backgroundColor: commodity.bg }]} accessibilityLabel={symbol}>
        <Ionicons name={commodity.icon} size={size * 0.5} color={commodity.fg} />
      </View>
    );
  }
  if (src) {
    return (
      <View style={[dim, { backgroundColor: '#1C1C1F' }]}>
        <Image key={src} source={{ uri: src }} style={{ width: size, height: size }} accessibilityLabel={symbol} onError={() => setIdx((i) => (i < urls.length - 1 ? i + 1 : urls.length))} />
      </View>
    );
  }
  return (
    <View style={[dim, { backgroundColor: bg }]} accessibilityLabel={symbol}>
      <Text style={{ color: fg, fontSize: size * 0.3, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
