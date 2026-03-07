import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, ArrowDownLeft, Repeat, TrendingUp, TrendingDown, 
  Wallet, Send, Bot, CreditCard, Gift, Landmark, PiggyBank,
  DollarSign, Percent, Eye, EyeOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const PORTFOLIO_ASSETS = [
  { code: "BTC", name: "Bitcoin", symbol: "₿", allocation: 0.45 },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", allocation: 0.25 },
  { code: "SOL", name: "Solana", symbol: "◎", allocation: 0.15 },
  { code: "USDT", name: "Tether", symbol: "₮", allocation: 0.10 },
  { code: "XRP", name: "Ripple", symbol: "XRP", allocation: 0.05 },
];

const RECENT_ACTIVITY = [
  { type: "received", label: "Welcome Bonus", amount: 25.00, time: "Just now", icon: Gift },
  { type: "deposit", label: "Direct Deposit", amount: 2450.00, time: "2h ago", icon: Landmark },
  { type: "sent", label: "Sent to @sarah_k", amount: -50.00, time: "5h ago", icon: Send },
  { type: "cashback", label: "Cashback Reward", amount: 3.42, time: "1d ago", icon: Percent },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { rates, isLive } = useExchangeRates();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const handle = "@" + (user?.email?.split("@")[0] || "user");

  const walletBalance = 12_483.92;
  const savingsBalance = 8_250.00;
  const totalBalance = walletBalance + savingsBalance;
  const apyRate = 6.0;
  const monthlyEarnings = (savingsBalance * apyRate / 100 / 12);
  const change24h = 3.42;
  const isPositive = change24h >= 0;

  // Crypto portfolio
  const portfolioUSD = 4_097.55;

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
          <button onClick={() => setShowBalance(!showBalance)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            {showBalance ? <Eye className="w-5 h-5 text-muted-foreground" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
          </button>
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
                {showBalance ? `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••••"}
              </h2>
              <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{change24h}%
              </span>
            </div>

            {/* Balance Breakdown */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Wallet</p>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-success/10 text-success border-0">
                    {apyRate}% APY
                  </Badge>
                </div>
                <p className="text-sm font-semibold font-mono">
                  {showBalance ? `$${savingsBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••"}
                </p>
              </div>
            </div>

            {/* APY Earnings callout */}
            <div className="mt-3 p-3 rounded-lg bg-success/5 border border-success/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-success" />
                <span className="text-xs text-success">Monthly earnings</span>
              </div>
              <span className="text-xs font-mono font-semibold text-success">
                +${monthlyEarnings.toFixed(2)}/mo
              </span>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2 mt-5">
              <Button
                size="sm"
                className="flex-col h-auto py-3 bg-foreground text-background hover:bg-foreground/90 gap-1"
                onClick={() => navigate("/deposit")}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span className="text-[10px]">Deposit</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-col h-auto py-3 gap-1"
                onClick={() => navigate("/send")}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-[10px]">Send</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-col h-auto py-3 gap-1"
                onClick={() => navigate("/send")}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-[10px]">Request</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-col h-auto py-3 gap-1"
                onClick={() => navigate("/markets")}
              >
                <Repeat className="w-4 h-4" />
                <span className="text-[10px]">Convert</span>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Welcome Bonus */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">$25 Welcome Bonus</p>
            <p className="text-xs text-muted-foreground">Credited to your X Money wallet</p>
          </div>
          <Badge className="bg-warning/20 text-warning border-0 text-xs">Claimed</Badge>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          <button onClick={() => navigate("/activity")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-2">
          {RECENT_ACTIVITY.map((item, i) => (
            <Card key={i} className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  item.amount >= 0 ? "bg-success/10" : "bg-secondary"
                }`}>
                  <item.icon className={`w-4 h-4 ${item.amount >= 0 ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <p className={`text-sm font-semibold font-mono ${item.amount >= 0 ? "text-success" : "text-foreground"}`}>
                  {item.amount >= 0 ? "+" : ""}${Math.abs(item.amount).toFixed(2)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Assets */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Crypto Assets</h3>
          <button onClick={() => navigate("/wallet")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-2">
          {PORTFOLIO_ASSETS.slice(0, 3).map((asset, i) => {
            const priceUSD = rates[asset.code] ? 1 / rates[asset.code] : 0;
            const holdingUSD = portfolioUSD * asset.allocation;
            const holdingAmount = priceUSD > 0 ? holdingUSD / priceUSD : 0;
            const mockChange = ((Math.sin(i * 2.5) * 5) + 1.5).toFixed(2);
            const assetPositive = parseFloat(mockChange) >= 0;

            return (
              <Card
                key={asset.code}
                className="p-4 bg-card border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => navigate("/wallet")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                      {asset.symbol.length <= 2 ? asset.symbol : asset.code[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {holdingAmount > 0.001 ? holdingAmount.toFixed(4) : holdingAmount.toFixed(8)} {asset.code}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">${holdingUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-medium ${assetPositive ? "text-success" : "text-destructive"}`}>
                      {assetPositive ? "+" : ""}{mockChange}%
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/card")}
        >
          <CreditCard className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Debit Card</p>
          <p className="text-xs text-muted-foreground">Metal card by Visa</p>
        </Card>
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/rewards")}
        >
          <Gift className="w-5 h-5 text-warning mb-2" />
          <p className="text-sm font-semibold">Rewards</p>
          <p className="text-xs text-muted-foreground">Cashback & APY</p>
        </Card>
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/bills")}
        >
          <Landmark className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">Pay Bills</p>
          <p className="text-xs text-muted-foreground">Utilities & more</p>
        </Card>
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/advisor")}
        >
          <Bot className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">AI Advisor</p>
          <p className="text-xs text-muted-foreground">Smart insights</p>
        </Card>
      </motion.div>
    </div>
  );
}
