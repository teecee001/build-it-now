import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, Repeat, Gift, Landmark, Send, ShoppingBag, Percent } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Transaction } from "@/hooks/useTransactions";
import { formatTxAmount, getTransactionTitle, getConversionDisplay, getCounterpartyLabel } from "@/lib/formatTransaction";

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

/** One transaction line, shared by Activity and the dashboard's recent activity. */
export function TransactionRow({ tx }: { tx: Transaction }) {
  const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.send;
  const title = getTransactionTitle(tx);
  const conversion = tx.type === "conversion" ? getConversionDisplay(tx) : null;
  const amount = formatTxAmount(tx);
  return (
      <Card className="p-3 bg-card border-border hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.bg}`}>
            <config.icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {conversion ? `${conversion.detail} · ` : ""}
              {tx.recipient ? `${getCounterpartyLabel(tx)} · ` : ""}
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
            <Badge variant="secondary" className="text-caption px-1 py-0">
              {tx.status}
            </Badge>
          </div>
        </div>
      </Card>
  );
}
