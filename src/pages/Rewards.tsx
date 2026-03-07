import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Percent, TrendingUp, Star, ShoppingBag, Zap, CreditCard } from "lucide-react";

const REWARDS_HISTORY = [
  { label: "Cashback - Coffee Shop", amount: 0.85, date: "Today", category: "Dining" },
  { label: "Cashback - Amazon", amount: 4.50, date: "Yesterday", category: "Shopping" },
  { label: "Referral Bonus", amount: 10.00, date: "Mar 1", category: "Bonus" },
  { label: "Cashback - Uber", amount: 1.20, date: "Feb 28", category: "Transport" },
  { label: "APY Interest Payment", amount: 41.25, date: "Feb 28", category: "Interest" },
  { label: "Cashback - Netflix", amount: 0.60, date: "Feb 27", category: "Entertainment" },
  { label: "Welcome Bonus", amount: 25.00, date: "Feb 25", category: "Bonus" },
];

const CASHBACK_CATEGORIES = [
  { name: "Dining", rate: "3%", icon: Star, color: "text-warning" },
  { name: "Shopping", rate: "2%", icon: ShoppingBag, color: "text-accent" },
  { name: "Travel", rate: "2%", icon: Zap, color: "text-primary" },
  { name: "Everything else", rate: "1%", icon: CreditCard, color: "text-muted-foreground" },
];

export default function Rewards() {
  const totalRewards = 83.40;
  const thisMonth = 17.15;
  const apyEarnings = 41.25;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
        <p className="text-muted-foreground text-sm mt-1">Cashback, APY interest, and bonuses</p>
      </motion.div>

      {/* Rewards Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-6 bg-card border-border shadow-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-warning" />
              <p className="text-sm text-muted-foreground">Total Rewards Earned</p>
            </div>
            <h2 className="text-3xl font-bold tracking-tight font-mono text-warning">
              ${totalRewards.toFixed(2)}
            </h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-sm font-semibold font-mono">${thisMonth.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">APY Earnings</p>
                <p className="text-sm font-semibold font-mono text-success">${apyEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* APY Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="p-5 bg-gradient-to-r from-success/10 to-success/5 border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-success" />
                <p className="text-sm font-semibold">High-Yield Savings</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Earn interest on your savings balance daily</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-success">6.00%</p>
              <p className="text-xs text-success/70">APY</p>
            </div>
          </div>
          <Button size="sm" className="mt-4 bg-success text-success-foreground hover:bg-success/90 w-full">
            Set Up Direct Deposit to Earn More
          </Button>
        </Card>
      </motion.div>

      {/* Cashback Rates */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cashback Rates</h3>
        <div className="grid grid-cols-2 gap-2">
          {CASHBACK_CATEGORIES.map((cat) => (
            <Card key={cat.name} className="p-3 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <cat.icon className={`w-4 h-4 ${cat.color}`} />
                <p className="text-xs text-muted-foreground">{cat.name}</p>
              </div>
              <p className="text-lg font-bold font-mono">{cat.rate}</p>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Rewards History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rewards History</h3>
        <div className="space-y-2">
          {REWARDS_HISTORY.map((item, i) => (
            <Card key={i} className="p-3 bg-card border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                    <Gift className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{item.category}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold font-mono text-success">+${item.amount.toFixed(2)}</p>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
