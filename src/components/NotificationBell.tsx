import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { NotificationList } from "@/components/NotificationList";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  const goInbox = () => {
    setOpen(false);
    navigate("/notifications");
  };

  const onBell = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      goInbox();
      return;
    }
    if (location.pathname === "/notifications") return;
    setOpen(true);
  };

  const openItem = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    setOpen(false);
    navigate("/activity");
  };

  return (
    <>
      <button
        type="button"
        onClick={onBell}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 gap-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border text-left space-y-1">
            <div className="flex items-center justify-between pr-8">
              <SheetTitle className="text-lg">Notifications</SheetTitle>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Mark all read" onClick={() => markAllAsRead.mutate()}>
                    <CheckCheck className="w-4 h-4" />
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Clear all" onClick={() => clearAll.mutate()}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <NotificationList items={notifications} onOpen={openItem} />
          </div>

          <div className="border-t border-border p-3">
            <Button variant="secondary" className="w-full" onClick={goInbox}>
              Open inbox
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
