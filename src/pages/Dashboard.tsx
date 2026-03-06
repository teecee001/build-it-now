import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, Repeat, TrendingUp, TrendingDown, Wallet, Send, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const PORTFOLIO_ASSETS = [
  { code: "BTC", name: "Bitcoin", symbol: "₿", allocation: 0.45 },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", allocation: 0.25 },
  { code: "SOL", name: "Solana", symbol: "◎", allocation: 0.15 },
  { code: "USDT", name: "Tether", symbol: "₮", allocation: 0.10 },
  { code: "XRP", name: "Ripple", symbol: "XRP", allocation: 0.05 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { rates, isLive } = useExchangeRates();
  const navigate = useNavigate();
  
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Simulated portfolio value based on live rates
  const portfolioUSD = 24_831.47;
  const change24h = 3.42;
  const isPositive = change24h >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
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
                ${portfolioUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h2>
              <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}{change24h}%
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                size="sm"
                className="flex-1 bg-foreground text-background hover:bg-foreground/90 gap-2"
                onClick={() => navigate("/send")}
              >
                <ArrowUpRight className="w-4 h-4" /> Send
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => navigate("/wallet")}
              >
                <ArrowDownLeft className="w-4 h-4" /> Receive
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => navigate("/markets")}
              >
                <Repeat className="w-4 h-4" /> Convert
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Assets */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Assets</h3>
          <button onClick={() => navigate("/wallet")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-2">
          {PORTFOLIO_ASSETS.map((asset, i) => {
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/wallet")}
        >
          <Wallet className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold">Wallet</p>
          <p className="text-xs text-muted-foreground">Manage your crypto portfolio</p>
        </Card>
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/send")}
        >
          <Send className="w-5 h-5 text-warning mb-2" />
          <p className="text-sm font-semibold">Send Money</p>
          <p className="text-xs text-muted-foreground">Transfer to anyone, anywhere</p>
        </Card>
        <Card 
          className="p-4 bg-card border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate("/advisor")}
        >
          <Bot className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold">AI Advisor</p>
          <p className="text-xs text-muted-foreground">Get smart financial insights</p>
        </Card>
      </motion.div>
    </div>
  );
}
