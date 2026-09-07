import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, TrendingDown, Target, Clock, Users, Flame,
  ArrowUpRight, ArrowDownRight, Info, Wallet, Sparkles,
  CircleDollarSign, Timer
} from "lucide-react";

// ─────────────────────────────────────────────
// Types & mock market data
// ─────────────────────────────────────────────
type MarketCategory = "rates" | "crypto" | "economy";

interface ForecastMarket {
  id: string;
  category: MarketCategory;
  question: string;
  detail: string;
  yesPrice: number; // cents 1–99
  volume: number;   // USD
  traders: number;
  resolvesAt: string;
  resolvesInDays: number;
  spark: number[];  // probability history
  hot?: boolean;
}

const MARKETS: ForecastMarket[] = [
  {
    id: "usd-eur-7d",
    category: "rates",
    question: "Will USD buy more EUR in 7 days than today?",
    detail: "Resolves YES if the mid-market USD→EUR rate on Sep 14 is above today's 0.9214.",
    yesPrice: 62, volume: 48210, traders: 1204, resolvesAt: "Sep 14, 2026", resolvesInDays: 7,
    spark: [54, 55, 58, 57, 60, 59, 62], hot: true,
  },
  {
    id: "usd-ngn-30d",
    category: "rates",
    question: "Will the real (parallel) USD→NGN rate beat the official rate by >8% in 30 days?",
    detail: "Compares street-market vs. official CBN rate. Resolves YES if spread exceeds 8%.",
    yesPrice: 71, volume: 31540, traders: 862, resolvesAt: "Oct 7, 2026", resolvesInDays: 30,
    spark: [60, 63, 66, 64, 68, 70, 71], hot: true,
  },
  {
    id: "usd-brl-14d",
    category: "rates",
    question: "Will USD→BRL be above 5.60 within 14 days?",
    detail: "Resolves YES if mid-market USD→BRL touches 5.60 at any point before Sep 21.",
    yesPrice: 44, volume: 12980, traders: 391, resolvesAt: "Sep 21, 2026", resolvesInDays: 14,
    spark: [38, 41, 40, 43, 45, 42, 44],
  },
  {
    id: "btc-150k",
    category: "crypto",
    question: "Will BTC close above $150K by end of October?",
    detail: "Resolves YES if BTC/USD daily close exceeds $150,000 on or before Oct 31.",
    yesPrice: 35, volume: 96420, traders: 2841, resolvesAt: "Oct 31, 2026", resolvesInDays: 54,
    spark: [28, 31, 30, 33, 36, 34, 35], hot: true,
  },
  {
    id: "eth-6k",
    category: "crypto",
    question: "Will ETH reach $6,000 before November?",
    detail: "Resolves YES if ETH/USD touches $6,000 at any point before Nov 1.",
    yesPrice: 41, volume: 54210, traders: 1512, resolvesAt: "Oct 31, 2026", resolvesInDays: 54,
    spark: [36, 38, 42, 40, 43, 39, 41],
  },
  {
    id: "us-cpi-sep",
    category: "economy",
    question: "Will US September CPI come in above 3.0%?",
    detail: "Resolves YES if the BLS September CPI print (YoY) is above 3.0%.",
    yesPrice: 48, volume: 77450, traders: 2103, resolvesAt: "Oct 14, 2026", resolvesInDays: 37,
    spark: [52, 50, 49, 51, 47, 49, 48],
  },
  {
    id: "fed-cut-dec",
    category: "economy",
    question: "Will the Fed cut rates at the December meeting?",
    detail: "Resolves YES if the FOMC lowers the federal funds target range on Dec 16.",
    yesPrice: 58, volume: 120300, traders: 3422, resolvesAt: "Dec 16, 2026", resolvesInDays: 100,
    spark: [50, 53, 55, 52, 56, 57, 58], hot: true,
  },
  {
    id: "gold-4k",
    category: "economy",
    question: "Will gold close above $4,000/oz this quarter?",
    detail: "Resolves YES if XAU/USD daily close exceeds $4,000 before Sep 30.",
    yesPrice: 67, volume: 41230, traders: 998, resolvesAt: "Sep 30, 2026", resolvesInDays: 23,
    spark: [58, 61, 63, 60, 64, 66, 67],
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmtUsd(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
}

function Sparkline({ data }: { data: number[] }) {
  const w = 72, h = 24;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" strokeWidth={1.5}
        stroke={up ? "hsl(var(--success, 142 76% 36%))" : "hsl(var(--destructive))"}
        className={up ? "stroke-emerald-400" : "stroke-red-400"} />
    </svg>
  );
}

interface Position {
  marketId: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function Forecasts() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"all" | MarketCategory>("all");
  const [positions, setPositions] = useState<Position[]>([]);
  const [trading, setTrading] = useState<{ market: ForecastMarket; side: "YES" | "NO" } | null>(null);
  const [amount, setAmount] = useState("10");
  const [tick, setTick] = useState(0);

  // Gentle live-probability drift for the demo
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const livePrice = useCallback((m: ForecastMarket) => {
    const drift = Math.sin(tick * 0.9 + m.id.length) * 1.2;
    return Math.min(97, Math.max(3, Math.round(m.yesPrice + drift)));
  }, [tick]);

  const filtered = useMemo(
    () => (tab === "all" ? MARKETS : MARKETS.filter(m => m.category === tab)),
    [tab]
  );

  const investAmount = parseFloat(amount) || 0;

  const openTrade = (market: ForecastMarket, side: "YES" | "NO") => {
    setTrading({ market, side });
    setAmount("10");
  };

  const confirmTrade = () => {
    if (!trading || investAmount <= 0) return;
    const priceCents = trading.side === "YES" ? livePrice(trading.market) : 100 - livePrice(trading.market);
    const shares = investAmount / (priceCents / 100);
    setPositions(prev => [...prev, {
      marketId: trading.market.id, side: trading.side,
      shares: Math.round(shares * 100) / 100, avgPrice: priceCents,
    }]);
    toast({
      title: `Position opened — ${trading.side}`,
      description: `${shares.toFixed(2)} shares at ${priceCents}¢ · Demo position, no funds moved.`,
    });
    setTrading(null);
  };

  const tradePrice = trading
    ? (trading.side === "YES" ? livePrice(trading.market) : 100 - livePrice(trading.market))
    : 0;
  const potentialShares = tradePrice > 0 ? investAmount / (tradePrice / 100) : 0;
  const potentialPayout = potentialShares; // $1 per share if correct
  const potentialProfit = potentialPayout - investAmount;

  const portfolioValue = positions.reduce((sum, p) => {
    const m = MARKETS.find(x => x.id === p.marketId);
    if (!m) return sum;
    const nowCents = p.side === "YES" ? livePrice(m) : 100 - livePrice(m);
    return sum + p.shares * (nowCents / 100);
  }, 0);
  const portfolioCost = positions.reduce((sum, p) => sum + p.shares * (p.avgPrice / 100), 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Forecasts</h1>
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px] uppercase tracking-wider">
              Beta
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Markets on the money outcomes that matter — exchange rates, inflation, and where your transfer is headed.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live probabilities
        </div>
      </div>

      {/* Rate Watch — send-flow intelligence preview */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rate Watch</p>
              <p className="font-semibold">Sending USD → EUR?</p>
            </div>
          </div>
          <div className="flex-1 md:text-center">
            <p className="text-sm text-muted-foreground">
              The market puts a <span className="text-foreground font-semibold">{livePrice(MARKETS[0])}% chance</span> the
              rate improves within 7 days.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openTrade(MARKETS[0], "YES")}>
              Back the move <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => {
              toast({ title: "Rate alert set", description: "We'll notify you if USD→EUR improves. (Demo)" });
            }}>
              <Timer className="h-3.5 w-3.5 mr-1" /> Alert me instead
            </Button>
          </div>
        </div>
      </Card>

      {/* Portfolio strip (only when positions exist) */}
      <AnimatePresence>
        {positions.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">My positions</span>
                <span className="font-semibold">{positions.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Value </span>
                <span className="font-semibold">${portfolioValue.toFixed(2)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">P/L </span>
                <span className={`font-semibold ${portfolioValue - portfolioCost >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {portfolioValue - portfolioCost >= 0 ? "+" : ""}${(portfolioValue - portfolioCost).toFixed(2)}
                </span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All markets</TabsTrigger>
          <TabsTrigger value="rates">FX Rates</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="economy">Economy</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid gap-3">
            {filtered.map((m, i) => {
              const yes = livePrice(m);
              const no = 100 - yes;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-4 hover:border-primary/40 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Question */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.hot && (
                            <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]">
                              <Flame className="h-3 w-3 mr-1" /> Trending
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">{m.category === "rates" ? "FX Rate" : m.category}</Badge>
                        </div>
                        <p className="font-semibold mt-1.5 leading-snug">{m.question}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.resolvesInDays}d · {m.resolvesAt}</span>
                          <span className="flex items-center gap-1"><CircleDollarSign className="h-3 w-3" /> {fmtUsd(m.volume)} vol</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.traders.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Probability */}
                      <div className="flex items-center gap-4">
                        <Sparkline data={[...m.spark, yes]} />
                        <div className="w-40">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                              {yes >= m.spark[0] ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {yes}% YES
                            </span>
                            <span className="text-muted-foreground">{no}% NO</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-emerald-400"
                              animate={{ width: `${yes}%` }}
                              transition={{ type: "spring", stiffness: 120, damping: 20 }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 min-w-[88px]"
                          variant="ghost" onClick={() => openTrade(m, "YES")}>
                          Yes {yes}¢
                        </Button>
                        <Button size="sm" className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 min-w-[88px]"
                          variant="ghost" onClick={() => openTrade(m, "NO")}>
                          No {no}¢
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-4">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Forecasts are information markets, not investment advice. Probabilities reflect crowd sentiment, not certainty.
          Demo mode — no real funds are used, and availability may vary by region.
        </p>
      </div>

      {/* Trade dialog */}
      <Dialog open={!!trading} onOpenChange={(o) => !o && setTrading(null)}>
        <DialogContent className="sm:max-w-md">
          {trading && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Back {trading.side} at {tradePrice}¢
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground leading-snug">{trading.market.question}</p>

              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground">Amount (USD)</label>
                  <Input
                    type="number" min="1" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 text-lg font-semibold"
                  />
                  <div className="flex gap-2 mt-2">
                    {[5, 10, 25, 50].map(v => (
                      <Button key={v} size="sm" variant="outline" className="flex-1" onClick={() => setAmount(String(v))}>
                        ${v}
                      </Button>
                    ))}
                  </div>
                </div>

                <Card className="p-3 bg-muted/40 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-medium">{potentialShares.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pays out if correct</span>
                    <span className="font-medium">${potentialPayout.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potential profit</span>
                    <span className={`font-semibold ${potentialProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      +${potentialProfit.toFixed(2)}
                    </span>
                  </div>
                </Card>

                <Button
                  className={`w-full ${trading.side === "YES"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"}`}
                  onClick={confirmTrade}
                  disabled={investAmount <= 0}
                >
                  {trading.side === "YES" ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                  Buy {trading.side} — ${investAmount.toFixed(2)}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Demo only — no real funds will move. Each share pays $1 if the outcome resolves {trading.side}.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
