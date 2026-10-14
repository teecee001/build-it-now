import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { NotificationList } from "@/components/NotificationList";

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const items = useMemo(
    () => (tab === "unread" ? notifications.filter((n) => !n.is_read) : notifications),
    [tab, notifications],
  );

  const open = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    navigate("/activity");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => clearAll.mutate()}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-card bg-secondary/40 w-fit">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "all" ? "bg-background shadow-card" : "text-muted-foreground"}`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "unread" ? "bg-background shadow-card" : "text-muted-foreground"}`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <NotificationList
            items={items}
            onOpen={open}
            empty={tab === "unread" ? "No unread notifications" : "No notifications yet"}
          />
        )}
      </Card>

      {notifications.length === 0 && !isLoading && (
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
          <Bell className="w-3.5 h-3.5" />
          Alerts for sends, bonuses, and conversions show up here.
        </p>
      )}
    </div>
  );
}
