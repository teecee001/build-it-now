import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fearGreedTone, useFearGreed } from "@/hooks/useFearGreed";
import { cn } from "@/lib/utils";

type Variant = "full" | "compact" | "pill";

interface FearGreedGaugeProps {
  variant?: Variant;
  className?: string;
}

/** Semi-circle gauge path helpers (viewBox 0 0 200 110). */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  // 180° = left, 0° = right; value 0 → 180°, value 100 → 0°
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polar(cx, cy, r, startAngle);
  const e = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function GaugeArc({ value, stroke }: { value: number; stroke: string }) {
  const cx = 100, cy = 100, r = 78;
  // Background track: full semicircle 180 → 0
  const track = arcPath(cx, cy, r, 180, 0);
  // Filled: 180 → angle for value (0→180, 100→0)
  const endAngle = 180 - (value / 100) * 180;
  const fill = value > 0 ? arcPath(cx, cy, r, 180, endAngle) : "";
  const needle = polar(cx, cy, r - 6, endAngle);

  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-[220px] mx-auto" aria-hidden>
      <defs>
        <linearGradient id="fg-track" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="35%" stopColor="#f97316" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#84cc16" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d={track} fill="none" stroke="url(#fg-track)" strokeWidth="14" strokeLinecap="round" />
      {fill && (
        <motion.path
          d={fill}
          fill="none"
          stroke={stroke}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      {/* Tick marks */}
      {[0, 25, 50, 75, 100].map((t) => {
        const a = 180 - (t / 100) * 180;
        const outer = polar(cx, cy, r + 4, a);
        const inner = polar(cx, cy, r - 18, a);
        return (
          <line
            key={t}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5"
          />
        );
      })}
      {/* Needle tip */}
      <motion.circle
        cx={needle.x} cy={needle.y} r="5"
        fill={stroke}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      />
      <circle cx={cx} cy={cy} r="4" fill="currentColor" className="text-muted-foreground/40" />
    </svg>
  );
}

function HistoryBars({ history }: { history: { value: number }[] }) {
  const slice = history.slice(-14);
  if (slice.length < 2) return null;
  return (
    <div className="flex items-end gap-[3px] h-8 w-full" aria-hidden>
      {slice.map((p, i) => {
        const tone = fearGreedTone(p.value);
        return (
          <div
            key={i}
            className="flex-1 rounded-sm min-w-0 transition-all"
            style={{
              height: `${Math.max(12, p.value)}%`,
              backgroundColor: tone.stroke,
              opacity: i === slice.length - 1 ? 1 : 0.45,
            }}
            title={`${p.value}`}
          />
        );
      })}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground font-medium">
        <Minus className="w-3 h-3" /> 0 vs yesterday
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-semibold",
      up ? "text-emerald-400" : "text-red-400",
    )}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? "+" : ""}{delta} vs yesterday
    </span>
  );
}

export function FearGreedGauge({ variant = "full", className }: FearGreedGaugeProps) {
  const { data, isLoading, isError, isFetching, refetch } = useFearGreed();

  const tone = useMemo(
    () => (data ? fearGreedTone(data.current.value) : null),
    [data],
  );

  if (variant === "pill") {
    if (isLoading) return <Skeleton className={cn("h-7 w-28 rounded-full", className)} />;
    if (isError || !data || !tone) return null;
    return (
      <button
        type="button"
        onClick={() => refetch()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
          tone.bg, tone.text, tone.ring, className,
        )}
        title="Crypto Fear & Greed Index"
      >
        <Activity className="w-3 h-3" />
        {tone.label} · {data.current.value}
      </button>
    );
  }

  if (variant === "compact") {
    if (isLoading) {
      return (
        <Card className={cn("p-3 flex items-center gap-3", className)}>
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </Card>
      );
    }
    if (isError || !data || !tone) return null;
    return (
      <Card className={cn("p-3 flex items-center gap-3 border-border/80", className)}>
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold tabular-nums ring-1", tone.bg, tone.text, tone.ring)}>
          {data.current.value}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fear & Greed</p>
          <p className={cn("text-sm font-semibold", tone.text)}>{tone.label}</p>
          <DeltaBadge delta={data.delta} />
        </div>
        <div className="w-20 hidden sm:block">
          <HistoryBars history={data.history} />
        </div>
      </Card>
    );
  }

  // full
  if (isLoading) {
    return (
      <Card className={cn("p-5 space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-8 w-full" />
      </Card>
    );
  }

  if (isError || !data || !tone) {
    return (
      <Card className={cn("p-4 flex items-center justify-between gap-3", className)}>
        <p className="text-sm text-muted-foreground">Fear & Greed temporarily unavailable.</p>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </Card>
    );
  }

  const updated = new Date(data.current.timestamp * 1000);

  return (
    <Card className={cn("relative overflow-hidden border-border/80", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Crypto Fear & Greed
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Market sentiment · alternative.me
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>

        <div className="relative">
          <GaugeArc value={data.current.value} stroke={tone.stroke} />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center -mt-2">
            <motion.p
              key={data.current.value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("text-4xl font-bold tabular-nums tracking-tight", tone.text)}
            >
              {data.current.value}
            </motion.p>
            <p className={cn("text-sm font-semibold mt-0.5", tone.text)}>{tone.label}</p>
            <div className="mt-1">
              <DeltaBadge delta={data.delta} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
            <span>Extreme Fear</span>
            <span>Neutral</span>
            <span>Extreme Greed</span>
          </div>
          <HistoryBars history={data.history} />
          <p className="text-[10px] text-muted-foreground text-right pt-1">
            14-day history · Updated {updated.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
    </Card>
  );
}
