import { useState } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, CheckCheck, Trash2, ArrowDownLeft, ArrowUpRight,
  Gift, CreditCard, Landmark, Repeat, Percent, Info, X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

function getIcon(notif: Notification) {
  const txType = (notif.metadata as any)?.tx_type;
  return NOTIF_ICONS[txType] || Info;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 max-h-[70vh] bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => clearAll.mutate()}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      title="Clear all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const Icon = getIcon(notif);
                    const amount = (notif.metadata as any)?.amount;
                    const isPositive = amount && Number(amount) > 0;

                    return (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) markAsRead.mutate(notif.id);
                        }}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0 ${
                          !notif.is_read ? "bg-accent/5" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isPositive ? "bg-success/10" : "bg-secondary"
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${
                            isPositive ? "text-success" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {amount && (
                          <span className={`text-xs font-mono font-semibold shrink-0 mt-0.5 ${
                            isPositive ? "text-success" : "text-foreground"
                          }`}>
                            {isPositive ? "+" : ""}${Math.abs(Number(amount)).toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
