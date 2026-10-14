import { AnimatePresence, motion } from "framer-motion";
import { ENTER, EXIT } from "@/lib/motion";

/** Glassmorphic shimmer laid over a card while an external operation is pending. */
export function PendingGlass({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden
          data-testid="pending-glass"
          className="glass-pending"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: ENTER }}
          exit={{ opacity: 0, transition: EXIT }}
        />
      )}
    </AnimatePresence>
  );
}
