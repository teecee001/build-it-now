import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { ENTER } from "@/lib/motion";

type Phase = "idle" | "pending" | "done";

/**
 * Swipe-to-pay. Dragging the knob fills the track with a liquid gradient; releasing past
 * 85% calls onConfirm once (locked until it settles, so no double submits). The knob then
 * morphs into a spinner while pending, and into a checkmark if onConfirm resolves true.
 * Keyboard / screen-reader users get a normal button (Enter/Space) with the same label.
 */
export function SwipeToConfirm({
  label,
  onConfirm,
  disabled,
}: {
  label: string;
  onConfirm: () => Promise<boolean | void>;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const locked = useRef(false);
  const x = useMotionValue(0);
  const fill = useTransform(x, (v) => (max ? Math.min(1, (v + KNOB) / (max + KNOB)) : 0));
  const fillWidth = useTransform(fill, (f) => `${f * 100}%`);
  const labelOpacity = useTransform(fill, [0, 0.6], [1, 0]);

  useEffect(() => {
    const measure = () => setMax(Math.max(0, (track.current?.offsetWidth ?? 0) - KNOB - PAD * 2));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const fire = async () => {
    if (locked.current || disabled) return;
    locked.current = true;
    haptic("confirm");
    animate(x, max, reduce ? { duration: 0 } : ENTER);
    setPhase("pending");
    let ok: boolean | void = false;
    try {
      ok = await onConfirm();
    } finally {
      if (ok) {
        setPhase("done");
      } else {
        setPhase("idle");
        animate(x, 0, reduce ? { duration: 0 } : ENTER);
      }
      locked.current = false;
    }
  };

  const onDragEnd = () => {
    if (x.get() >= max * 0.85) void fire();
    else animate(x, 0, reduce ? { duration: 0 } : ENTER);
  };

  return (
    <div
      ref={track}
      className={`relative h-14 w-full select-none overflow-hidden rounded-full border border-border bg-secondary ${disabled ? "opacity-50" : ""}`}
      data-testid="swipe-to-confirm"
      data-phase={phase}
    >
      {/* liquid fill */}
      <motion.div
        aria-hidden
        className="swipe-liquid absolute inset-y-0 left-0 rounded-full"
        style={{ width: phase === "idle" ? fillWidth : "100%" }}
      />
      <motion.span
        aria-hidden
        style={{ opacity: phase === "idle" ? labelOpacity : 0 }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10 text-base font-semibold"
      >
        {label}
      </motion.span>
      <motion.button
        type="button"
        aria-label={label}
        disabled={disabled || phase !== "idle"}
        drag={disabled || phase !== "idle" ? false : "x"}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void fire();
          }
        }}
        style={{ x, width: KNOB, height: KNOB, top: PAD, left: PAD }}
        className="absolute z-10 flex touch-none items-center justify-center rounded-full bg-foreground text-background shadow-card"
      >
        {phase === "pending" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : phase === "done" ? (
          <motion.svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={ENTER} />
          </motion.svg>
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </motion.button>
    </div>
  );
}

const KNOB = 48;
const PAD = 3;
