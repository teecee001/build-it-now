import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExchangeRates, useCryptoChartData } from "@/hooks/useExchangeRates";
import { CRYPTO_LIST } from "@/constants/cryptoList";
import {
  Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  ArrowLeftRight, ChevronRight, Wallet, BarChart3, PieChart, Star
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

// Top watchlist coins
const TOP_COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX"];

// Simulated portfolio holdings (mock)
const MOCK_HOLDINGS: Record<string, number> = {
  BTC: 0.0025, ETH: 0.15, SOL: 2.5, DOGE: 500, ADA: 120,
};

function generateSparkline(code: string): { date: string; price: number }[] {
  const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => ({
    date: `D${i}`,
    price: 100 + Math.sin(seed + i * 0.8) * 15 + Math.cos(seed * 0.3 + i) * 8,
  }));
}

function MiniChart({ code }: { code: string }) {
  const sparkline = generateSparkline(code);
  const isUp = sparkline[sparkline.length - 1].price >= sparkline[0].price;
  return (
    <ResponsiveContainer width={64} height={32}>
      <LineChart data={sparkline}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={isUp ? "hsl(var(--success))" : "hsl(var(--destructive))"}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CoinDetailPanel({ code, price, onClose }: { code: string; price: number; onClose: () => void }) {
  const { data, isLoading } = useCryptoChartData(code);
  const crypto = CRYPTO_LIST.find(c => c.code === code);

  // Generate fallback chart data based on current price
  const fallbackData = Array.from({ length: 30 }, (_, i) => {
    const seed = code.charCodeAt(0) + code.charCodeAt(1);
    const noise = Math.sin(seed + i * 0.5) * 0.04 + Math.cos(seed * 0.3 + i * 0.7) * 0.02;
    return {
      date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString(),
      price: price * (0.92 + noise * i * 0.3 / 30 + (i / 30) * 0.08),
    };
  });

  const chartData = data && data.length > 0 ? data : fallbackData;
  const priceChange = chartData.length >= 2
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100)
    : 0;
  const isUp = priceChange >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Card className="p-5 bg-card border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
              {code.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold">{crypto?.name}</h3>
              <p className="text-xs text-muted-foreground">{code}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <div className="flex items-end gap-3">
          <p className="text-2xl font-bold font-mono">
            ${price > 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : price.toFixed(6)}
          </p>
          <Badge className={isUp ? "bg-success/10 text-success border-0" : "bg-destructive/10 text-destructive border-0"}>
            {isUp ? "+" : ""}{priceChange.toFixed(2)}% (30d)
          </Badge>
        </div>

        {/* Chart */}
        <div className="h-[200px] bg-secondary/30 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                  fontSize: "12px",
                }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isUp ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button className="bg-success text-success-foreground hover:bg-success/90 gap-1" size="sm">
            <ArrowDownLeft className="w-3.5 h-3.5" /> Buy
          </Button>
          <Button variant="outline" className="gap-1" size="sm">
            <ArrowUpRight className="w-3.5 h-3.5" /> Sell
          </Button>
          <Button variant="outline" className="gap-1" size="sm">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Swap
          </Button>
        </div>

        {/* Holding */}
        {MOCK_HOLDINGS[code] && (
          <div className="p-3 bg-secondary/50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Your Holdings</p>
              <p className="text-sm font-semibold font-mono">{MOCK_HOLDINGS[code]} {code}</p>
            </div>
            <p className="text-sm font-bold font-mono text-success">
              ${(MOCK_HOLDINGS[code] * price).toFixed(2)}
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function WalletPage() {
  const { rates, isLive } = useExchangeRates();
  const [search, setSearch] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC", "ETH", "SOL"]));

  const toggleFav = (code: string) => {
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  };

  // Portfolio value
  const portfolioValue = Object.entries(MOCK_HOLDINGS).reduce((sum, [code, amount]) => {
    const price = rates[code] ? 1 / rates[code] : 0;
    return sum + amount * price;
  }, 0);

  const filteredCryptos = CRYPTO_LIST.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const getPrice = (code: string) => rates[code] ? 1 / rates[code] : 0;
  const getChange = (i: number) => parseFloat(((Math.sin(i * 1.7 + 0.3) * 8) + 0.5).toFixed(2));

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
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-success" />
              <p className="text-xs text-success font-medium">+3.42% today</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { icon: ArrowDownLeft, label: "Buy", color: "bg-success/10 text-success" },
                { icon: ArrowUpRight, label: "Sell", color: "bg-destructive/10 text-destructive" },
                { icon: ArrowLeftRight, label: "Swap", color: "bg-accent/10 text-accent" },
                { icon: ArrowUpRight, label: "Send", color: "bg-warning/10 text-warning" },
              ].map((action) => (
                <button
                  key={action.label}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl ${action.color} transition-colors hover:opacity-80`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Holdings Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Holdings</h2>
          <PieChart className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          {Object.entries(MOCK_HOLDINGS).map(([code, amount]) => {
            const price = getPrice(code);
            const value = amount * price;
            const pct = portfolioValue > 0 ? (value / portfolioValue * 100) : 0;
            const crypto = CRYPTO_LIST.find(c => c.code === code);
            return (
              <Card
                key={code}
                className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedCoin(code)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {code.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{crypto?.name}</p>
                      <p className="text-xs text-muted-foreground">{amount} {code}</p>
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

      {/* Coin Detail */}
      <AnimatePresence>
        {selectedCoin && (
          <CoinDetailPanel
            code={selectedCoin}
            price={getPrice(selectedCoin)}
            onClose={() => setSelectedCoin(null)}
          />
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-secondary border-border text-sm"
            />
          </div>

          <TabsContent value="all" className="space-y-1.5 mt-0">
            {filteredCryptos.slice(0, 30).map((crypto, i) => (
              <CoinRow
                key={crypto.code}
                crypto={crypto}
                index={i}
                price={getPrice(crypto.code)}
                change={getChange(i)}
                isFav={favorites.has(crypto.code)}
                onFav={() => toggleFav(crypto.code)}
                onSelect={() => setSelectedCoin(crypto.code)}
              />
            ))}
          </TabsContent>

          <TabsContent value="trending" className="space-y-1.5 mt-0">
            {TOP_COINS.map((code, i) => {
              const crypto = CRYPTO_LIST.find(c => c.code === code);
              if (!crypto) return null;
              return (
                <CoinRow
                  key={code}
                  crypto={crypto}
                  index={i}
                  price={getPrice(code)}
                  change={getChange(i)}
                  isFav={favorites.has(code)}
                  onFav={() => toggleFav(code)}
                  onSelect={() => setSelectedCoin(code)}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="watchlist" className="space-y-1.5 mt-0">
            {Array.from(favorites).map((code, i) => {
              const crypto = CRYPTO_LIST.find(c => c.code === code);
              if (!crypto) return null;
              return (
                <CoinRow
                  key={code}
                  crypto={crypto}
                  index={i}
                  price={getPrice(code)}
                  change={getChange(i)}
                  isFav={true}
                  onFav={() => toggleFav(code)}
                  onSelect={() => setSelectedCoin(code)}
                />
              );
            })}
            {favorites.size === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Tap the ★ to add coins to your watchlist
              </p>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function CoinRow({
  crypto, index, price, change, isFav, onFav, onSelect,
}: {
  crypto: { code: string; name: string };
  index: number; price: number; change: number;
  isFav: boolean; onFav: () => void; onSelect: () => void;
}) {
  const isPositive = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
    >
      <Card
        className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onFav(); }}
              className="shrink-0"
            >
              <Star className={`w-3.5 h-3.5 ${isFav ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
              {crypto.code.slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold">{crypto.name}</p>
              <p className="text-[10px] text-muted-foreground">{crypto.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MiniChart code={crypto.code} />
            <div className="text-right min-w-[70px]">
              <p className="text-sm font-semibold font-mono">
                ${price > 1 ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : price.toFixed(6)}
              </p>
              <div className="flex items-center justify-end gap-0.5">
                {isPositive ? (
                  <TrendingUp className="w-2.5 h-2.5 text-success" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                )}
                <p className={`text-[10px] font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                  {isPositive ? "+" : ""}{change}%
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
