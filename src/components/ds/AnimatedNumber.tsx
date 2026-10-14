import { DECELERATE } from "@/lib/motion";
import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** 300ms decelerating roll-up/down to `value` when it changes; renders the final value immediately with reduced motion. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value || !Number.isFinite(from)) {
      setShown(value);
      return;
    }
    const controls = animate(from, value, { duration: 0.3, ease: DECELERATE, onUpdate: setShown });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{format(shown)}</>;
}
