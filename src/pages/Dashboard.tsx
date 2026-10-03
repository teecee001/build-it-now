import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCurrency } from "@/hooks/useActiveCurrency";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useGeoVerification } from "@/hooks/useGeoVerification";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { TravelMode } from "@/components/TravelMode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, ArrowDownLeft, Repeat, TrendingUp, TrendingDown, 
  Send, Bot, CreditCard, Gift, Landmark, PiggyBank,
  DollarSign, Percent, Eye, EyeOff, Loader2, BarChart3, QrCode,
  RefreshCw, Globe, CheckCircle2, XCircle, Briefcase, Bitcoin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";

const TX_ICON_MAP: Record<string, typeof Send> = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  deposit: Landmark,
  withdrawal: ArrowUpRight,
  purchase: CreditCard,
  cashback: Gift,
  interest: Percent,
  conversion: Repeat,
  bill_payment: Landmark,
  welcome_bonus: Gift,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { savingsBalance, isLoading: walletLoading } = useWallet();
  const { activeCurrency, activeBalance, activeSymbol, formatBalance, fromUSD, wallets } = useActiveCurrency();
  const { transactions, isLoading: txLoading } = useTransactions(5);
  const { rates, isLive } = useExchangeRates();
  const { isFeatureAvailable, geoStatus } = useGeoVerification();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const apyRate = 6.0;
  const monthlyEarnings = (savingsBalance * apyRate / 100 / 12);

  const totalInActiveCurrency = wallets.reduce((sum, w) => {
    const wRate = rates[w.currency] || 1;
    const usdValue = w.balance / wRate;
    return sum + (usdValue * (rates[activeCurrency] || 1));
  }, 0);

  const savingsInActive = fromUSD(savingsBalance);

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OnboardingTutorial />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{handle}</p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySwitcher compact />
            <button onClick={() => setShowBalance(!showBalance)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              {showBalance ? <Eye className="w-5 h-5 text-muted-foreground" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-6 bg-card border-border shadow-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
                {isLive ? "● Live" : "Demo"}
              </Badge>
            </div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold tracking-tight font-mono">
                {showBalance ? formatBalance(totalInActiveCurrency) : "••••••"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">{activeCurrency} Wallet</p>
                </div>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? formatBalance(activeBalance) : "••••"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors" onClick={() => navigate("/savings")}>
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? formatBalance(savingsInActive) : "••••"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1 gap-1.5" onClick={() => navigate("/send")}>
                <Send className="w-3.5 h-3.5" /> Send
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 gap-1.5" onClick={() => navigate("/deposit")}>
                <ArrowDownLeft className="w-3.5 h-3.5" /> Add
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 gap-1.5" onClick={() => navigate("/convert")}>
                <Repeat className="w-3.5 h-3.5" /> Convert
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <TravelMode />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/markets")}>
          <BarChart3 className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Markets</p>
          <p className="text-xs text-muted-foreground">Live prices</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/cards")}>
          <CreditCard className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">Cards</p>
          <p className="text-xs text-muted-foreground">Virtual & metal</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/savings")}>
          <PiggyBank className="w-5 h-5 text-success mb-2" />
          <p className="text-sm font-semibold">Savings</p>
          <p className="text-xs text-muted-foreground">{apyRate}% APY</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/qr")}>
          <QrCode className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-sm font-semibold">QR Pay</p>
          <p className="text-xs text-muted-foreground">Scan & pay</p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/transactions")}>
            See all
          </Button>
        </div>
        <Card className="divide-y divide-border border-border bg-card">
          {txLoading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No transactions yet</div>
          ) : (
            transactions.map((tx: any) => {
              const Icon = TX_ICON_MAP[tx.type] || Send;
              const isIn = ["receive", "deposit", "cashback", "interest", "welcome_bonus"].includes(tx.type);
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isIn ? "bg-success/15" : "bg-secondary"}`}>
                    <Icon className={`w-4 h-4 ${isIn ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.created_at ? formatDistanceToNow(new Date(tx.created_at), { addSuffix: true }) : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold font-mono ${isIn ? "text-success" : ""}`}>
                    {isIn ? "+" : "-"}{activeSymbol}{Math.abs(Number(tx.amount || 0)).toFixed(2)}
                  </p>
                </div>
              );
            })
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card
          className={`p-4 border-border transition-all ${isFeatureAvailable("features_bill_pay") ? "bg-card cursor-pointer hover:bg-secondary/50" : "bg-muted/20 cursor-not-allowed opacity-60"}`}
          onClick={() => isFeatureAvailable("features_bill_pay") && navigate("/bills")}
        >
          <div className="flex items-center gap-2 mb-2">
            <Landmark className={`w-5 h-5 ${isFeatureAvailable("features_bill_pay") ? "text-primary" : "text-muted-foreground"}`} />
            {!isFeatureAvailable("features_bill_pay") && <XCircle className="w-3 h-3 text-muted-foreground ml-auto" />}
          </div>
          <p className="text-sm font-semibold">Pay Bills</p>
          <p className="text-xs text-muted-foreground">Utilities & more</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/advisor")}>
          <Bot className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Exo</p>
          <p className="text-xs text-muted-foreground">Exo Intelligence</p>
        </Card>
        <Card
          className={`p-4 border-border transition-all ${isFeatureAvailable("features_crypto") ? "bg-card cursor-pointer hover:bg-secondary/50" : "bg-muted/20 cursor-not-allowed opacity-60"}`}
          onClick={() => isFeatureAvailable("features_crypto") && navigate("/wallet")}
        >
          <div className="flex items-center gap-2 mb-2">
            <Bitcoin className={`w-5 h-5 ${isFeatureAvailable("features_crypto") ? "text-warning" : "text-muted-foreground"}`} />
            {!isFeatureAvailable("features_crypto") && <XCircle className="w-3 h-3 text-muted-foreground ml-auto" />}
          </div>
          <p className="text-sm font-semibold">Crypto</p>
          <p className="text-xs text-muted-foreground">Trade digital assets</p>
        </Card>
        <Card
          className={`p-4 border-border transition-all ${isFeatureAvailable("features_stocks") ? "bg-card cursor-pointer hover:bg-secondary/50" : "bg-muted/20 cursor-not-allowed opacity-60"}`}
          onClick={() => isFeatureAvailable("features_stocks") && navigate("/stocks")}
        >
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className={`w-5 h-5 ${isFeatureAvailable("features_stocks") ? "text-success" : "text-muted-foreground"}`} />
            {!isFeatureAvailable("features_stocks") && <XCircle className="w-3 h-3 text-muted-foreground ml-auto" />}
          </div>
          <p className="text-sm font-semibold">Stocks</p>
          <p className="text-xs text-muted-foreground">Invest in markets</p>
        </Card>
      </motion.div>
    </div>
  );
}
