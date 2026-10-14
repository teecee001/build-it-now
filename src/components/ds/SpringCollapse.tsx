import { AnimatePresence, motion } from "framer-motion";
import { EXIT } from "@/lib/motion";

const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.8 } as const;

/** Expands/collapses its children with a spring on height (reduced motion via MotionConfig). */
export function SpringCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { height: SPRING, opacity: { duration: 0.2 } } }}
          exit={{ height: 0, opacity: 0, transition: EXIT }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
