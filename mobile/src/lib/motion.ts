// Native port of the web motion spec (src/lib/motion.ts):
// iOS uses springs (stiffness 420, damping 36); Android uses M3 emphasized easing.
// Durations stay in the 200–350ms band; list items stagger by 25ms.
import { Platform } from 'react-native';
import { Easing, FadeInDown, FadeOut, ReduceMotion, withSpring, withTiming } from 'react-native-reanimated';

export const IS_IOS = Platform.OS === 'ios';
export const M3_EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);
export const DECELERATE = Easing.bezier(0, 0, 0.2, 1);
export const DUR = { exit: 200, enter: 280, complex: 350 } as const;
export const STAGGER_MS = 25;
export const SPRING = { stiffness: 420, damping: 36, mass: 1, reduceMotion: ReduceMotion.System } as const;

/** Platform-appropriate transition to a value; respects the OS reduced-motion setting. */
export function animateTo(value: number, duration: number = DUR.enter) {
  'worklet';
  return IS_IOS
    ? withSpring(value, SPRING)
    : withTiming(value, { duration, easing: M3_EMPHASIZED, reduceMotion: ReduceMotion.System });
}

/** Staggered list/section entrance. */
export const enter = (i = 0) => {
  const base = FadeInDown.delay(i * STAGGER_MS).reduceMotion(ReduceMotion.System);
  return IS_IOS
    ? base.springify().stiffness(SPRING.stiffness).damping(SPRING.damping)
    : base.duration(DUR.enter).easing(M3_EMPHASIZED);
};
export const exit = FadeOut.duration(DUR.exit).reduceMotion(ReduceMotion.System);
