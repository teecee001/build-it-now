import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { PageSkeleton } from "@/components/ui/skeleton";

const SendMoney = lazy(() => import("@/pages/SendMoney"));
const Deposit = lazy(() => import("@/pages/Deposit"));
const MultiCurrencyWallet = lazy(() => import("@/pages/MultiCurrencyWallet"));

export type QuickAction = "send" | "add" | "convert";
const TITLES: Record<QuickAction, string> = { send: "Send", add: "Add", convert: "Convert" };

/** Mobile bottom sheet that hosts the existing Send / Add / Convert pages unchanged. */
export function QuickActionSheet({ action, onClose }: { action: QuickAction | null; onClose: () => void }) {
  const location = useLocation();
  // Any navigation from inside the sheet (e.g. "Scan QR") closes it.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <Drawer open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent aria-describedby={undefined} className="max-h-[92dvh] rounded-t-sheet shadow-sheet">
        <DrawerTitle className="sr-only">{action ? TITLES[action] : ""}</DrawerTitle>
        <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <Suspense fallback={<PageSkeleton />}>
            {action === "send" && <SendMoney />}
            {action === "add" && <Deposit />}
            {action === "convert" && <MultiCurrencyWallet mode="convert" />}
          </Suspense>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
