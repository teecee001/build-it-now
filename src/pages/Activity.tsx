import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactions } from "@/hooks/useTransactions";
import { StatementExport } from "@/components/StatementExport";
import { EmptyState } from "@/components/EmptyState";
import { Search, Download, Receipt } from "lucide-react";
import { useState } from "react";
import { getTransactionTitle } from "@/lib/formatTransaction";
import { TransactionRow } from "@/components/TransactionRow";
import { RowsSkeleton } from "@/components/ui/skeleton";

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
            <h1 className="text-title">Activity</h1>
            <p className="text-sm text-muted-foreground">All wallet movements</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowExport(true)}>
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
        <div className="flex gap-2 overflow-x-auto">
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
        <RowsSkeleton rows={6} />
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, i) => {
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.02 }}
              >
                <TransactionRow tx={tx} />
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
