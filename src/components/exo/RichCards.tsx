import { motion } from "framer-motion";
import { CalendarDays, ExternalLink, ShieldCheck, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { useWallet } from "@/hooks/useWallet";
import { useAccountTier } from "@/hooks/useAccountTier";
import { apyForBoost, mentionedTickers, projectSeries, parseAllocation, parseItinerary, parseProducts, type ExoMode } from "@/lib/exoChat";

/** Tiny SVG sparkline; flat line when there's no data. */
export function Sparkline({ data, up = true, className = "h-8 w-24", fill = true }: { data: number[]; up?: boolean; className?: string; fill?: boolean }) {
  const pts = data.filter((n) => Number.isFinite(n));
  if (pts.length < 2) return <svg className={className} viewBox="0 0 100 30" aria-hidden="true"><line x1="0" y1="15" x2="100" y2="15" stroke="currentColor" strokeOpacity="0.25" /></svg>;
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * 100, 28 - ((v - min) / span) * 26] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const color = up ? "hsl(152 76% 45%)" : "hsl(0 72% 60%)";
  const id = `g${Math.round(pts[0] * 1000) % 100000}${pts.length}${up ? "u" : "d"}`;
  return (
    <svg className={className} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L100,30 L0,30 Z`} fill={`url(#${id})`} />}
      <motion.path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
    </svg>
  );
}

const fmt = (n: number) => (n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));

/** Live quote cards for tickers Exo mentions. Prices come from market data, never from the text. */
export function QuoteCards({ text }: { text: string }) {
  const tickers = mentionedTickers(text);
  const crypto = useMarketData("crypto");
  const stocks = useMarketData("stocks");
  // Only tickers with a live quote get a card: no placeholder cards, no guessed prices.
  const live = tickers
    .map(({ symbol, cls }) => ({ symbol, q: cls === "crypto" ? crypto.getCrypto(symbol) : stocks.getStock(symbol) }))
    .filter((t) => t.q && Number.isFinite(t.q.price) && t.q.price > 0);
  if (!live.length) return null;
  return (
    <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {live.map(({ symbol, q }) => {
        const up = (q?.changePct ?? 0) >= 0;
        return (
          <div key={symbol} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-foreground">{symbol}</div>
              <div className="font-mono text-[13px] tabular-nums text-foreground/90">{q ? `$${fmt(q.price)}` : "—"}</div>
            </div>
            <Sparkline data={q?.spark ?? []} up={up} className="h-7 flex-1" />
            <div className={`flex items-center gap-0.5 font-mono text-xs tabular-nums ${q ? (up ? "text-emerald-400" : "text-red-400") : "text-muted-foreground"}`}>
              {q ? (up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />) : null}
              {q ? `${up ? "+" : ""}${q.changePct.toFixed(2)}%` : "n/a"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Governor allocation card: weights as bars, 1x leverage badge. */
export function AllocationCard({ text }: { text: string }) {
  const rows = parseAllocation(text);
  if (!rows.length) return null;
  const palette = ["bg-emerald-400", "bg-teal-400", "bg-lime-300", "bg-emerald-700", "bg-cyan-400"];
  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.07] to-black/40">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">Governor</span>
        <span className="ml-auto rounded-full border border-emerald-500/30 px-2 py-0.5 font-mono text-[11px] text-emerald-300">1x leverage</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden">
        {rows.map((r, i) => (
          <motion.div key={r.symbol} className={palette[i % palette.length]} initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.7, delay: i * 0.08 }} />
        ))}
      </div>
      <ul className="space-y-1 px-3 py-2.5">
        {rows.map((r, i) => (
          <li key={r.symbol} className="flex items-center gap-2 text-[13px]">
            <span className={`h-2 w-2 rounded-full ${palette[i % palette.length]}`} />
            <span className="font-semibold">{r.symbol}</span>
            {r.note && <span className="truncate text-xs text-muted-foreground">{r.note}</span>}
            <span className="ml-auto font-mono tabular-nums">{r.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Calendar-style itinerary for Life plans. */
export function ItineraryCard({ text }: { text: string }) {
  const rows = parseItinerary(text);
  if (!rows.length) return null;
  return (
    <div className="mt-2.5 rounded-xl border border-lime-300/20 bg-gradient-to-b from-lime-300/[0.06] to-black/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-lime-200">
        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Itinerary
      </div>
      <ol className="relative space-y-2.5 border-l border-lime-300/25 pl-4">
        {rows.map((r, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-black bg-lime-300" />
            <div className="text-xs font-semibold text-lime-100">{r.label}</div>
            <div className="text-[13px] text-foreground/85">{r.text}</div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** Product cards for Life shopping replies. */
export function ProductCards({ text }: { text: string }) {
  const items = parseProducts(text);
  if (!items.length) return null;
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-1.5">
      {items.map((p) => (
        <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className="group flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-black/40 p-2.5 no-underline transition hover:border-lime-300/40">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShoppingBag className="h-3 w-3" aria-hidden="true" />{p.host}</span>
          <span className="line-clamp-2 text-[13px] font-medium text-foreground">{p.title}</span>
          <span className="mt-auto flex items-center justify-between">
            <span className="font-mono text-sm text-lime-200">{p.price ?? "See price"}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
          </span>
        </a>
      ))}
    </div>
  );
}

/** All rich cards for one Exo message, by mode. */
const usd = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Money snapshot: only when Exo's reply is about the user's balance or savings, and only with real numbers. */
export function MoneyCard({ text }: { text: string }) {
  const { balance, savingsBalance } = useWallet();
  const { config } = useAccountTier();
  if (!/\b(balance|savings|apy|net worth|cash on hand)\b/i.test(text)) return null;
  const savings = Number(savingsBalance || 0);
  const total = Number(balance || 0) + savings;
  if (!(total > 0)) return null;
  const apy = apyForBoost(config?.apyBoost);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Total</div>
          <div className="font-mono text-2xl font-semibold tabular-nums">{usd(total)}</div>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-xs text-emerald-300">{apy}% APY</span>
      </div>
      {savings > 0 && (
        <>
          <Sparkline data={projectSeries(savings, apy, 12)} className="mt-2 h-12 w-full" />
          <div className="text-[11px] text-muted-foreground">12-month projection</div>
        </>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Balance </span><b className="font-mono tabular-nums">{usd(balance)}</b></div>
        <div><span className="text-muted-foreground">Savings </span><b className="font-mono tabular-nums">{usd(savings)}</b></div>
      </div>
    </motion.div>
  );
}

export function RichCards({ text, mode }: { text: string; mode: ExoMode }) {
  return (
    <>
      <AllocationCard text={text} />
      {mode === "money" ? <MoneyCard text={text} /> : null}
      {mode === "life" ? <ItineraryCard text={text} /> : null}
      {mode === "life" ? <ProductCards text={text} /> : <QuoteCards text={text} />}
    </>
  );
}

