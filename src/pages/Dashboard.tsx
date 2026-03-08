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
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const apyRate = 6.0;
  const monthlyEarnings = (savingsBalance * apyRate / 100 / 12);

  // Total balance across all currency wallets in active currency
  const totalInActiveCurrency = wallets.reduce((sum, w) => {
    const wRate = rates[w.currency] || 1;
    const usdValue = w.balance / wRate;
    return sum + (usdValue * (rates[activeCurrency] || 1));
  }, 0);

  // Savings in active currency
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
      {/* Header */}
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

      {/* Total Balance Card */}
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
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-success/10 text-success border-0">{apyRate}% APY</Badge>
                </div>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? formatBalance(savingsInActive) : "••••"}
                </p>
              </div>
            </div>

            {savingsBalance > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-success/5 border border-success/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-success" />
                  <span className="text-xs text-success">Monthly earnings</span>
                </div>
                <span className="text-xs font-mono font-semibold text-success">+{formatBalance(fromUSD(monthlyEarnings))}/mo</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 mt-5">
              <Button size="sm" className="flex-col h-auto py-3 bg-foreground text-background hover:bg-foreground/90 gap-1" onClick={() => navigate("/deposit")}>
                <ArrowDownLeft className="w-4 h-4" />
                <span className="text-[10px]">Deposit</span>
              </Button>
              <Button size="sm" variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate("/send")}>
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-[10px]">Send</span>
              </Button>
              <Button size="sm" variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate("/send")}>
                <DollarSign className="w-4 h-4" />
                <span className="text-[10px]">Request</span>
              </Button>
              <Button size="sm" variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate("/markets")}>
                <Repeat className="w-4 h-4" />
                <span className="text-[10px]">Convert</span>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Welcome Bonus */}
      {transactions.some(t => t.type === "welcome_bonus") && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">$25 Welcome Bonus</p>
              <p className="text-xs text-muted-foreground">Credited to your ExoSky wallet</p>
            </div>
            <Badge className="bg-warning/20 text-warning border-0 text-xs">Claimed</Badge>
          </Card>
        </motion.div>
      )}

      {/* Travel Mode */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
        <TravelMode />
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          <button onClick={() => navigate("/activity")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All →</button>
        </div>
        {txLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet. Make a deposit to get started!</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const Icon = TX_ICON_MAP[tx.type] || Send;
              const isPositiveAmount = Number(tx.amount) > 0;
              const displayAmount = Math.abs(Number(tx.amount)) * (rates[activeCurrency] || 1);
              return (
                <Card key={tx.id} className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isPositiveAmount ? "bg-success/10" : "bg-secondary"}`}>
                      <Icon className={`w-4 h-4 ${isPositiveAmount ? "text-success" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
                    </div>
                    <p className={`text-sm font-semibold font-mono ${isPositiveAmount ? "text-success" : "text-foreground"}`}>
                      {isPositiveAmount ? "+" : ""}{activeSymbol}{displayAmount.toFixed(2)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Feature Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/card")}>
          <CreditCard className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Debit Card</p>
          <p className="text-xs text-muted-foreground">Metal card by Visa</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/qr")}>
          <QrCode className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">QR Pay</p>
          <p className="text-xs text-muted-foreground">Scan & pay</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/currencies")}>
          <Globe className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Multi-Currency</p>
          <p className="text-xs text-muted-foreground">Hold & convert</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/recurring")}>
          <RefreshCw className="w-5 h-5 text-warning mb-2" />
          <p className="text-sm font-semibold">Recurring</p>
          <p className="text-xs text-muted-foreground">Auto payments</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/analytics")}>
          <BarChart3 className="w-5 h-5 text-warning mb-2" />
          <p className="text-sm font-semibold">Analytics</p>
          <p className="text-xs text-muted-foreground">Spending insights</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/rewards")}>
          <Gift className="w-5 h-5 text-warning mb-2" />
          <p className="text-sm font-semibold">Rewards</p>
          <p className="text-xs text-muted-foreground">Cashback & APY</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/bills")}>
          <Landmark className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">Pay Bills</p>
          <p className="text-xs text-muted-foreground">Utilities & more</p>
        </Card>
        <Card className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/advisor")}>
          <Bot className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">AI Advisor</p>
          <p className="text-xs text-muted-foreground">Smart insights</p>
        </Card>
      </motion.div>
    </div>
  );
}
