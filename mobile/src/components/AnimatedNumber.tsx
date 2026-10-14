import { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Balance roll-up: counts from the previous value to the new one (~700ms ease-out). Reduced motion: no count. */
export function AnimatedNumber({ value, format, style }: { value: number; format: (n: number) => string; style?: TextStyle | TextStyle[] }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced) {
      from.current = value;
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    let raf = requestAnimationFrame(function tick() {
      const k = Math.min(1, (Date.now() - t0) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(start + (value - start) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    });
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <Text style={[{ fontVariant: ['tabular-nums'] }, style as TextStyle]}>{format(reduced ? value : shown)}</Text>;
}
