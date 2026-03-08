import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSavings } from "@/hooks/useSavings";
import {
  PiggyBank, ArrowRightLeft, TrendingUp, Loader2,
  ArrowRight, Percent, DollarSign, Calendar, Shield
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

type TransferDirection = "to_savings" | "to_wallet";

export default function Savings() {
  const {
    apyRate, savingsBalance, walletBalance,
    monthlyEarnings, dailyEarnings, yearlyEarnings,
    projectBalance, transferToSavings, transferToWallet, isTransferring,
  } = useSavings();

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<TransferDirection>("to_savings");
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [monthlyContribution, setMonthlyContribution] = useState(0);

  const chartData = projectBalance(projectionMonths, monthlyContribution);
  const projectedEnd = chartData[chartData.length - 1];
  const totalProjectedInterest = projectedEnd?.interest ?? 0;

  const handleTransfer = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    if (direction === "to_savings") {
      await transferToSavings(num);
    } else {
      await transferToWallet(num);
    }
    setAmount("");
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <PiggyBank className="w-6 h-6 text-success" />
          <h1 className="text-2xl font-bold tracking-tight">Savings</h1>
          <Badge className="bg-success/10 text-success border-0 text-xs font-semibold">
            {apyRate}% APY
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">Grow your money with industry-leading yields</p>
      </motion.div>

      {/* Balance Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="p-6 bg-card border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-sm text-muted-foreground mb-1">Savings Balance</p>
            <h2 className="text-4xl font-bold tracking-tight font-mono">
              ${savingsBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </h2>

            {/* Earnings Breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-success" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily</p>
                </div>
                <p className="text-sm font-semibold font-mono text-success">
                  +${dailyEarnings.toFixed(4)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-success" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly</p>
                </div>
                <p className="text-sm font-semibold font-mono text-success">
                  +${monthlyEarnings.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Yearly</p>
                </div>
                <p className="text-sm font-semibold font-mono text-success">
                  +${yearlyEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Transfer Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card className="p-5 bg-card border-border space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Transfer Funds</h3>
          </div>

          {/* Direction Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("to_savings")}
              className={`p-3 rounded-lg text-sm font-medium transition-all ${
                direction === "to_savings"
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Wallet → Savings
            </button>
            <button
              onClick={() => setDirection("to_wallet")}
              className={`p-3 rounded-lg text-sm font-medium transition-all ${
                direction === "to_wallet"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Savings → Wallet
            </button>
          </div>

          {/* Available Balance */}
          <p className="text-xs text-muted-foreground">
            Available: <span className="font-mono font-medium text-foreground">
              ${(direction === "to_savings" ? walletBalance : savingsBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>

          {/* Amount Input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="pl-7 h-12 bg-secondary border-border text-lg font-mono"
            />
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2">
            {quickAmounts.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(qa.toString())}
                className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
              >
                ${qa}
              </button>
            ))}
            <button
              onClick={() => setAmount(
                (direction === "to_savings" ? walletBalance : savingsBalance).toString()
              )}
              className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
            >
              Max
            </button>
          </div>

          <Button
            onClick={handleTransfer}
            disabled={isTransferring || !amount || parseFloat(amount) <= 0}
            className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2 h-11"
          >
            {isTransferring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Transfer <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </Card>
      </motion.div>

      {/* Interest Projection Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
        <Card className="p-5 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <h3 className="text-sm font-semibold">Growth Projection</h3>
            </div>
            <div className="flex gap-1">
              {[6, 12, 24, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setProjectionMonths(m)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    projectionMonths === m
                      ? "bg-success/10 text-success"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m < 12 ? `${m}mo` : `${m / 12}yr`}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Contribution Slider */}
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground whitespace-nowrap">Monthly deposit:</p>
            <div className="flex gap-1">
              {[0, 50, 100, 250, 500].map((c) => (
                <button
                  key={c}
                  onClick={() => setMonthlyContribution(c)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    monthlyContribution === c
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ${c}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(240 5% 50%)" }}
                  tickFormatter={(v) => v % (projectionMonths <= 12 ? 3 : 12) === 0 ? `${v}mo` : ""}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(240 5% 50%)" }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 6% 8%)",
                    border: "1px solid hsl(240 4% 16%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                    name === "balance" ? "Balance" : "Interest Earned",
                  ]}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(142 71% 45%)"
                  fill="url(#savingsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Projection Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projected Balance</p>
              <p className="text-sm font-semibold font-mono">
                ${projectedEnd?.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/10">
              <p className="text-[10px] text-success uppercase tracking-wider">Total Interest Earned</p>
              <p className="text-sm font-semibold font-mono text-success">
                +${totalProjectedInterest.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* FDIC Notice */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="p-3 bg-secondary/30 border-border flex items-start gap-2">
          <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Deposits are held at our partner bank and eligible for FDIC insurance up to $250,000. APY is variable and may change. Interest is calculated daily and paid monthly.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
