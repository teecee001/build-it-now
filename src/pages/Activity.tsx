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
  Search, ShoppingBag, Percent, Loader2, Download, Receipt,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { formatTxAmount, getTransactionTitle, getConversionDisplay } from "@/lib/formatTransaction";

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
  const { transactions, isLoading } = useTransactions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showExport, setShowExport] = useState(false);

  const filtered = transactions.filter((t) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const title = getTransactionTitle(t).toLowerCase();
      if (
        !(title.includes(s) ||
          t.description?.toLowerCase().includes(s) ||
          t.recipient?.toLowerCase().includes(s) ||
          t.type.includes(s))
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
            <p className="text-sm text-muted-foreground">All wallet movements</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowExport(true)}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity"
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {["all", "deposit", "send", "receive", "conversion", "welcome_bonus"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "secondary"}
              className="shrink-0 capitalize"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, i) => {
            const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.send;
            const title = getTransactionTitle(tx);
            const conversion = tx.type === "conversion" ? getConversionDisplay(tx) : null;
            const amount = formatTxAmount(tx);
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
                      <p className="text-sm font-medium truncate">{title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversion ? `${conversion.detail} · ` : ""}
                        {tx.recipient ? `To ${tx.recipient} · ` : ""}
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right shrink-0 max-w-[45%]">
                      <p
                        className={`text-sm font-semibold font-mono leading-snug ${
                          amount.tone === "in"
                            ? "text-success"
                            : amount.tone === "neutral"
                              ? "text-foreground text-xs sm:text-sm"
                              : "text-foreground"
                        }`}
                      >
                        {amount.text}
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
            <p className="text-sm text-muted-foreground text-center py-8">No matching transactions</p>
          )}
        </div>
      )}

      <StatementExport open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}
