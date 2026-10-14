import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Animated success checkmark: the ring draws, then the tick. Static when reduced motion is on. */
export function SuccessCheck({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce
      ? { initial: { pathLength: 1 }, animate: { pathLength: 1 } }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.45, delay, ease: "easeOut" as const },
        };
  return (
    <motion.svg
      viewBox="0 0 52 52"
      className={cn("w-20 h-20 text-success", className)}
      initial={reduce ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.5 }}
      role="img"
      aria-hidden="true"
    >
      <motion.circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <motion.circle
        cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        style={{ rotate: -90, transformOrigin: "50% 50%" }}
        {...draw(0)}
      />
      <motion.path
        d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        {...draw(0.35)}
      />
    </motion.svg>
  );
}
