import { useState, useMemo } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FearGreedSection } from "@/components/FearGreedSection";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { COINGECKO_IDS } from "@/constants/cryptoIds";
import { STOCK_LIST, SECTOR_COLORS } from "@/constants/stockList";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useStockPrices } from "@/hooks/useStockPrices";
import {
  Search, TrendingUp, TrendingDown, Coins, Briefcase, Globe, Gem, BarChart3,
} from "lucide-react";

type Cat = "crypto" | "stocks" | "forex" | "commodities" | "indices";
const META: Record<Cat, { icon: typeof Coins; label: string }> = {
  crypto: { icon: Coins, label: "Crypto" },
  stocks: { icon: Briefcase, label: "Stocks" },
  forex: { icon: Globe, label: "Forex" },
  commodities: { icon: Gem, label: "Commodities" },
  indices: { icon: BarChart3, label: "Indices" },
};

/** Top coins first — rest still searchable */
const TOP_CRYPTO = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX",
  "DOT", "LINK", "MATIC", "LTC", "SHIB", "UNI", "ATOM", "TRX",
  "BCH", "XLM", "NEAR", "APT", "ARB", "OP", "AAVE", "MKR",
];

function fmtPrice(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

export default function Markets() {
  return (
    <FeatureGate feature="features_forex" featureLabel="Markets">
      <MarketsContent />
    </FeatureGate>
  );
}

function MarketsContent() {
  const [cat, setCat] = useState<Cat>("crypto");
  const [q, setQ] = useState("");
  const { rates, isLive: ratesLive } = useExchangeRates();
  const {
    getPrice: getStockPrice,
    getChange: getStockChange,
    getSpark,
    isLive: stocksLive,
    isLoading: stocksLoading,
  } = useStockPrices();

  /** USD price for a crypto code (rates store units-per-USD) */
  const cryptoUsd = (code: string) => {
    const r = rates?.[code];
    if (!r || r <= 0) return null;
    return 1 / r;
  };

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();

    if (cat === "crypto") {
      const withIds = CRYPTO_LIST.filter((c) => COINGECKO_IDS[c.code]);
      const ranked = [...withIds].sort((a, b) => {
        const ia = TOP_CRYPTO.indexOf(a.code);
        const ib = TOP_CRYPTO.indexOf(b.code);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return a.name.localeCompare(b.name);
      });
      return ranked
        .filter(
          (c) =>
            !query ||
            c.name.toLowerCase().includes(query) ||
            c.code.toLowerCase().includes(query)
        )
        .slice(0, query ? 80 : 40)
        .map((c) => {
          const price = cryptoUsd(c.code);
          return {
            id: c.code,
            name: c.name,
            symbol: c.code,
            price,
            change: null as number | null, // 24h change needs market chart; omit fake %
            spark: [] as number[],
          };
        });
    }

    if (cat === "stocks") {
      if (!stocksLive) return [];
      return STOCK_LIST.filter(
        (s) =>
          !query ||
          s.name.toLowerCase().includes(query) ||
          s.ticker.toLowerCase().includes(query)
      ).map((s) => {
        const price = getStockPrice(s.ticker) || null;
        const change = getStockChange(s.ticker);
        return {
          id: s.ticker,
          name: s.name,
          symbol: s.ticker,
          price,
          change: price ? change : null,
          spark: getSpark(s.ticker),
          sector: s.sector,
        };
      });
    }

    if (cat === "forex") {
      // open.er-api rates are "units of currency per 1 USD"
      // EUR/USD = how many USD per 1 EUR = 1 / rates.EUR
      const pairs = [
        { id: "eurusd", name: "EUR/USD", base: "EUR", quote: "USD" },
        { id: "gbpusd", name: "GBP/USD", base: "GBP", quote: "USD" },
        { id: "usdjpy", name: "USD/JPY", base: "USD", quote: "JPY" },
        { id: "audusd", name: "AUD/USD", base: "AUD", quote: "USD" },
        { id: "usdcad", name: "USD/CAD", base: "USD", quote: "CAD" },
        { id: "usdchf", name: "USD/CHF", base: "USD", quote: "CHF" },
      ];
      return pairs
        .filter(
          (p) =>
            !query ||
            p.name.toLowerCase().includes(query) ||
            p.base.toLowerCase().includes(query)
        )
        .map((p) => {
          let price: number | null = null;
          if (p.base === "USD") {
            // USD/XXX = rates[XXX]
            price = rates?.[p.quote] ?? null;
          } else {
            // XXX/USD = 1 / rates[XXX]
            const r = rates?.[p.base];
            price = r && r > 0 ? 1 / r : null;
          }
          return {
            id: p.id,
            name: p.name,
            symbol: p.base,
            price,
            change: null as number | null,
            spark: [] as number[],
          };
        });
    }

    if (cat === "commodities") {
      const list = [
        { id: "gold", name: "Gold", symbol: "XAU", note: "Spot ref" },
        { id: "silver", name: "Silver", symbol: "XAG", note: "Spot ref" },
        { id: "oil", name: "Crude Oil (WTI)", symbol: "WTI", note: "Spot ref" },
        { id: "copper", name: "Copper", symbol: "HG", note: "Spot ref" },
      ];
      return list
        .filter(
          (x) =>
            !query ||
            x.name.toLowerCase().includes(query) ||
            x.symbol.toLowerCase().includes(query)
        )
        .map((x) => ({
          id: x.id,
          name: x.name,
          symbol: x.symbol,
          price: null as number | null,
          change: null as number | null,
          spark: [] as number[],
          note: x.note,
        }));
    }

    // indices — no fake static prices
    const list = [
      { id: "spx", name: "S&P 500", symbol: "SPX" },
      { id: "ndx", name: "Nasdaq 100", symbol: "NDX" },
      { id: "dji", name: "Dow Jones", symbol: "DJI" },
      { id: "vix", name: "VIX", symbol: "VIX" },
    ];
    return list
      .filter(
        (x) =>
          !query ||
          x.name.toLowerCase().includes(query) ||
          x.symbol.toLowerCase().includes(query)
      )
      .map((x) => ({
        id: x.id,
        name: x.name,
        symbol: x.symbol,
        price: null as number | null,
        change: null as number | null,
        spark: [] as number[],
      }));
  }, [cat, q, rates, stocksLive, getStockPrice, getStockChange, getSpark]);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Markets</h1>
        <Badge variant={ratesLive || stocksLive ? "default" : "secondary"} className="text-[10px]">
          {ratesLive || stocksLive ? "● Live" : "Demo"}
        </Badge>
      </div>

      <FearGreedSection show={cat === "crypto"} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(META) as Cat[]).map((c) => {
          const m = META[c];
          const Icon = m.icon;
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {cat === "stocks" && !stocksLive && !stocksLoading && (
        <Card className="p-6 text-center space-y-2 border-dashed">
          <Briefcase className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Stocks feed coming online</p>
          <p className="text-xs text-muted-foreground">
            Live Yahoo prices load via edge function. Crypto &amp; Forex are live now.
          </p>
        </Card>
      )}

      {(cat === "commodities" || cat === "indices") && (
        <p className="text-xs text-muted-foreground px-1">
          Live spot for {cat} is not wired yet — no placeholder prices shown.
        </p>
      )}

      <div className="grid gap-2">
        {items.map((item) => (
          <Card key={item.id} className="p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <span className="text-[10px] text-muted-foreground uppercase">{item.symbol}</span>
                  {"sector" in item && item.sector && (
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-1.5 py-0 ${SECTOR_COLORS[item.sector] ?? ""}`}
                    >
                      {item.sector}
                    </Badge>
                  )}
                </div>
                {item.spark && item.spark.length > 1 && (
                  <MiniChart data={item.spark} positive={(item.change ?? 0) >= 0} />
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-semibold">
                  {item.price != null
                    ? (cat === "crypto" || cat === "stocks" ? "$" : "") + fmtPrice(item.price)
                    : "—"}
                </p>
                {item.change != null && (
                  <div className="flex items-center justify-end gap-0.5">
                    {item.change >= 0 ? (
                      <TrendingUp className="w-2.5 h-2.5 text-success" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                    )}
                    <p
                      className={`text-[10px] font-medium ${
                        item.change >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {item.change >= 0 ? "+" : ""}
                      {item.change.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && cat === "crypto" && (
          <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
        )}
        {items.length === 0 && (cat === "commodities" || cat === "indices") && (
          <Card className="p-6 text-center border-dashed">
            <p className="text-sm text-muted-foreground">
              No live {cat} feed yet. Crypto &amp; Forex show real prices.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function MiniChart({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 20;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mt-1 opacity-70">
      <polyline
        fill="none"
        stroke={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  );
}
