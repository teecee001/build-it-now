import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions } from "@/hooks/useTransactions";
import { StatementExport } from "@/components/StatementExport";
import { EmptyState } from "@/components/EmptyState";
import { 
  ArrowUpRight, ArrowDownLeft, Repeat, Gift, Landmark, Send, 
  CreditCard, Search, ShoppingBag, Percent, Loader2, Download, Receipt
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: typeof Send; color: string; bg: string }> = {
  send: { icon: ArrowUpRight, color: "text-foreground", bg: "bg-secondary" },
  receive: { icon: ArrowDownLeft, color: "text-success", bg: "bg-success/10" },
  deposit: { icon: Landmark, color: "text-success", bg: "bg-success/10" },
  cashback: { icon: Gift, color: "text-warning", bg: "bg-warning/10" },
  purchase: { icon: ShoppingBag, color: "text-foreground", bg: "bg-secondary" },
  conversion: { icon: Repeat, color: "text-accent", bg: "bg-accent/10" },
  interest: { icon: Percent, color: "text-success", bg: "bg-success/10" },
  bill_payment: { icon: Landmark, color: "text-foreground", bg: "bg-secondary" },
  welcome_bonus: { icon: Gift, color: "text-warning", bg: "bg-warning/10" },
  withdrawal: { icon: ArrowUpRight, color: "text-foreground", bg: "bg-secondary" },
};

export default function Activity() {
  const { transactions, isLoading, totalIn, totalOut } = useTransactions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showExport, setShowExport] = useState(false);

  const filtered = transactions.filter((t) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(t.description?.toLowerCase().includes(s) || t.recipient?.toLowerCase().includes(s) || t.type.includes(s))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
            <p className="text-muted-foreground text-sm mt-1">All your transactions in one place</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowExport(true)} className="gap-1">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
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

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-secondary border-border" />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", "send", "receive", "deposit", "purchase", "cashback", "interest", "bill_payment"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, i) => {
            const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.send;
            const amount = Number(tx.amount);
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.bg}`}>
                      <config.icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.recipient ? `To ${tx.recipient} · ` : ""}
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold font-mono ${amount >= 0 ? "text-success" : "text-foreground"}`}>
                        {amount >= 0 ? "+" : "-"}${Math.abs(amount).toFixed(2)}
                      </p>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{tx.status}</Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
          {filtered.length === 0 && transactions.length === 0 && (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your transaction history will appear here once you make your first deposit, send money, or trade."
              actionLabel="Make a Deposit"
              actionPath="/deposit"
            />
          )}
          {filtered.length === 0 && transactions.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No matching transactions
            </p>
          )}
        </div>
      )}

      <StatementExport open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}
