import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowUpRight, ArrowDownLeft, Repeat, Gift, Landmark, Send, 
  CreditCard, Search, Filter, ShoppingBag, Percent
} from "lucide-react";
import { useState } from "react";

type Transaction = {
  id: string;
  type: "sent" | "received" | "deposit" | "cashback" | "purchase" | "conversion" | "interest";
  label: string;
  description: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
};

const TRANSACTIONS: Transaction[] = [
  { id: "1", type: "cashback", label: "Welcome Bonus", description: "X Money welcome gift", amount: 25.00, date: "Today, 2:30 PM", status: "completed" },
  { id: "2", type: "deposit", label: "Direct Deposit", description: "Employer - Acme Corp", amount: 2450.00, date: "Today, 9:00 AM", status: "completed" },
  { id: "3", type: "sent", label: "Sent to @sarah_k", description: "Split dinner bill", amount: -50.00, date: "Yesterday, 8:15 PM", status: "completed" },
  { id: "4", type: "received", label: "From @mike_r", description: "Concert tickets", amount: 75.00, date: "Yesterday, 3:00 PM", status: "completed" },
  { id: "5", type: "purchase", label: "Amazon.com", description: "Online purchase", amount: -89.99, date: "Mar 1, 11:30 AM", status: "completed" },
  { id: "6", type: "cashback", label: "Cashback Reward", description: "1% on Amazon purchase", amount: 0.90, date: "Mar 1, 11:30 AM", status: "completed" },
  { id: "7", type: "interest", label: "APY Interest", description: "Monthly savings interest", amount: 41.25, date: "Feb 28, 12:00 AM", status: "completed" },
  { id: "8", type: "conversion", label: "USD → BTC", description: "Crypto purchase", amount: -200.00, date: "Feb 27, 4:00 PM", status: "completed" },
  { id: "9", type: "sent", label: "Sent to @creator_x", description: "Creator tip", amount: -10.00, date: "Feb 27, 2:00 PM", status: "completed" },
  { id: "10", type: "purchase", label: "Starbucks", description: "Card purchase", amount: -5.85, date: "Feb 26, 8:00 AM", status: "completed" },
  { id: "11", type: "cashback", label: "Cashback Reward", description: "3% dining at Starbucks", amount: 0.18, date: "Feb 26, 8:00 AM", status: "completed" },
  { id: "12", type: "deposit", label: "Bank Transfer", description: "From Chase ****4521", amount: 500.00, date: "Feb 25, 10:00 AM", status: "completed" },
  { id: "13", type: "sent", label: "Bill Payment", description: "Electric Company", amount: -120.00, date: "Feb 24, 9:00 AM", status: "completed" },
  { id: "14", type: "received", label: "From @lisa_t", description: "Rent share", amount: 850.00, date: "Feb 23, 12:00 PM", status: "completed" },
];

const TYPE_CONFIG: Record<string, { icon: typeof Send; color: string; bg: string }> = {
  sent: { icon: ArrowUpRight, color: "text-foreground", bg: "bg-secondary" },
  received: { icon: ArrowDownLeft, color: "text-success", bg: "bg-success/10" },
  deposit: { icon: Landmark, color: "text-success", bg: "bg-success/10" },
  cashback: { icon: Gift, color: "text-warning", bg: "bg-warning/10" },
  purchase: { icon: ShoppingBag, color: "text-foreground", bg: "bg-secondary" },
  conversion: { icon: Repeat, color: "text-accent", bg: "bg-accent/10" },
  interest: { icon: Percent, color: "text-success", bg: "bg-success/10" },
};

export default function Activity() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = TRANSACTIONS.filter((t) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (search && !t.label.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIn = TRANSACTIONS.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = TRANSACTIONS.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground text-sm mt-1">All your transactions in one place</p>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-card border-border">
          <p className="text-xs text-muted-foreground">Money In</p>
          <p className="text-lg font-bold font-mono text-success">+${totalIn.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-xs text-muted-foreground">Money Out</p>
          <p className="text-lg font-bold font-mono">-${totalOut.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </Card>
      </motion.div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", "sent", "received", "deposit", "purchase", "cashback", "interest"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {filtered.map((tx, i) => {
          const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.sent;
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.bg}`}>
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{tx.description} · {tx.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold font-mono ${tx.amount >= 0 ? "text-success" : "text-foreground"}`}>
                      {tx.amount >= 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
        )}
      </div>
    </div>
  );
}
