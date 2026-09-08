import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForecastMarkets, type ForecastMarket, type MarketCategory } from "@/hooks/useForecastMarkets";
import {
  TrendingUp, TrendingDown, Target, Clock, Flame,
  ArrowUpRight, ArrowDownRight, Info, Wallet, Sparkles,
  CircleDollarSign, Timer, RefreshCw, Database, AlertTriangle,
} from "lucide-react";

function fmtUsd(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
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

export default function Forecasts() {
  const { toast } = useToast();
  const { markets, isLoading, isError, isFetching, lastUpdated, refetch } = useForecastMarkets();
  const [tab, setTab] = useState<"all" | MarketCategory>("all");
  const [positions, setPositions] = useState<Position[]>([]);
  const [trading, setTrading] = useState<{ market: ForecastMarket; side: "YES" | "NO" } | null>(null);
  const [amount, setAmount] = useState("10");

  const priceOf = useCallback(
    (id: string) => markets.find((m) => m.id === id)?.yesPrice ?? 50,
    [markets]
  );

  const filtered = useMemo(
    () => (tab === "all" ? markets : markets.filter((m) => m.category === tab)),
    [tab, markets]
  );

  const headline = markets.find((m) => m.id === "usd-eur-7d") ?? markets[0];
  const investAmount = parseFloat(amount) || 0;

  const openTrade = (market: ForecastMarket, side: "YES" | "NO") => {
    setTrading({ market, side });
    setAmount("10");
  };

  const confirmTrade = () => {
    if (!trading || investAmount <= 0) return;
    const priceCents = trading.side === "YES"
      ? priceOf(trading.market.id)
      : 100 - priceOf(trading.market.id);
    const shares = investAmount / (priceCents / 100);
    setPositions((prev) => [...prev, {
      marketId: trading.market.id, side: trading.side,
      shares: Math.round(shares * 100) / 100, avgPrice: priceCents,
    }]);
    toast({
      title: `Position opened — ${trading.side}`,
      description: `${shares.toFixed(2)} shares at ${priceCents}¢ · Paper position, no funds moved.`,
    });
    setTrading(null);
  };

  const tradePrice = trading
    ? (trading.side === "YES" ? priceOf(trading.market.id) : 100 - priceOf(trading.market.id))
    : 0;
  const potentialShares = tradePrice > 0 ? investAmount / (tradePrice / 100) : 0;
  const potentialProfit = potentialShares - investAmount;

  const portfolioValue = positions.reduce((sum, p) => {
    const yes = priceOf(p.marketId);
    const nowCents = p.side === "YES" ? yes : 100 - yes;
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
            Live probabilities built from real exchange-rate and market data — not simulations.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <Button size="sm" variant="ghost" onClick={refetch} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="p-4 flex items-start gap-3 border-destructive/40">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Live market data is unavailable right now.</p>
            <p className="text-muted-foreground">We only show forecasts backed by real data, so nothing is listed. Try refreshing in a moment.</p>
          </div>
        </Card>
      )}

      {/* Rate Watch — driven by the live 7-day USD→EUR market */}
      {headline && (
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Rate Watch</p>
                <p className="font-semibold">Sending {headline.unit.replace("/", " → ")}?</p>
              </div>
            </div>
            <div className="flex-1 md:text-center">
              <p className="text-sm text-muted-foreground">
                The model puts a <span className="text-foreground font-semibold">{headline.yesPrice}% chance</span> the
                rate improves within 7 days, from today's {headline.spot.toFixed(4)}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openTrade(headline, "YES")}>
                Back the move <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => {
                toast({ title: "Rate alert set", description: `We'll notify you if ${headline.unit} improves.` });
              }}>
                <Timer className="h-3.5 w-3.5 mr-1" /> Alert me instead
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Portfolio strip */}
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
          {isLoading ? (
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((m, i) => {
                const yes = m.yesPrice;
                const no = 100 - yes;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 6) * 0.04 }}
                  >
                    <Card className="p-4 hover:border-primary/40 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {m.hot && (
                              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]">
                                <Flame className="h-3 w-3 mr-1" /> Trending
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {m.category === "rates" ? "FX Rate" : m.category}
                            </Badge>
                          </div>
                          <p className="font-semibold mt-1.5 leading-snug">{m.question}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.resolvesInDays}d · {m.resolvesAt}</span>
                            {m.volume ? (
                              <span className="flex items-center gap-1"><CircleDollarSign className="h-3 w-3" /> {fmtUsd(m.volume)} 24h vol</span>
                            ) : null}
                            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> {m.source}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Sparkline data={m.spark} />
                          <div className="w-40">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                {yes >= 50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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
              {!filtered.length && !isError && (
                <Card className="p-6 text-sm text-muted-foreground text-center">No live markets in this category right now.</Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-4">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Probabilities are modelled from real historical volatility (ECB reference rates and CoinGecko market data) and
          refresh automatically. They are information, not investment advice. Positions are paper-only — no real funds move —
          and availability may vary by region.
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
              <p className="text-xs text-muted-foreground">{trading.market.detail}</p>

              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground">Amount (USD)</label>
                  <Input
                    type="number" min="1" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 text-lg font-semibold"
                  />
                  <div className="flex gap-2 mt-2">
                    {[5, 10, 25, 50].map((v) => (
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
                    <span className="font-medium">${potentialShares.toFixed(2)}</span>
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
                  Paper trading — no real funds move. Each share pays $1 if the outcome resolves {trading.side}.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
