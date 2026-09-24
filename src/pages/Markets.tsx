import { useState, useMemo } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FearGreedSection } from "@/components/FearGreedSection";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { STOCK_LIST, SECTOR_COLORS } from "@/constants/stockList";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useStockPrices } from "@/hooks/useStockPrices";
import { Search, TrendingUp, TrendingDown, Coins, Briefcase, Globe, Gem, BarChart3 } from "lucide-react";

type Cat = "crypto" | "stocks" | "forex" | "commodities" | "indices";
const META: Record<Cat, { icon: typeof Coins; label: string; color: string }> = {
  crypto: { icon: Coins, label: "Crypto", color: "text-warning" },
  stocks: { icon: Briefcase, label: "Stocks", color: "text-primary" },
  forex: { icon: Globe, label: "Forex", color: "text-accent" },
  commodities: { icon: Gem, label: "Commodities", color: "text-amber-400" },
  indices: { icon: BarChart3, label: "Indices", color: "text-emerald-400" },
};

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
  const { rates } = useExchangeRates();
  const { quotes, getPrice, getChange, getSpark, isLive: stocksLive, isLoading: stocksLoading } = useStockPrices();

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (cat === "crypto") {
      return CRYPTO_LIST.filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query)
      ).map((c) => ({
        id: c.code,
        name: c.name,
        symbol: c.code,
        // Static list has no live price — show placeholder; real crypto prices live on Wallet/Forecasts
        price: null as number | null,
        change: 0,
        spark: [] as number[],
      }));
    }
    if (cat === "stocks") {
      if (!stocksLive) return [];
      return STOCK_LIST.filter(
        (s) =>
          !query ||
          s.name.toLowerCase().includes(query) ||
          s.ticker.toLowerCase().includes(query)
      ).map((s) => {
        const price = getPrice(s.ticker);
        const change = getChange(s.ticker);
        const spark = getSpark(s.ticker);
        return {
          id: s.ticker,
          name: s.name,
          symbol: s.ticker,
          price: price || null,
          change,
          spark,
          sector: s.sector,
        };
      });
    }
    const list =
      cat === "forex"
        ? [
            { id: "eurusd", name: "EUR/USD", symbol: "EUR", ref: 1.08 },
            { id: "gbpusd", name: "GBP/USD", symbol: "GBP", ref: 1.27 },
            { id: "usdjpy", name: "USD/JPY", symbol: "JPY", ref: 149.5 },
            { id: "audusd", name: "AUD/USD", symbol: "AUD", ref: 0.66 },
            { id: "usdcad", name: "USD/CAD", symbol: "CAD", ref: 1.36 },
          ]
        : cat === "commodities"
        ? [
            { id: "gold", name: "Gold", symbol: "XAU", ref: 2650 },
            { id: "silver", name: "Silver", symbol: "XAG", ref: 31.5 },
            { id: "oil", name: "Crude Oil", symbol: "WTI", ref: 78 },
            { id: "copper", name: "Copper", symbol: "HG", ref: 4.2 },
          ]
        : [
            { id: "spx", name: "S&P 500", symbol: "SPX", ref: 5800 },
            { id: "ndx", name: "Nasdaq 100", symbol: "NDX", ref: 20500 },
            { id: "dji", name: "Dow Jones", symbol: "DJI", ref: 42500 },
            { id: "vix", name: "VIX", symbol: "VIX", ref: 15 },
          ];
    return list
      .filter(
        (x) =>
          !query ||
          x.name.toLowerCase().includes(query) ||
          x.symbol.toLowerCase().includes(query)
      )
      .map((x) => {
        const rate = rates?.[x.symbol] ?? x.ref;
        const change = ((rate - x.ref) / x.ref) * 100;
        return {
          id: x.id,
          name: x.name,
          symbol: x.symbol,
          price: rate as number,
          change,
          spark: [] as number[],
        };
      });
  }, [cat, q, rates, quotes, stocksLive, getPrice, getChange, getSpark]);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Markets</h1>
        <Badge variant="outline" className="text-[10px]">
          Live feeds
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
            Live Yahoo prices load via edge function. Crypto, Forex &amp; Commodities are live now.
          </p>
        </Card>
      )}

      {cat === "crypto" && (
        <p className="text-xs text-muted-foreground px-1">
          Browse crypto assets. Live prices &amp; trading live on Wallet and Forecasts.
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
                  <MiniChart data={item.spark} positive={item.change >= 0} />
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-sm font-semibold">
                  {typeof item.price === "number"
                    ? item.price >= 100
                      ? item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : item.price.toPrecision(4)
                    : "—"}
                </p>
                {typeof item.price === "number" && (
                  <div className="flex items-center justify-end gap-0.5">
                    {item.change >= 0 ? (
                      <TrendingUp className="w-2.5 h-2.5 text-success" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                    )}
                    <p className={`text-[10px] font-medium ${item.change >= 0 ? "text-success" : "text-destructive"}`}>
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
