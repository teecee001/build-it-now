import { motion, useReducedMotion } from "framer-motion";
import { M3_EMPHASIZED } from "@/lib/motion";

/**
 * Chart entrance: the plot is revealed left→right (clip-path) while it settles vertically
 * with a slight overshoot; Y-axis labels fade in staggered (CSS .chart-reveal).
 */
export function ChartReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`chart-reveal ${className}`}
      initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", scaleY: 0.92 }}
      animate={{ clipPath: "inset(0 0% 0 0)", scaleY: 1 }}
      transition={{
        clipPath: { duration: 0.35, ease: M3_EMPHASIZED },
        scaleY: { type: "spring", stiffness: 260, damping: 14, mass: 0.7 },
      }}
      style={{ transformOrigin: "50% 100%" }}
    >
      {children}
    </motion.div>
  );
}
