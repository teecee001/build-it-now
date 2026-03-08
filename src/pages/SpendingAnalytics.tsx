import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/hooks/useTransactions";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Utensils,
  Plane, Fuel, Landmark, Gift, CreditCard, Repeat, Loader2, BarChart3,
  ArrowDownLeft, ArrowUpRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, isAfter } from "date-fns";

const CATEGORY_MAP: Record<string, { label: string; icon: typeof ShoppingBag; color: string }> = {
  send: { label: "Transfers Out", icon: ArrowUpRight, color: "hsl(0, 72%, 51%)" },
  purchase: { label: "Shopping", icon: ShoppingBag, color: "hsl(280, 70%, 55%)" },
  bill_payment: { label: "Bills", icon: Landmark, color: "hsl(38, 92%, 50%)" },
  withdrawal: { label: "Withdrawals", icon: DollarSign, color: "hsl(200, 70%, 50%)" },
  conversion: { label: "Conversions", icon: Repeat, color: "hsl(180, 60%, 45%)" },
};

const PIE_COLORS = [
  "hsl(0, 72%, 51%)", "hsl(280, 70%, 55%)", "hsl(38, 92%, 50%)",
  "hsl(200, 70%, 50%)", "hsl(180, 60%, 45%)", "hsl(142, 71%, 45%)",
];

type TimeRange = "7d" | "30d" | "all";

export default function SpendingAnalytics() {
  const { transactions, isLoading, totalIn, totalOut } = useTransactions();
  const [range, setRange] = useState<TimeRange>("30d");

  const filtered = useMemo(() => {
    if (range === "all") return transactions;
    const cutoff = subDays(new Date(), range === "7d" ? 7 : 30);
    return transactions.filter((t) => isAfter(new Date(t.created_at), cutoff));
  }, [transactions, range]);

  const spending = useMemo(() => filtered.filter((t) => Number(t.amount) < 0), [filtered]);
  const income = useMemo(() => filtered.filter((t) => Number(t.amount) > 0), [filtered]);

  const totalSpending = spending.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    spending.forEach((t) => {
      const cat = t.type || "other";
      map.set(cat, (map.get(cat) || 0) + Math.abs(Number(t.amount)));
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({
        name: CATEGORY_MAP[key]?.label || key,
        value: Math.round(value * 100) / 100,
        type: key,
      }))
      .sort((a, b) => b.value - a.value);
  }, [spending]);

  // Weekly bar chart
  const weeklyData = useMemo(() => {
    const weeks = new Map<string, { spent: number; earned: number }>();
    const now = new Date();
    // Create last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const label = format(weekStart, "MMM d");
      weeks.set(label, { spent: 0, earned: 0 });
    }

    filtered.forEach((t) => {
      const weekStart = startOfWeek(new Date(t.created_at));
      const label = format(weekStart, "MMM d");
      const entry = weeks.get(label);
      if (entry) {
        const amt = Number(t.amount);
        if (amt < 0) entry.spent += Math.abs(amt);
        else entry.earned += amt;
      }
    });

    return Array.from(weeks.entries()).map(([name, data]) => ({
      name,
      spent: Math.round(data.spent * 100) / 100,
      earned: Math.round(data.earned * 100) / 100,
    }));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Spending Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Understand where your money goes</p>
      </motion.div>

      {/* Time Range */}
      <div className="flex gap-2">
        {(["7d", "30d", "all"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === r ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
            </div>
            <p className="text-xs text-muted-foreground">Income</p>
          </div>
          <p className="text-xl font-bold font-mono text-success">
            +${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground">Spending</p>
          </div>
          <p className="text-xl font-bold font-mono text-destructive">
            -${totalSpending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </motion.div>

      {/* Net flow */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="p-4 bg-card border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalIncome - totalSpending >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">Net Flow</span>
          </div>
          <span className={`text-lg font-bold font-mono ${totalIncome - totalSpending >= 0 ? "text-success" : "text-destructive"}`}>
            {totalIncome - totalSpending >= 0 ? "+" : "-"}$
            {Math.abs(totalIncome - totalSpending).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </Card>
      </motion.div>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Spending by Category</h3>
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 5).map((cat, i) => {
                  const info = CATEGORY_MAP[cat.type];
                  const pct = totalSpending > 0 ? Math.round((cat.value / totalSpending) * 100) : 0;
                  return (
                    <div key={cat.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium">${cat.value.toFixed(2)}</span>
                        <Badge className="bg-secondary text-muted-foreground border-0 text-[10px] px-1.5 py-0">{pct}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Weekly Trend */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Weekly Trend</h3>
        <Card className="p-5 bg-card border-border">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(240, 5%, 50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 6% 10%)",
                    border: "1px solid hsl(240 4% 16%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(0 0% 95%)" }}
                />
                <Bar dataKey="earned" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Earned" />
                <Bar dataKey="spent" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Top transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Largest Expenses</h3>
        <div className="space-y-2">
          {spending.slice(0, 5).map((tx) => (
            <Card key={tx.id} className="p-3 bg-card border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tx.description || tx.type}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <p className="text-sm font-semibold font-mono text-destructive">
                -${Math.abs(Number(tx.amount)).toFixed(2)}
              </p>
            </Card>
          ))}
          {spending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No spending data yet</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
