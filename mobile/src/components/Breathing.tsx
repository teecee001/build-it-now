import { useEffect, type ReactNode } from 'react';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** Slow breathing loop (scale + glow) used for the Exo avatar and the lock ring. */
export function Breathing({ children, amount = 0.06, period = 2400 }: { children: ReactNode; amount?: number; period?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true);
  }, [t, period]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * amount }], opacity: 0.85 + t.value * 0.15 }));
  return <Animated.View style={st}>{children}</Animated.View>;
}
