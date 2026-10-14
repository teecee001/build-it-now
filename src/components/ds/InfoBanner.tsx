import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ENTER, EXIT } from "@/lib/motion";

type Banner = { id: number; text: string };
let listeners: Array<(b: Banner) => void> = [];
let seq = 0;

/** Show a calm amber drop-down banner (used for errors instead of toasts). */
export function showBanner(text: string) {
  const b = { id: ++seq, text };
  listeners.forEach((l) => l(b));
  return b.id;
}

let patched = false;
/** Route sonner's toast.error to the banner, keeping the exact message text. */
export function routeErrorToastsToBanner() {
  if (patched) return;
  patched = true;
  const t = toast as unknown as { error: (msg: unknown, opts?: unknown) => string | number };
  t.error = (msg: unknown) => showBanner(typeof msg === "string" ? msg : String(msg ?? ""));
}

export function InfoBannerHost() {
  const [banner, setBanner] = useState<Banner | null>(null);
  useEffect(() => {
    const l = (b: Banner) => setBanner(b);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner((b) => (b?.id === banner.id ? null : b)), 5000);
    return () => clearTimeout(id);
  }, [banner]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(56px+env(safe-area-inset-top))] z-[60] flex justify-center px-4 md:top-4">
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            role="alert"
            data-testid="info-banner"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: ENTER }}
            exit={{ opacity: 0, y: -12, transition: EXIT }}
            onClick={() => setBanner(null)}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card border border-warning/40 bg-[color-mix(in_srgb,hsl(var(--warning))_12%,hsl(var(--card)))] px-4 py-3 text-sm text-foreground shadow-card"
          >
            <AlertCircle className="calm-pulse h-5 w-5 shrink-0 text-warning" aria-hidden />
            <span className="min-w-0 flex-1">{banner.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
