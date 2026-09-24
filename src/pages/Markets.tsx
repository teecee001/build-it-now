import { useState, useMemo, useEffect, useCallback } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { ConversionHistory } from "@/components/ConversionHistory";
import { TradingViewChart } from "@/components/TradingViewChart";
import { FearGreedSection } from "@/components/FearGreedSection";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { STOCK_LIST, SECTOR_COLORS } from "@/constants/stockList";
import { COMMODITIES, INDICES, FOREX_PAIRS } from "@/constants/marketAssets";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useStockPrices } from "@/hooks/useStockPrices";
import { ConversionResult } from "@/types";
import {
  Search, TrendingUp, TrendingDown, BarChart3, Briefcase, Coins,
  Globe, Gem, X, ChevronRight, BarChart2, CandlestickChart,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

function seedHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

function MiniChart({ values, up }: { values: number[]; up?: boolean }) {
  if (!values.length) {
    return <div className="w-14 h-7 rounded bg-muted/40" />;
  }
  const data = values.map((p, i) => ({ d: `D${i}`, p }));
  const isUp = up ?? values[values.length - 1] >= values[0];
  return (
    <ResponsiveContainer width={56} height={28}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="p" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Build a short sparkline that slopes with change % so the row always looks alive */
function syntheticSpark(symbol: string, price: number, changePct: number): number[] {
  const seed = seedHash(symbol);
  const n = 16;
  const end = Math.max(price, 1e-8);
  // Amplify small moves so the line still reads as "alive" (min ±1.5% visual)
  const visualPct = Math.abs(changePct) < 0.5 ? (changePct >= 0 ? 1.8 : -1.8) : changePct;
  const start = end / (1 + visualPct / 100);
  return Array.from({ length: n }, (_, j) => {
    const t = j / (n - 1);
    const base = start + (end - start) * t;
    const wobble = 1 + Math.sin(seed * 0.13 + j * 0.72) * 0.035 + Math.cos(seed * 0.07 + j * 0.41) * 0.02;
    return base * wobble;
  });
}

const AVATAR_PALETTE = [
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

function avatarClass(symbol: string) {
  return AVATAR_PALETTE[seedHash(symbol) % AVATAR_PALETTE.length];
}

type MarketCategory = "crypto" | "stocks" | "forex" | "commodities" | "indices";

type RowItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  tag: string;
  spark: number[];
};

const CATEGORY_META: Record<MarketCategory, { icon: typeof Coins; label: string; color: string }> = {
  crypto: { icon: Coins, label: "Crypto", color: "text-warning" },
  stocks: { icon: Briefcase, label: "Stocks", color: "text-primary" },
  forex: { icon: Globe, label: "Forex", color: "text-accent" },
  commodities: { icon: Gem, label: "Commodities", color: "text-amber-400" },
  indices: { icon: BarChart3, label: "Indices", color: "text-emerald-400" },
};

/** Live pair price from USD-base fiat rates. rates[code] = units of code per 1 USD. */
function liveForexPrice(symbol: string, rates: Record<string, number>): number | null {
  const [base, quote] = symbol.split("/");
  if (!base || !quote) return null;
  // EUR/USD = how many USD per 1 EUR = 1 / rates.EUR
  if (quote === "USD" && rates[base]) return 1 / rates[base];
  // USD/JPY = rates.JPY
  if (base === "USD" && rates[quote]) return rates[quote];
  // Cross e.g. EUR/GBP = rates.GBP / rates.EUR
  if (rates[base] && rates[quote]) return rates[quote] / rates[base];
  return null;
}

function formatPrice(price: number, category: MarketCategory) {
  if (!price || !Number.isFinite(price)) return "—";
  if (category === "forex") {
    if (price >= 20) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(5);
  }
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(6)}`;
}

export default function Markets() {
  return (
    <FeatureGate feature="features_forex" featureLabel="Markets">
      <MarketsContent />
    </FeatureGate>
  );
}

function MarketsContent() {
  const [history, setHistory] = useState<ConversionResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<MarketCategory>("crypto");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<{ symbol: string; category: MarketCategory } | null>(null);
  const [chartType, setChartType] = useState<"area" | "candlestick">("area");
  const [chartDays, setChartDays] = useState(30);
  const [tick, setTick] = useState(0);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setTick((t) => t + 1);
      setSecondsAgo(0);
    }, 30000);
    const countdownInterval = setInterval(() => {
      setSecondsAgo((s) => Math.min(s + 1, 30));
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  const { rates, cryptoChanges, isLive } = useExchangeRates();
  const {
    getPrice: getStockPrice,
    getChange: getStockChange,
    getSpark: getStockSpark,
    isLive: stocksLive,
  } = useStockPrices();

  const getCryptoPrice = (code: string) => (rates[code] ? 1 / rates[code] : 0);
  const getCryptoChange = (code: string) => cryptoChanges[code] ?? 0;

  const items: RowItem[] = useMemo(() => {
    const q = search.toLowerCase();
    switch (activeCategory) {
      case "crypto":
        return CRYPTO_LIST.filter(
          (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        )
          .slice(0, 50)
          .map((c) => {
            const price = getCryptoPrice(c.code);
            const change = getCryptoChange(c.code);
            return {
              symbol: c.code,
              name: c.name,
              price,
              change,
              tag: "",
              spark: price > 0 ? syntheticSpark(c.code, price, change) : [],
            };
          })
          .filter((r) => r.price > 0);

      case "stocks":
        if (!stocksLive) return [];
        return STOCK_LIST.filter(
          (s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)
        )
          .slice(0, 40)
          .map((s) => {
            const price = getStockPrice(s.ticker);
            const change = getStockChange(s.ticker);
            const spark = getStockSpark(s.ticker);
            return {
              symbol: s.ticker,
              name: s.name,
              price,
              change,
              tag: s.sector,
              spark: spark.length > 1 ? spark : syntheticSpark(s.ticker, price, change),
            };
          })
          .filter((s) => s.price > 0);

      case "forex":
        return FOREX_PAIRS.filter(
          (f) => f.name.toLowerCase().includes(q) || f.symbol.toLowerCase().includes(q)
        ).map((f) => {
          const live = liveForexPrice(f.symbol, rates);
          const price = live ?? f.price;
          // Prefer live price; keep static change as direction hint until we store previous
          const change = f.change;
          return {
            symbol: f.symbol,
            name: f.name,
            price,
            change,
            tag: live != null ? "Live" : "",
            spark: syntheticSpark(f.symbol, price, change),
          };
        });

      case "commodities":
        return COMMODITIES.filter(
          (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
        ).map((c) => ({
          symbol: c.symbol,
          name: c.name,
          price: c.price,
          change: c.change,
          tag: "",
          spark: syntheticSpark(c.symbol, c.price, c.change),
        }));

      case "indices":
        return INDICES.filter(
          (i) => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q)
        ).map((i) => ({
          symbol: i.symbol,
          name: i.name,
          price: i.price,
          change: i.change,
          tag: "",
          spark: syntheticSpark(i.symbol, i.price, i.change),
        }));

      default:
        return [];
    }
  }, [
    activeCategory,
    search,
    rates,
    cryptoChanges,
    stocksLive,
    tick,
    getStockPrice,
    getStockChange,
    getStockSpark,
  ]);

  const handleConversion = useCallback((result: ConversionResult) => {
    setHistory((prev) => [result, ...prev].slice(0, 20));
  }, []);

  const selectedInfo = selectedAsset
    ? items.find((i) => i.symbol === selectedAsset.symbol)
    : null;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crypto, stocks, forex, commodities & indices — all in one place
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {secondsAgo < 3 ? "Live" : `${secondsAgo}s ago`}
        </div>
      </div>

      <FearGreedSection show={activeCategory === "crypto"} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(CATEGORY_META) as MarketCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedAsset(null);
                setSearch("");
              }}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-all ${
                active
                  ? "bg-secondary border-primary/40 shadow-sm"
                  : "bg-card border-border hover:bg-secondary/50"
              }`}
            >
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${meta.color}`} />
              <span className="text-xs sm:text-sm font-medium">{meta.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${activeCategory}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {activeCategory === "stocks" && !stocksLive && (
        <Card className="p-6 text-center border-dashed">
          <Briefcase className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Stocks feed coming online</p>
          <p className="text-xs text-muted-foreground mt-1">
            Live Yahoo prices load via edge function. No mock prices.
          </p>
        </Card>
      )}

      {(activeCategory === "commodities" || activeCategory === "indices") && (
        <p className="text-[11px] text-muted-foreground px-1">
          Reference levels — crypto, FX and stocks use live feeds when available.
        </p>
      )}

      <div className="space-y-1.5">
        {items.map((item) => {
          const isUp = item.change >= 0;
          return (
            <Card
              key={item.symbol}
              className="p-3.5 rounded-2xl hover:bg-secondary/40 transition-colors cursor-pointer border-border/60"
              onClick={() => setSelectedAsset({ symbol: item.symbol, category: activeCategory })}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarClass(item.symbol)}`}>
                    {item.symbol.replace("/", "").slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{item.symbol}</span>
                      {item.tag && (
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 ${SECTOR_COLORS[item.tag] ?? ""}`}
                        >
                          {item.tag}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <MiniChart values={item.spark} up={isUp} />
                  <div className="text-right min-w-[76px]">
                    <p className="text-sm font-semibold font-mono">
                      {formatPrice(item.price, activeCategory)}
                    </p>
                    <div className="flex items-center justify-end gap-0.5">
                      {isUp ? (
                        <TrendingUp className="w-2.5 h-2.5 text-success" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                      )}
                      <p
                        className={`text-[10px] font-medium ${
                          isUp ? "text-success" : "text-destructive"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {item.change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </div>
              </div>
            </Card>
          );
        })}
        {items.length === 0 && activeCategory !== "stocks" && (
          <p className="text-center text-sm text-muted-foreground py-8">No results</p>
        )}
      </div>

      <AnimatePresence>
        {selectedAsset && selectedInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6 max-h-[85vh] overflow-y-auto"
          >
            <Card className="p-5 max-w-lg mx-auto space-y-4 shadow-xl border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${avatarClass(selectedAsset.symbol)}`}>
                    {selectedAsset.symbol.replace("/", "").slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedInfo.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{selectedAsset.symbol}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {selectedAsset.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold font-mono">
                  {formatPrice(selectedInfo.price, selectedAsset.category)}
                </p>
                <span
                  className={`text-sm font-medium ${
                    selectedInfo.change >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {selectedInfo.change >= 0 ? "+" : ""}
                  {selectedInfo.change.toFixed(2)}%
                </span>
              </div>
              {selectedAsset.category === "crypto" && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[
                        { d: 1, l: "24H" },
                        { d: 7, l: "7D" },
                        { d: 30, l: "30D" },
                        { d: 90, l: "90D" },
                        { d: 365, l: "1Y" },
                      ].map((p) => (
                        <Button
                          key={p.d}
                          variant={chartDays === p.d ? "default" : "ghost"}
                          size="sm"
                          className="text-[10px] h-7 px-2"
                          onClick={() => setChartDays(p.d)}
                        >
                          {p.l}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant={chartType === "area" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setChartType("area")}
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant={chartType === "candlestick" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setChartType("candlestick")}
                      >
                        <CandlestickChart className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden bg-secondary/20 border border-border/50">
                    <TradingViewChart
                      code={selectedAsset.symbol}
                      height={280}
                      days={chartDays}
                      type={chartType}
                    />
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Convert Currency</h2>
          <Badge variant={isLive ? "default" : "secondary"} className="text-[10px]">
            {isLive ? "● Live Rates" : "Demo"}
          </Badge>
        </div>
        <CurrencyConverter onConvert={handleConversion} />
        <div className="mt-4">
          <ConversionHistory history={history} />
        </div>
      </div>
    </div>
  );
}
