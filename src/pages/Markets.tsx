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

// ── Sparkline helpers ──
function seedHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}
function sparkline(symbol: string) {
  const seed = seedHash(symbol);
  return Array.from({ length: 7 }, (_, i) => ({
    d: `D${i}`,
    p: 100 + Math.sin(seed + i * 0.8) * 15 + Math.cos(seed * 0.3 + i) * 8,
  }));
}
function MiniChart({ symbol }: { symbol: string }) {
  const data = sparkline(symbol);
  const isUp = data[data.length - 1].p >= data[0].p;
  return (
    <ResponsiveContainer width={56} height={28}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="p" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Category config ──
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

  // Auto-refresh every 30 seconds
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
  const { getPrice: getStockPrice, getChange: getStockChange } = useStockPrices();

  const getCryptoPrice = (code: string) => rates[code] ? 1 / rates[code] : 0;
  const getCryptoChange = (i: number) => parseFloat(((Math.sin(i * 1.7 + 0.3) * 8) + 0.5).toFixed(2));

  // Add variance using tick for real-time feel
  const addVariance = (base: number, symbol: string) => {
    const now = Date.now() / 1000;
    return parseFloat((base * (1 + Math.sin(seedHash(symbol) + now * 0.01 + tick) * 0.008)).toFixed(base < 10 ? 4 : 2));
  };

  // ── Build list for active category ──
  const items = useMemo(() => {
    const q = search.toLowerCase();
    switch (activeCategory) {
      case "crypto":
        return CRYPTO_LIST.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
          .slice(0, 40)
          .map((c, i) => ({
            symbol: c.code, name: c.name, price: getCryptoPrice(c.code),
            change: getCryptoChange(i), tag: "",
          }));
      case "stocks":
        return STOCK_LIST.filter(s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
          .slice(0, 40)
          .map(s => ({
            symbol: s.ticker, name: s.name, price: getStockPrice(s.ticker),
            change: getStockChange(s.ticker), tag: s.sector,
          }));
      case "forex":
        return FOREX_PAIRS.filter(f => f.name.toLowerCase().includes(q) || f.symbol.toLowerCase().includes(q))
          .map(f => ({ symbol: f.symbol, name: f.name, price: addVariance(f.price, f.symbol), change: f.change, tag: "" }));
      case "commodities":
        return COMMODITIES.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
          .map(c => ({ symbol: c.symbol, name: c.name, price: addVariance(c.price, c.symbol), change: c.change, tag: "" }));
      case "indices":
        return INDICES.filter(i => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q))
          .map(i => ({ symbol: i.symbol, name: i.name, price: addVariance(i.price, i.symbol), change: i.change, tag: "" }));
    }
  }, [activeCategory, search, rates, tick]);

  const selectedInfo = selectedAsset
    ? items.find(i => i.symbol === selectedAsset.symbol)
    : null;

  const isCryptoChart = selectedAsset?.category === "crypto";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Crypto, stocks, forex, commodities & indices — all in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {secondsAgo < 5 ? "Live" : `${secondsAgo}s ago`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Market Overview Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(Object.entries(CATEGORY_META) as [MarketCategory, typeof CATEGORY_META["crypto"]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setSelectedAsset(null); setSearch(""); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                activeCategory === key
                  ? "bg-secondary border-border shadow-sm"
                  : "bg-card border-transparent hover:bg-secondary/30"
              }`}
            >
              <meta.icon className={`w-5 h-5 ${meta.color}`} />
              <span className="text-xs font-semibold">{meta.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Selected Asset Detail with TradingView Chart */}
      <AnimatePresence mode="wait">
        {selectedAsset && selectedInfo && (
          <motion.div
            key={selectedAsset.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="p-5 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold ${
                    CATEGORY_META[selectedAsset.category].color
                  }`}>
                    {selectedInfo.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedInfo.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{selectedInfo.symbol}</p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {CATEGORY_META[selectedAsset.category].label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Price */}
              <div className="flex items-end gap-3">
                <p className="text-2xl font-bold font-mono">
                  {selectedInfo.price > 1
                    ? `$${selectedInfo.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                    : `$${selectedInfo.price.toFixed(6)}`}
                </p>
                <span className={`text-sm font-semibold ${selectedInfo.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {selectedInfo.change >= 0 ? "+" : ""}{selectedInfo.change.toFixed(2)}%
                </span>
              </div>

              {/* Chart Controls */}
              {isCryptoChart && (
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[{ d: 1, l: "24H" }, { d: 7, l: "7D" }, { d: 30, l: "30D" }, { d: 90, l: "90D" }, { d: 365, l: "1Y" }].map(p => (
                      <Button key={p.d} variant={chartDays === p.d ? "default" : "ghost"} size="sm" className="text-[10px] h-7 px-2" onClick={() => setChartDays(p.d)}>
                        {p.l}
                      </Button>
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
              )}

              {/* TradingView Chart for crypto, fallback chart for others */}
              <div className="rounded-lg overflow-hidden bg-secondary/20 border border-border/50">
                {isCryptoChart ? (
                  <TradingViewChart code={selectedInfo.symbol} height={300} days={chartDays} type={chartType} />
                ) : (
                  <MarketFallbackChart symbol={selectedInfo.symbol} price={selectedInfo.price} change={selectedInfo.change} />
                )}
              </div>

              {/* Key stats for non-crypto */}
              {!isCryptoChart && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Open", value: `$${(selectedInfo.price * 0.998).toFixed(selectedInfo.price < 10 ? 4 : 2)}` },
                    { label: "High", value: `$${(selectedInfo.price * 1.012).toFixed(selectedInfo.price < 10 ? 4 : 2)}` },
                    { label: "Low", value: `$${(selectedInfo.price * 0.988).toFixed(selectedInfo.price < 10 ? 4 : 2)}` },
                  ].map(s => (
                    <div key={s.label} className="p-2 bg-secondary/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      <p className="text-xs font-semibold font-mono">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${CATEGORY_META[activeCategory].label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-secondary border-border text-sm"
            />
          </div>

          <div className="space-y-1.5">
            {items.map((item, i) => (
              <motion.div
                key={item.symbol}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.012 }}
              >
                <Card
                  className={`p-3 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer ${
                    selectedAsset?.symbol === item.symbol ? "ring-1 ring-primary/30" : ""
                  }`}
                  onClick={() => setSelectedAsset({ symbol: item.symbol, category: activeCategory })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold ${
                        CATEGORY_META[activeCategory].color
                      }`}>
                        {item.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] text-muted-foreground">{item.symbol}</p>
                          {item.tag && (
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${SECTOR_COLORS[item.tag] ?? "text-muted-foreground"}`}>
                              {item.tag}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MiniChart symbol={item.symbol} />
                      <div className="text-right min-w-[70px]">
                        <p className="text-sm font-semibold font-mono">
                          {item.price > 1
                            ? `$${item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                            : `$${item.price.toFixed(6)}`}
                        </p>
                        <div className="flex items-center justify-end gap-0.5">
                          {item.change >= 0 ? (
                            <TrendingUp className="w-2.5 h-2.5 text-success" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                          )}
                          <p className={`text-[10px] font-medium ${item.change >= 0 ? "text-success" : "text-destructive"}`}>
                            {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Currency Converter (existing) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
        <CurrencyConverter onConvert={(r) => setHistory((p) => [...p, r])} />
      </motion.div>

      {/* Conversion History (existing) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <ConversionHistory history={history} />
      </motion.div>
    </div>
  );
}

// ── Fallback TradingView-style chart for non-crypto assets ──
// useEffect and useRef already imported at top
import { createChart, ColorType, AreaSeries } from "lightweight-charts";
import type { Time } from "lightweight-charts";

function MarketFallbackChart({ symbol, price, change }: { symbol: string; price: number; change: number }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const textColor = isDark ? "#9ca3af" : "#6b7280";

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      width: chartRef.current.clientWidth,
      height: 300,
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: false },
      crosshair: {
        vertLine: { color: textColor, width: 1, style: 3 },
        horzLine: { color: textColor, width: 1, style: 3 },
      },
    });

    const seed = seedHash(symbol);
    const isUp = change >= 0;
    const days = 90;
    const data = Array.from({ length: days }, (_, i) => ({
      time: (Math.floor(Date.now() / 1000) - (days - i) * 86400) as Time,
      value: price * (1 + Math.sin(seed + i * 0.15) * 0.03 + (i / days) * (change / 100) + Math.cos(seed * 0.7 + i * 0.4) * 0.015),
    }));

    const series = chart.addSeries(AreaSeries, {
      lineColor: isUp ? "#22c55e" : "#ef4444",
      topColor: isUp ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      bottomColor: isUp ? "rgba(34, 197, 94, 0.02)" : "rgba(239, 68, 68, 0.02)",
      lineWidth: 2,
    });
    series.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [symbol, price, change]);

  return <div ref={chartRef} className="w-full" />;
}
