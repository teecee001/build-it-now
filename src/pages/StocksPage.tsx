import { useState } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useStockHoldings } from "@/hooks/useStockHoldings";
import { useStockPrices } from "@/hooks/useStockPrices";
import { STOCK_LIST, TRENDING_STOCKS, SECTOR_COLORS } from "@/constants/stockList";
import { StockTradeModal } from "@/components/StockTradeModal";
import {
  Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  ChevronRight, BarChart3, PieChart, Star, X, Briefcase
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

function generateSparkline(ticker: string) {
  const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => ({
    d: `D${i}`,
    p: 100 + Math.sin(seed + i * 0.8) * 15 + Math.cos(seed * 0.3 + i) * 8,
  }));
}

function MiniChart({ ticker }: { ticker: string }) {
  const sparkline = generateSparkline(ticker);
  const isUp = sparkline[sparkline.length - 1].p >= sparkline[0].p;
  return (
    <ResponsiveContainer width={56} height={28}>
      <LineChart data={sparkline}>
        <Line type="monotone" dataKey="p" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function StocksPage() {
  return (
    <FeatureGate feature="features_stocks" featureLabel="Stocks">
      <StocksContent />
    </FeatureGate>
  );
}

function StocksContent() {
  const { getWallet } = useMultiCurrencyWallet();
  const { holdingsMap, isLoading: holdingsLoading } = useStockHoldings();
  const { getPrice, getChange } = useStockPrices();
  const [search, setSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["AAPL", "TSLA", "NVDA"]));
  const [tradeModal, setTradeModal] = useState<{ type: "buy" | "sell"; ticker: string } | null>(null);

  const toggleFav = (ticker: string) => {
    setFavorites(prev => { const n = new Set(prev); n.has(ticker) ? n.delete(ticker) : n.add(ticker); return n; });
  };

  const usdBalance = getWallet("USD")?.balance ?? 0;

  const portfolioValue = Object.entries(holdingsMap).reduce(
    (sum, [ticker, h]) => sum + h.shares * getPrice(ticker), 0
  );
  const totalPnL = Object.entries(holdingsMap).reduce(
    (sum, [ticker, h]) => sum + h.shares * (getPrice(ticker) - h.avgPrice), 0
  );

  const filteredStocks = STOCK_LIST.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.ticker.toLowerCase().includes(search.toLowerCase())
  );

  const openTrade = (type: "buy" | "sell", ticker: string) => {
    setTradeModal({ type, ticker });
    setSelectedStock(null);
  };

  const holdingTickers = Object.keys(holdingsMap).filter(t => holdingsMap[t].shares > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Stocks</h1>
          </div>
          <Badge variant="default" className="text-[10px]">● Live</Badge>
        </div>
      </motion.div>

      {/* Portfolio Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-5 bg-card border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5 pointer-events-none" />
          <div className="relative">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stock Portfolio</p>
            <p className="text-3xl font-bold font-mono">${portfolioValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">Total P&L</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Buying Power: ${usdBalance.toFixed(2)}</p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {([
                { icon: ArrowDownLeft, label: "Buy", color: "bg-success/10 text-success", action: () => openTrade("buy", selectedStock || "AAPL") },
                { icon: ArrowUpRight, label: "Sell", color: "bg-destructive/10 text-destructive", action: () => openTrade("sell", selectedStock || "AAPL") },
              ] as const).map((a) => (
                <button key={a.label} onClick={a.action} className={`flex flex-col items-center gap-1 py-3 rounded-xl ${a.color} transition-colors hover:opacity-80`}>
                  <a.icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Trade Modal */}
      <AnimatePresence>
        {tradeModal && (
          <StockTradeModal
            type={tradeModal.type}
            ticker={tradeModal.ticker}
            price={getPrice(tradeModal.ticker)}
            onClose={() => setTradeModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Holdings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Positions</h2>
          <PieChart className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          {holdingTickers.length === 0 && !holdingsLoading && (
            <Card className="p-6 bg-card border-border text-center">
              <p className="text-sm text-muted-foreground">No stock positions yet. Buy your first share!</p>
            </Card>
          )}
          {holdingTickers.map((ticker) => {
            const h = holdingsMap[ticker];
            const price = getPrice(ticker);
            const value = h.shares * price;
            const pnl = h.shares * (price - h.avgPrice);
            const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice * 100) : 0;
            const stock = STOCK_LIST.find(s => s.ticker === ticker);
            return (
              <Card key={ticker} className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelectedStock(ticker)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold">{ticker.slice(0, 3)}</div>
                    <div>
                      <p className="text-sm font-semibold">{stock?.name ?? ticker}</p>
                      <p className="text-xs text-muted-foreground">{h.shares.toFixed(4)} shares</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">${value.toFixed(2)}</p>
                    <p className={`text-[10px] font-medium ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Stock Detail Panel */}
      <AnimatePresence>
        {selectedStock && !tradeModal && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <Card className="p-5 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold">{selectedStock.slice(0, 3)}</div>
                  <div>
                    <h3 className="font-semibold">{STOCK_LIST.find(s => s.ticker === selectedStock)?.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{selectedStock}</p>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${SECTOR_COLORS[STOCK_LIST.find(s => s.ticker === selectedStock)?.sector ?? ""] ?? "text-muted-foreground"}`}>
                        {STOCK_LIST.find(s => s.ticker === selectedStock)?.sector}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedStock(null)}><X className="w-4 h-4" /></Button>
              </div>

              <div className="flex items-end gap-3">
                <p className="text-2xl font-bold font-mono">${getPrice(selectedStock).toFixed(2)}</p>
                {(() => {
                  const change = getChange(selectedStock);
                  const isUp = change >= 0;
                  return (
                    <span className={`text-sm font-semibold ${isUp ? "text-success" : "text-destructive"}`}>
                      {isUp ? "+" : ""}{change}%
                    </span>
                  );
                })()}
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Open", value: `$${(getPrice(selectedStock) * 0.998).toFixed(2)}` },
                  { label: "High", value: `$${(getPrice(selectedStock) * 1.015).toFixed(2)}` },
                  { label: "Low", value: `$${(getPrice(selectedStock) * 0.985).toFixed(2)}` },
                  { label: "Vol", value: `${(Math.abs(selectedStock.charCodeAt(0) * 123456) % 50 + 5).toFixed(1)}M` },
                  { label: "Mkt Cap", value: `$${((getPrice(selectedStock) * (Math.abs(selectedStock.charCodeAt(0) * 7) % 20 + 1)) / 1).toFixed(0)}B` },
                  { label: "P/E", value: (15 + (selectedStock.charCodeAt(0) % 25)).toFixed(1) },
                ].map(stat => (
                  <div key={stat.label} className="p-2 bg-secondary/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    <p className="text-xs font-semibold font-mono">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Trade Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-success text-success-foreground hover:bg-success/90 gap-1" size="sm" onClick={() => openTrade("buy", selectedStock)}>
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Buy
                </Button>
                <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1" size="sm" onClick={() => openTrade("sell", selectedStock)}>
                  <ArrowUpRight className="w-3.5 h-3.5" /> Sell
                </Button>
              </div>

              {/* Your position */}
              {holdingsMap[selectedStock] && holdingsMap[selectedStock].shares > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Your Position</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-mono font-semibold">{holdingsMap[selectedStock].shares.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Value</span>
                    <span className="font-mono font-semibold">${(holdingsMap[selectedStock].shares * getPrice(selectedStock)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Cost</span>
                    <span className="font-mono">${holdingsMap[selectedStock].avgPrice.toFixed(2)}</span>
                  </div>
                  {(() => {
                    const h = holdingsMap[selectedStock];
                    const pnl = h.shares * (getPrice(selectedStock) - h.avgPrice);
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">P&L</span>
                        <span className={`font-mono font-semibold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
        <Tabs defaultValue="all" className="space-y-3">
          <TabsList className="bg-secondary/50 w-full grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs">All Stocks</TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">Popular</TabsTrigger>
            <TabsTrigger value="watchlist" className="text-xs">Watchlist</TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search stocks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-secondary border-border text-sm" />
          </div>

          <TabsContent value="all" className="space-y-1.5 mt-0">
            {filteredStocks.slice(0, 30).map((stock, i) => (
              <StockRow key={stock.ticker} stock={stock} index={i} price={getPrice(stock.ticker)} change={getChange(stock.ticker)} isFav={favorites.has(stock.ticker)} onFav={() => toggleFav(stock.ticker)} onSelect={() => setSelectedStock(stock.ticker)} />
            ))}
          </TabsContent>
          <TabsContent value="trending" className="space-y-1.5 mt-0">
            {TRENDING_STOCKS.map((ticker, i) => {
              const stock = STOCK_LIST.find(s => s.ticker === ticker);
              if (!stock) return null;
              return <StockRow key={ticker} stock={stock} index={i} price={getPrice(ticker)} change={getChange(ticker)} isFav={favorites.has(ticker)} onFav={() => toggleFav(ticker)} onSelect={() => setSelectedStock(ticker)} />;
            })}
          </TabsContent>
          <TabsContent value="watchlist" className="space-y-1.5 mt-0">
            {Array.from(favorites).map((ticker, i) => {
              const stock = STOCK_LIST.find(s => s.ticker === ticker);
              if (!stock) return null;
              return <StockRow key={ticker} stock={stock} index={i} price={getPrice(ticker)} change={getChange(ticker)} isFav={true} onFav={() => toggleFav(ticker)} onSelect={() => setSelectedStock(ticker)} />;
            })}
            {favorites.size === 0 && <p className="text-center text-sm text-muted-foreground py-8">Tap ★ to add stocks to your watchlist</p>}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function StockRow({ stock, index, price, change, isFav, onFav, onSelect }: {
  stock: { ticker: string; name: string; sector: string }; index: number; price: number; change: number; isFav: boolean; onFav: () => void; onSelect: () => void;
}) {
  const isPositive = change >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.015 }}>
      <Card className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); onFav(); }} className="shrink-0">
              <Star className={`w-3.5 h-3.5 ${isFav ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold">{stock.ticker.slice(0, 3)}</div>
            <div>
              <p className="text-sm font-semibold">{stock.name}</p>
              <p className="text-[10px] text-muted-foreground">{stock.ticker}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MiniChart ticker={stock.ticker} />
            <div className="text-right min-w-[70px]">
              <p className="text-sm font-semibold font-mono">${price.toFixed(2)}</p>
              <div className="flex items-center justify-end gap-0.5">
                {isPositive ? <TrendingUp className="w-2.5 h-2.5 text-success" /> : <TrendingDown className="w-2.5 h-2.5 text-destructive" />}
                <p className={`text-[10px] font-medium ${isPositive ? "text-success" : "text-destructive"}`}>{isPositive ? "+" : ""}{change}%</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
