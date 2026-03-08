import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useMultiCurrencyWallet } from "@/hooks/useMultiCurrencyWallet";
import { useCryptoHoldings } from "@/hooks/useCryptoHoldings";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import { TradingViewChart } from "@/components/TradingViewChart";
import { CryptoTradeModal } from "@/components/CryptoTradeModal";
import {
  Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  ArrowLeftRight, ChevronRight, Wallet, PieChart, Star, BarChart2, CandlestickChart, X
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const TOP_COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX"];

function generateSparkline(code: string) {
  const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => ({
    d: `D${i}`,
    p: 100 + Math.sin(seed + i * 0.8) * 15 + Math.cos(seed * 0.3 + i) * 8,
  }));
}

function MiniChart({ code }: { code: string }) {
  const sparkline = generateSparkline(code);
  const isUp = sparkline[sparkline.length - 1].p >= sparkline[0].p;
  return (
    <ResponsiveContainer width={56} height={28}>
      <LineChart data={sparkline}>
        <Line type="monotone" dataKey="p" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { rates, isLive } = useExchangeRates();
  const { wallets, getWallet } = useMultiCurrencyWallet();
  const { holdingsMap, holdings, isLoading: holdingsLoading } = useCryptoHoldings();
  const [search, setSearch] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC", "ETH", "SOL"]));
  const [chartType, setChartType] = useState<"area" | "candlestick">("area");
  const [chartDays, setChartDays] = useState(30);
  const [tradeModal, setTradeModal] = useState<{ type: "buy" | "sell" | "swap" | "send"; code: string } | null>(null);

  const toggleFav = (code: string) => {
    setFavorites(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  const getPrice = (code: string) => rates[code] ? 1 / rates[code] : 0;
  const getChange = (i: number) => parseFloat(((Math.sin(i * 1.7 + 0.3) * 8) + 0.5).toFixed(2));

  const portfolioValue = Object.entries(holdingsMap).reduce((sum, [code, amount]) => sum + amount * getPrice(code), 0);
  const usdBalance = getWallet("USD")?.balance ?? 0;

  const filteredCryptos = CRYPTO_LIST.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const openTrade = (type: "buy" | "sell" | "swap", code: string) => {
    setTradeModal({ type, code });
    setSelectedCoin(null);
  };

  const holdingCodes = Object.keys(holdingsMap).filter(code => holdingsMap[code] > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-warning" />
            <h1 className="text-2xl font-bold tracking-tight">Crypto Wallet</h1>
          </div>
          <Badge variant={isLive ? "default" : "secondary"} className="text-[10px]">
            {isLive ? "● Live" : "Demo"}
          </Badge>
        </div>
      </motion.div>

      {/* Portfolio Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-5 bg-card border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-success/5 pointer-events-none" />
          <div className="relative">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Portfolio Value</p>
            <p className="text-3xl font-bold font-mono">${portfolioValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">USD Balance: ${usdBalance.toFixed(2)}</p>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {([
                { icon: ArrowDownLeft, label: "Buy", color: "bg-success/10 text-success", action: () => openTrade("buy", selectedCoin || "BTC") },
                { icon: ArrowUpRight, label: "Sell", color: "bg-destructive/10 text-destructive", action: () => openTrade("sell", selectedCoin || "BTC") },
                { icon: ArrowLeftRight, label: "Swap", color: "bg-accent/10 text-accent", action: () => openTrade("swap", selectedCoin || "BTC") },
                { icon: ArrowUpRight, label: "Send", color: "bg-warning/10 text-warning", action: () => openTrade("send", selectedCoin || "BTC") },
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
          <CryptoTradeModal
            type={tradeModal.type}
            code={tradeModal.code}
            price={getPrice(tradeModal.code)}
            onClose={() => setTradeModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Holdings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Holdings</h2>
          <PieChart className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          {holdingCodes.length === 0 && !holdingsLoading && (
            <Card className="p-6 bg-card border-border text-center">
              <p className="text-sm text-muted-foreground">No crypto holdings yet. Buy your first coin!</p>
            </Card>
          )}
          {holdingCodes.map((code) => {
            const amount = holdingsMap[code];
            const price = getPrice(code);
            const value = amount * price;
            const pct = portfolioValue > 0 ? (value / portfolioValue * 100) : 0;
            const crypto = CRYPTO_LIST.find(c => c.code === code);
            return (
              <Card key={code} className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelectedCoin(code)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">{code.slice(0, 2)}</div>
                    <div>
                      <p className="text-sm font-semibold">{crypto?.name ?? code}</p>
                      <p className="text-xs text-muted-foreground">{amount.toFixed(6)} {code}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <MiniChart code={code} />
                    <div>
                      <p className="text-sm font-semibold font-mono">${value.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Coin Detail with TradingView Chart */}
      <AnimatePresence>
        {selectedCoin && !tradeModal && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <Card className="p-5 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">{selectedCoin.slice(0, 2)}</div>
                  <div>
                    <h3 className="font-semibold">{CRYPTO_LIST.find(c => c.code === selectedCoin)?.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedCoin}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCoin(null)}><X className="w-4 h-4" /></Button>
              </div>

              <div className="flex items-end gap-3">
                <p className="text-2xl font-bold font-mono">
                  ${getPrice(selectedCoin) > 1 ? getPrice(selectedCoin).toLocaleString("en-US", { maximumFractionDigits: 2 }) : getPrice(selectedCoin).toFixed(6)}
                </p>
              </div>

              {/* Chart Controls */}
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

              {/* TradingView Chart */}
              <div className="rounded-lg overflow-hidden bg-secondary/20 border border-border/50">
                <TradingViewChart code={selectedCoin} height={280} days={chartDays} type={chartType} />
              </div>

              {/* Trade Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button className="bg-success text-success-foreground hover:bg-success/90 gap-1" size="sm" onClick={() => openTrade("buy", selectedCoin)}>
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Buy
                </Button>
                <Button variant="outline" className="gap-1" size="sm" onClick={() => openTrade("sell", selectedCoin)}>
                  <ArrowUpRight className="w-3.5 h-3.5" /> Sell
                </Button>
                <Button variant="outline" className="gap-1" size="sm" onClick={() => openTrade("swap", selectedCoin)}>
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Swap
                </Button>
              </div>

              {holdingsMap[selectedCoin] > 0 && (
                <div className="p-3 bg-secondary/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Your Holdings</p>
                    <p className="text-sm font-semibold font-mono">{holdingsMap[selectedCoin].toFixed(6)} {selectedCoin}</p>
                  </div>
                  <p className="text-sm font-bold font-mono text-success">
                    ${(holdingsMap[selectedCoin] * getPrice(selectedCoin)).toFixed(2)}
                  </p>
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
            <TabsTrigger value="all" className="text-xs">All Assets</TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
            <TabsTrigger value="watchlist" className="text-xs">Watchlist</TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search coins..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-secondary border-border text-sm" />
          </div>

          <TabsContent value="all" className="space-y-1.5 mt-0">
            {filteredCryptos.slice(0, 30).map((crypto, i) => (
              <CoinRow key={crypto.code} crypto={crypto} index={i} price={getPrice(crypto.code)} change={getChange(i)} isFav={favorites.has(crypto.code)} onFav={() => toggleFav(crypto.code)} onSelect={() => setSelectedCoin(crypto.code)} />
            ))}
          </TabsContent>
          <TabsContent value="trending" className="space-y-1.5 mt-0">
            {TOP_COINS.map((code, i) => { const crypto = CRYPTO_LIST.find(c => c.code === code); if (!crypto) return null; return <CoinRow key={code} crypto={crypto} index={i} price={getPrice(code)} change={getChange(i)} isFav={favorites.has(code)} onFav={() => toggleFav(code)} onSelect={() => setSelectedCoin(code)} />; })}
          </TabsContent>
          <TabsContent value="watchlist" className="space-y-1.5 mt-0">
            {Array.from(favorites).map((code, i) => { const crypto = CRYPTO_LIST.find(c => c.code === code); if (!crypto) return null; return <CoinRow key={code} crypto={crypto} index={i} price={getPrice(code)} change={getChange(i)} isFav={true} onFav={() => toggleFav(code)} onSelect={() => setSelectedCoin(code)} />; })}
            {favorites.size === 0 && <p className="text-center text-sm text-muted-foreground py-8">Tap the ★ to add coins to your watchlist</p>}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function CoinRow({ crypto, index, price, change, isFav, onFav, onSelect }: {
  crypto: { code: string; name: string }; index: number; price: number; change: number; isFav: boolean; onFav: () => void; onSelect: () => void;
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
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">{crypto.code.slice(0, 2)}</div>
            <div>
              <p className="text-sm font-semibold">{crypto.name}</p>
              <p className="text-[10px] text-muted-foreground">{crypto.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MiniChart code={crypto.code} />
            <div className="text-right min-w-[70px]">
              <p className="text-sm font-semibold font-mono">${price > 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : price.toFixed(6)}</p>
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
