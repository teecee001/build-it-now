import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { ConversionHistory } from "@/components/ConversionHistory";
import { TradingViewChart } from "@/components/TradingViewChart";
import { FearGreedSection } from "@/components/FearGreedSection";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { STOCK_LIST, TRENDING_STOCKS, SECTOR_COLORS } from "@/constants/stockList";
import { COMMODITIES, INDICES, FOREX_PAIRS, MarketAsset } from "@/constants/marketAssets";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useStockPrices } from "@/hooks/useStockPrices";
import { ConversionResult } from "@/types";
import {
  Search, TrendingUp, TrendingDown, BarChart3, Briefcase, Coins,
  Globe, Gem, LineChart as LineChartIcon, X, ChevronRight,
  BarChart2, CandlestickChart, Fuel, Landmark
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

function seedHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}
function MiniChart({ values }: { values: number[] }) {
  if (!values.length) {
    return <div className="w-14 h-7 rounded bg-muted/40" />;
  }
  const data = values.map((p, i) => ({ d: `D${i}`, p }));
  const isUp = values[values.length - 1] >= values[0];
  return (
    <ResponsiveContainer width={56} height={28}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="p" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

type MarketCategory = "crypto" | "stocks" | "forex" | "commodities" | "indices";

const CATEGORY_META: Record<MarketCategory, { icon: typeof Coins; label: string; color: string }> = {
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
  const [history, setHistory] = useState<ConversionResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<MarketCategory>("crypto");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<{ symbol: string; category: MarketCategory } | null>(null);
  const [chartType, setChartType] = useState<"area" | "candlestick">("area");
  const [chartDays, setChartDays] = useState(30);
  const [tick, setTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setTick(t => t + 1);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    }, 30000);
    const countdownInterval = setInterval(() => {
      setSecondsAgo(s => Math.min(s + 1, 30));
    }, 1000);
    return () => { clearInterval(refreshInterval); clearInterval(countdownInterval); };
  }, []);

  const { rates, isLive } = useExchangeRates();
  const { getPrice: getStockPrice, getChange: getStockChange, getSpark: getStockSpark, isLive: stocksLive } = useStockPrices();
  const getCryptoPrice = (code: string) => rates[code] ? 1 / rates[code] : 0;
  const getCryptoChange = (_i: number) => 0;
  const refPrice = (base: number) => base;

  const items = useMemo(() => {
    const q = search.toLowerCase();
    switch (activeCategory) {
      case "crypto":
        return CRYPTO_LIST.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
          .slice(0, 40)
          .map((c, i) => ({ symbol: c.code, name: c.name, price: getCryptoPrice(c.code), change: getCryptoChange(i), tag: "" }));
      case "stocks":
        if (!stocksLive) return [];
        return STOCK_LIST.filter(s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
          .slice(0, 40)
          .map(s => ({ symbol: s.ticker, name: s.name, price: getStockPrice(s.ticker), change: getStockChange(s.ticker), tag: s.sector, spark: getStockSpark(s.ticker) }))
          .filter(s => s.price > 0);
      case "forex":
        return FOREX_PAIRS.filter(f => f.name.toLowerCase().includes(q) || f.symbol.toLowerCase().includes(q))
          .map(f => ({ symbol: f.symbol, name: f.name, price: refPrice(f.price), change: f.change, tag: "" }));
      case "commodities":
        return COMMODITIES.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
          .map(c => ({ symbol: c.symbol, name: c.name, price: refPrice(c.price), change: c.change, tag: "" }));
      case "indices":
        return INDICES.filter(i => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q))
          .map(i => ({ symbol: i.symbol, name: i.name, price: refPrice(i.price), change: i.change, tag: "" }));
      default:
        return [];
    }
  }, [activeCategory, search, rates, stocksLive, tick, getStockPrice, getStockChange, getStockSpark]);

  const handleConversion = useCallback((result: ConversionResult) => {
    setHistory(prev => [result, ...prev].slice(0, 20));
  }, []);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crypto, stocks, forex, commodities &amp; indices — all in one place
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {secondsAgo}s ago
        </div>
      </div>

      <FearGreedSection show={activeCategory === "crypto"} />

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(CATEGORY_META) as MarketCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSelectedAsset(null); setSearch(""); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                active
                  ? "bg-secondary border-primary/40 shadow-sm"
                  : "bg-card border-border hover:bg-secondary/50"
              }`}
            >
              <Icon className={`w-6 h-6 ${meta.color}`} />
              <span className="text-sm font-medium">{meta.label}</span>
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
          <p className="text-xs text-muted-foreground mt-1">Live Yahoo prices load via edge function.</p>
        </Card>
      )}

      <div className="space-y-1.5">
        {items.map((item, i) => {
          const isUp = item.change >= 0;
          const spark = ("spark" in item && Array.isArray(item.spark) && item.spark.length > 1)
            ? item.spark
            : Array.from({ length: 14 }, (_, j) => item.price * (1 + Math.sin(seedHash(item.symbol) + j * 0.4) * 0.02));
          return (
            <Card
              key={item.symbol}
              className="p-3 hover:bg-secondary/30 transition-colors cursor-pointer"
              onClick={() => setSelectedAsset({ symbol: item.symbol, category: activeCategory })}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {item.symbol.replace("/", "").slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{item.symbol}</span>
                      {item.tag && (
                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${SECTOR_COLORS[item.tag] ?? ""}`}>
                          {item.tag}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <MiniChart values={spark} />
                  <div className="text-right min-w-[72px]">
                    <p className="text-sm font-semibold font-mono">
                      {item.price >= 1
                        ? `$${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : `$${item.price.toFixed(6)}`}
                    </p>
                    {item.change !== 0 && (
                      <div className="flex items-center justify-end gap-0.5">
                        {isUp ? <TrendingUp className="w-2.5 h-2.5 text-success" /> : <TrendingDown className="w-2.5 h-2.5 text-destructive" />}
                        <p className={`text-[10px] font-medium ${isUp ? "text-success" : "text-destructive"}`}>
                          {isUp ? "+" : ""}{item.change.toFixed(2)}%
                        </p>
                      </div>
                    )}
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
        {selectedAsset && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6 max-h-[85vh] overflow-y-auto"
          >
            <Card className="p-5 max-w-lg mx-auto space-y-4 shadow-xl border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {selectedAsset.symbol.replace("/", "").slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {items.find(i => i.symbol === selectedAsset.symbol)?.name ?? selectedAsset.symbol}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{selectedAsset.symbol}</span>
                      <Badge variant="outline" className="text-[9px]">{selectedAsset.category}</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {(() => {
                const it = items.find(i => i.symbol === selectedAsset.symbol);
                if (!it) return null;
                return (
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold font-mono">
                      {it.price >= 1
                        ? `$${it.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : `$${it.price.toFixed(6)}`}
                    </p>
                    {it.change !== 0 && (
                      <span className={`text-sm font-medium ${it.change >= 0 ? "text-success" : "text-destructive"}`}>
                        {it.change >= 0 ? "+" : ""}{it.change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                );
              })()}
              {selectedAsset.category === "crypto" && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[{ d: 1, l: "24H" }, { d: 7, l: "7D" }, { d: 30, l: "30D" }, { d: 90, l: "90D" }, { d: 365, l: "1Y" }].map(p => (
                        <Button key={p.d} variant={chartDays === p.d ? "default" : "ghost"} size="sm" className="text-[10px] h-7 px-2" onClick={() => setChartDays(p.d)}>{p.l}</Button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button variant={chartType === "area" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setChartType("area")}>
                        <BarChart2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant={chartType === "candlestick" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setChartType("candlestick")}>
                        <CandlestickChart className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden bg-secondary/20 border border-border/50">
                    <TradingViewChart code={selectedAsset.symbol} height={280} days={chartDays} type={chartType} />
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
