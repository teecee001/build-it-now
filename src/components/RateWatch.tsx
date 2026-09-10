import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForecastMarkets } from "@/hooks/useForecastMarkets";
import { TrendingUp, TrendingDown, Timer, ArrowUpRight } from "lucide-react";

interface RateWatchProps {
  /** Currency the user is sending from / interested in (e.g. "EUR"). */
  currency?: string;
}

/**
 * Rate Watch — the prediction layer surfaced inside money flows.
 * Shows the live probability that waiting a week gets a better rate,
 * derived from real ECB history in useForecastMarkets.
 */
export function RateWatch({ currency }: RateWatchProps) {
  const navigate = useNavigate();
  const { markets, isLoading } = useForecastMarkets();

  const market = useMemo(() => {
    const rates = markets.filter((m) => m.category === "rates" && m.resolvesInDays <= 7);
    if (!rates.length) return null;
    const code = (currency ?? "").toUpperCase();
    return rates.find((m) => m.id === `usd-${code.toLowerCase()}-7d`) ?? rates[0];
  }, [markets, currency]);

  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-full" />
      </Card>
    );
  }

  if (!market) return null;

  const better = market.yesPrice >= 50;
  const pct = market.yesPrice;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.045 }}>
      <Card className="p-4 bg-card border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Rate Watch</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/40 text-primary">
            Live
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{market.question}</p>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${better ? "bg-success" : "bg-destructive"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-lg font-bold font-mono tabular-nums">{pct}%</span>
        </div>

        <div className="flex items-start gap-2 text-xs">
          {better ? (
            <TrendingUp className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
          )}
          <p className="text-muted-foreground">
            {better
              ? `Waiting looks slightly in your favour — the market puts ${pct}% odds on a better rate by ${market.resolvesAt}.`
              : `Sending now looks better — only ${pct}% odds the rate improves by ${market.resolvesAt}.`}{" "}
            <span className="text-foreground/70">Source: {market.source}.</span>
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => navigate("/forecasts")}>
            Open Forecasts <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => navigate("/wallet")}>
            Set a rate alert
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
