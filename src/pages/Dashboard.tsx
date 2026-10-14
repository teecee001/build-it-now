import { motion } from "framer-motion";
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
  Eye, EyeOff, BarChart3, QrCode, XCircle, Briefcase, Bitcoin, LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionRow } from "@/components/TransactionRow";
import { PageSkeleton, RowsSkeleton } from "@/components/ui/skeleton";
import { openAppMenu } from "@/lib/appMenu";

export default function Dashboard() {
  const { user } = useAuth();
  const { savingsBalance, isLoading: walletLoading } = useWallet();
  const { activeCurrency, activeBalance, formatBalance, fromUSD, wallets } = useActiveCurrency();
  const { rates, isLive } = useExchangeRates();
  const { isFeatureAvailable } = useGeoVerification();
  const { transactions: recentTx, isLoading: txLoading } = useTransactions(8);
  const recent = recentTx.filter((t) => t.type !== "welcome_bonus").slice(0, 4);
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  const { profile } = useProfile();
  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const apyRate = 6.0;

  const totalInActiveCurrency = wallets.reduce((sum, w) => {
    const wRate = rates[w.currency] || 1;
    const usdValue = w.balance / wRate;
    return sum + usdValue * (rates[activeCurrency] || 1);
  }, 0);

  const savingsInActive = fromUSD(savingsBalance);

  if (walletLoading) {
    return <PageSkeleton />;
  }

  // Existing feature shortcuts (same labels/subtitles as before), shown compactly.
  const shortcuts = [
    { label: "Markets", sub: "Live prices", icon: BarChart3, tint: "text-accent", path: "/markets" },
    { label: "Cards", sub: "Virtual & metal", icon: CreditCard, tint: "text-primary", path: "/card" },
    { label: "Savings", sub: `${apyRate}% APY`, icon: PiggyBank, tint: "text-success", path: "/savings" },
    { label: "QR Pay", sub: "Scan & pay", icon: QrCode, tint: "text-muted-foreground", path: "/qr" },
    { label: "Pay Bills", sub: "Utilities & more", icon: Landmark, tint: "text-primary", path: "/bills", feature: "features_bill_pay" },
    { label: "Exo", sub: "Exo Intelligence", icon: Bot, tint: "text-accent", path: "/advisor" },
    { label: "Crypto", sub: "Trade digital assets", icon: Bitcoin, tint: "text-warning", path: "/wallet", feature: "features_crypto" },
    { label: "Stocks", sub: "Invest in markets", icon: Briefcase, tint: "text-success", path: "/stocks", feature: "features_stocks" },
  ];

  const quickActions = [
    { label: "Send", icon: Send, onClick: () => navigate("/send"), primary: true },
    { label: "Add", icon: ArrowDownLeft, onClick: () => navigate("/deposit") },
    { label: "Convert", icon: Repeat, onClick: () => navigate("/convert") },
    { label: "More", icon: LayoutGrid, onClick: openAppMenu, mobileOnly: true },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
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
        transition={{ delay: 0.05 }}
      >
        <Card className="p-6 bg-card border-border shadow-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
                {isLive ? "● Live" : "Demo"}
              </Badge>
            </div>
            <h2 className="text-4xl font-bold tracking-tight font-mono">
              {showBalance ? formatBalance(totalInActiveCurrency) : "••••••"}
            </h2>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">{activeCurrency} Wallet</p>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? formatBalance(activeBalance) : "••••"}
                </p>
              </div>
              <div
                className="p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => navigate("/savings")}
              >
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? formatBalance(savingsInActive) : "••••"}
                </p>
              </div>
            </div>

          </div>
        </Card>
      </motion.div>

      {/* Quick actions (Revolut-style round buttons) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-4 md:flex md:gap-6 gap-2"
      >
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex flex-col items-center gap-1.5 ${a.mobileOnly ? "md:hidden" : ""}`}
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
          transition={{ delay: 0.12 }}
          className="space-y-2 min-w-0"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Activity</h2>
            <button onClick={() => navigate("/activity")} className="text-sm font-medium text-accent">
              See all
            </button>
          </div>
          {txLoading ? (
            <RowsSkeleton rows={3} />
          ) : recent.length ? (
            <div className="space-y-2">
              {recent.map((tx) => (
                <button key={tx.id} onClick={() => navigate("/activity")} className="block w-full min-w-0 text-left">
                  <TransactionRow tx={tx} />
                </button>
              ))}
            </div>
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
          transition={{ delay: 0.16 }}
          className="space-y-3 min-w-0"
        >
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map((sc) => {
              const available = !sc.feature || isFeatureAvailable(sc.feature as Parameters<typeof isFeatureAvailable>[0]);
              return (
                <button
                  key={sc.label}
                  onClick={() => available && navigate(sc.path)}
                  disabled={!available}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-border text-left ${
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
                </button>
              );
            })}
          </div>
          <TravelMode />
        </motion.section>
      </div>
    </div>
  );
}
