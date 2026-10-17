import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useWallet } from "@/hooks/useWallet";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useGeoVerification } from "@/hooks/useGeoVerification";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { TravelMode } from "@/components/TravelMode";
import { Card } from "@/components/ui/card";
import {
  ArrowDownLeft, Repeat, Send, Bot, CreditCard, Landmark, PiggyBank,
  Eye, EyeOff, X, BarChart3, QrCode, XCircle, Briefcase, Bitcoin, LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LiveBadge } from "@/components/ds/LiveBadge";
import { useEffect, useMemo, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { formatAmount } from "@/lib/formatTransaction";
import { ENTER, EXIT, COMPLEX, STAGGER } from "@/lib/motion";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionRow } from "@/components/TransactionRow";
import { PageSkeleton, RowsSkeleton } from "@/components/ui/skeleton";
import { openAppMenu } from "@/lib/appMenu";
import { AnimatedNumber } from "@/components/ds/AnimatedNumber";
import { Sparkline } from "@/components/ds/Sparkline";
import { QuickActionSheet, type QuickAction } from "@/components/ds/QuickActionSheet";
import { balanceSeries } from "@/lib/balanceHistory";
import { useIsMobile } from "@/hooks/use-mobile";

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: ENTER },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { savingsBalance, isLoading: walletLoading } = useWallet();
  const { activeCurrency, formatBalance, fromUSD, wallets } = useActiveCurrency();
  const { rates, isLive } = useExchangeRates();
  const { isFeatureAvailable } = useGeoVerification();
  const { transactions: recentTx, isLoading: txLoading } = useTransactions(8);
  const recent = recentTx.filter((t) => t.type !== "welcome_bonus").slice(0, 4);
  const { transactions: historyTx } = useTransactions(50);
  const isMobile = useIsMobile();
  const [sheet, setSheet] = useState<QuickAction | null>(null);
  const navigate = useNavigate();
  // Hide-balance preference, persisted on this device.
  const [showBalance, setShowBalanceState] = useState(() => {
    try { return localStorage.getItem("exo.hideBalance") !== "1"; } catch { return true; }
  });
  const setShowBalance = (v: boolean) => {
    haptic("tap");
    setShowBalanceState(v);
    try { localStorage.setItem("exo.hideBalance", v ? "0" : "1"); } catch { /* private mode */ }
  };
  const mask = (node: React.ReactNode) => (
    <span className="balance-mask inline-block" data-hidden={!showBalance} aria-hidden={!showBalance}>{node}</span>
  );

  const { profile } = useProfile();
  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const totalInActiveCurrency = wallets.reduce((sum, w) => {
    const wRate = rates[w.currency] || 1;
    const usdValue = w.balance / wRate;
    return sum + usdValue * (rates[activeCurrency] || 1);
  }, 0);

  const savingsInActive = fromUSD(savingsBalance);

  const walletCards = [...wallets].sort((a, b) => (a.currency === activeCurrency ? -1 : b.currency === activeCurrency ? 1 : 0));
  const carouselRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);
  const fmtWallet = (cur: string) => (n: number) => (cur === activeCurrency ? formatBalance(n) : formatAmount(n, cur));
  // Start at the active wallet whenever the wallet list (re)loads.
  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0 });
    setSlide(0);
  }, [wallets.length, activeCurrency]);
  const onCarouselScroll = () => {
    const el = carouselRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    setSlide(Math.round(el.scrollLeft / (first.offsetWidth + 12)));
  };

  // Sparkline from recorded transactions only; empty (no chart) when history can't support it.
  const series = useMemo(() => {
    const walletCodes = new Set(wallets.map((w) => w.currency));
    return balanceSeries(historyTx, totalInActiveCurrency, (amount, cur) =>
      walletCodes.has(cur) && rates[cur] ? (amount / rates[cur]) * (rates[activeCurrency] || 1) : null,
    );
  }, [historyTx, totalInActiveCurrency, rates, activeCurrency, wallets]);

  if (walletLoading) {
    return <PageSkeleton />;
  }

  // Existing feature shortcuts (same labels/subtitles as before), shown compactly.
  const shortcuts = [
    { label: "Markets", sub: "Live prices", icon: BarChart3, tint: "text-accent", path: "/markets" },
    { label: "Cards", sub: "Virtual & metal", icon: CreditCard, tint: "text-primary", path: "/card" },
    { label: "Savings", sub: "Projection only", icon: PiggyBank, tint: "text-success", path: "/savings" },
    { label: "QR Pay", sub: "Scan & pay", icon: QrCode, tint: "text-muted-foreground", path: "/qr" },
    { label: "Pay Bills", sub: "Utilities & more", icon: Landmark, tint: "text-primary", path: "/bills", feature: "features_bill_pay" },
    { label: "Exo", sub: "Exo Intelligence", icon: Bot, tint: "text-accent", path: "/exo" },
    { label: "Crypto", sub: "Trade digital assets", icon: Bitcoin, tint: "text-warning", path: "/wallet", feature: "features_crypto" },
    { label: "Stocks", sub: "Invest in markets", icon: Briefcase, tint: "text-success", path: "/stocks", feature: "features_stocks" },
  ];

  const quickActions = [
    { label: "Send", icon: Send, onClick: () => (isMobile ? setSheet("send") : navigate("/send")), primary: true },
    { label: "Add", icon: ArrowDownLeft, onClick: () => (isMobile ? setSheet("add") : navigate("/deposit")) },
    { label: "Convert", icon: Repeat, onClick: () => (isMobile ? setSheet("convert") : navigate("/convert")) },
    { label: "More", icon: LayoutGrid, onClick: openAppMenu, mobileOnly: true },
  ];

  const expandedWallet = walletCards.find((w) => w.currency === expanded);
  const expandedTx = expanded
    ? historyTx.filter((t) => (t.currency || "USD").toUpperCase() === expanded && t.type !== "welcome_bonus").slice(0, 5)
    : [];

  return (
    <>
    {/* Shared-element expansion: the tapped wallet card grows into its full view. */}
    <AnimatePresence>
      {expandedWallet && (
        <>
          <motion.div
            key="wallet-backdrop"
            className="fixed inset-0 z-[55] bg-background/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: ENTER }}
            exit={{ opacity: 0, transition: EXIT }}
            onClick={() => setExpanded(null)}
          />
          <motion.div
            key="wallet-full"
            layoutId={`wallet-card-${expandedWallet.currency}`}
            transition={COMPLEX}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-full-title"
            className="fixed inset-x-4 top-[calc(72px+env(safe-area-inset-top))] z-[56] mx-auto max-w-md rounded-card border border-border bg-card p-6 shadow-card-hover md:top-24"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <motion.p layoutId={`wallet-label-${expandedWallet.currency}`} id="wallet-full-title" className="text-sm text-muted-foreground">
                  {expandedWallet.currency} Wallet
                </motion.p>
                <motion.p layoutId={`wallet-amt-${expandedWallet.currency}`} className="text-figure font-mono tabular-nums">
                  {mask(<AnimatedNumber value={expandedWallet.balance} format={fmtWallet(expandedWallet.currency)} />)}
                </motion.p>
              </div>
              <button onClick={() => setExpanded(null)} className="rounded-lg p-2 hover:bg-secondary" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <motion.div
              className="mt-4 space-y-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER, delayChildren: 0.12 } } }}
            >
              {expandedTx.map((tx) => (
                <motion.div key={tx.id} variants={STAGGER_ITEM}>
                  <TransactionRow tx={tx} />
                </motion.div>
              ))}
              <motion.div variants={STAGGER_ITEM} className="flex justify-end pt-1">
                <button onClick={() => navigate("/activity")} className="text-sm font-medium text-accent">
                  See all
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <motion.div
      className="space-y-6"
      animate={expanded ? { opacity: 0.35, y: 16, scale: 0.99 } : { opacity: 1, y: 0, scale: 1 }}
      transition={expanded ? COMPLEX : ENTER}
      aria-hidden={expanded ? true : undefined}
    >
      <QuickActionSheet action={sheet} onClose={() => setSheet(null)} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-title">{displayName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{handle}</p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySwitcher compact />
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {showBalance ? (
                <Eye className="w-5 h-5 text-muted-foreground" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.025 }}
      >
        <Card className="p-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <LiveBadge isLive={isLive} />
            </div>
            <h2 className="text-figure font-mono tabular-nums">
              {mask(<AnimatedNumber value={totalInActiveCurrency} format={formatBalance} />)}
            </h2>
            {series.length > 0 && (
              <div className="balance-mask" data-hidden={!showBalance}>
                <Sparkline points={series} className="mt-2 h-8 w-full" />
              </div>
            )}

            {/* Swipe/snap carousel of currency wallets (active first), then Savings. */}
            <div ref={carouselRef} onScroll={onCarouselScroll} className="snap-carousel -mx-6 mt-4 flex gap-3 overflow-x-auto px-6 pb-1">
              {walletCards.map((w) => (
                <motion.button
                  type="button"
                  key={w.currency}
                  layoutId={`wallet-card-${w.currency}`}
                  onClick={() => setExpanded(w.currency)}
                  style={{ visibility: expanded === w.currency ? "hidden" : "visible" }}
                  className={`w-[46%] shrink-0 p-3 rounded-lg text-left transition-colors ${w.currency === activeCurrency ? "bg-secondary" : "bg-secondary/50"}`}
                >
                  <motion.p layoutId={`wallet-label-${w.currency}`} className="text-xs text-muted-foreground">{w.currency} Wallet</motion.p>
                  <motion.p layoutId={`wallet-amt-${w.currency}`} className="text-sm font-semibold font-mono">
                    {mask(<AnimatedNumber value={w.balance} format={fmtWallet(w.currency)} />)}
                  </motion.p>
                </motion.button>
              ))}
              <div
                className="w-[46%] shrink-0 p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => navigate("/savings")}
              >
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className="text-sm font-semibold font-mono">
                  {mask(formatBalance(savingsInActive))}
                </p>
              </div>
            </div>
            {walletCards.length + 1 > 2 && (
              <div className="mt-2 flex justify-center gap-1" aria-hidden="true">
                {[...walletCards.map((w) => w.currency), "savings"].map((k, i) => (
                  <span key={k} className={`h-1 rounded-full transition-all duration-base ${i === slide ? "w-4 bg-foreground/70" : "w-1 bg-foreground/25"}`} />
                ))}
              </div>
            )}

          </div>
        </Card>
      </motion.div>

      {/* Quick actions (Revolut-style round buttons) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-4 md:flex md:gap-6 gap-2"
      >
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex flex-col items-center gap-2 ${a.mobileOnly ? "md:hidden" : ""}`}
          >
            <span
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                a.primary ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20" : "bg-secondary text-foreground"
              }`}
            >
              <a.icon className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium">{a.label}</span>
          </button>
        ))}
      </motion.div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Recent activity */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.075 }}
          className="space-y-2 min-w-0"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-heading">Activity</h2>
            <button onClick={() => navigate("/activity")} className="text-sm font-medium text-accent">
              See all
            </button>
          </div>
          {txLoading ? (
            <RowsSkeleton rows={3} />
          ) : recent.length ? (
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER, delayChildren: 0.06 } } }}
            >
              {recent.map((tx) => (
                <motion.button variants={STAGGER_ITEM} key={tx.id} onClick={() => navigate("/activity")} className="block w-full min-w-0 text-left">
                  <TransactionRow tx={tx} />
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <Card className="p-4 bg-card border-border text-sm text-muted-foreground">
              Your transaction history will appear here once you make your first deposit, send money, or trade.
            </Card>
          )}
        </motion.section>

        {/* Feature shortcuts */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 min-w-0"
        >
          <motion.div
            className="grid grid-cols-2 gap-2"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER, delayChildren: 0.08 } } }}
          >
            {shortcuts.map((sc) => {
              const available = !sc.feature || isFeatureAvailable(sc.feature as Parameters<typeof isFeatureAvailable>[0]);
              return (
                <motion.button
                  key={sc.label}
                  variants={STAGGER_ITEM}
                  onClick={() => available && navigate(sc.path)}
                  disabled={!available}
                  className={`flex items-center gap-3 p-3 rounded-card border border-border text-left ${
                    available ? "bg-card hover:bg-secondary/50" : "bg-muted/20 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-secondary/70 flex items-center justify-center shrink-0">
                    {available ? (
                      <sc.icon className={`w-4 h-4 ${sc.tint}`} />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{sc.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{sc.sub}</span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
          <TravelMode />
        </motion.section>
      </div>
    </motion.div>
    </>
  );
}
