import { useEffect, useRef, useState } from "react";

/**
 * Wraps a live price. When `value` changes it plays a short green (up) or red (down)
 * background flash via a CSS class (no remount, so no flicker). Reduced motion: no flash.
 */
export function PriceTick({ value, children, className = "" }: { value: number; children: React.ReactNode; className?: string }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (Number.isFinite(prev.current) && Number.isFinite(value) && value !== prev.current && prev.current !== 0) {
      setDir(value > prev.current ? "up" : "down");
      setN((x) => x + 1);
    }
    prev.current = value;
  }, [value]);
  return (
    <span
      // alternate class names restart the CSS animation without remounting the node
      className={`price-tick ${dir ? `price-tick-${dir}-${n % 2}` : ""} ${className}`}
      data-tick={dir ?? undefined}
    >
      {children}
    </span>
  );
}
