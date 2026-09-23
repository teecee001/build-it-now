import { formatDistanceToNow } from "date-fns";
import {
  Bell, ArrowDownLeft, ArrowUpRight, Gift, CreditCard, Landmark, Repeat, Percent, Info,
} from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";

const NOTIF_ICONS: Record<string, typeof Info> = {
  deposit: ArrowDownLeft,
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  cashback: Gift,
  welcome_bonus: Gift,
  interest: Percent,
  bill_payment: Landmark,
  conversion: Repeat,
  purchase: CreditCard,
};

export function notifIcon(notif: Notification) {
  const txType = (notif.metadata as { tx_type?: string } | null)?.tx_type;
  return NOTIF_ICONS[txType || notif.type] || Info;
}

export function notifAmount(notif: Notification): number | null {
  const raw = (notif.metadata as { amount?: unknown } | null)?.amount;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function NotificationList({
  items,
  onOpen,
  empty = "You're all caught up",
}: {
  items: Notification[];
  onOpen: (n: Notification) => void;
  empty?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
          <Bell className="w-5 h-5 opacity-50" />
        </div>
        <p className="text-sm font-medium text-foreground">{empty}</p>
        <p className="text-xs mt-1">Payments, rewards, and alerts will land here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((notif) => {
        const Icon = notifIcon(notif);
        const amount = notifAmount(notif);
        const isPositive = amount !== null && amount > 0;
        return (
          <li key={notif.id}>
            <button
              type="button"
              onClick={() => onOpen(notif)}
              className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-secondary/50 transition-colors ${
                !notif.is_read ? "bg-primary/5" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isPositive ? "bg-emerald-500/10" : "bg-secondary"
              }`}>
                <Icon className={`w-4 h-4 ${isPositive ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className={`text-sm leading-snug ${!notif.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                    {notif.title}
                  </p>
                  {!notif.is_read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              {amount !== null && (
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                  isPositive ? "text-emerald-500" : "text-foreground"
                }`}>
                  {isPositive ? "+" : ""}${Math.abs(amount).toFixed(2)}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
