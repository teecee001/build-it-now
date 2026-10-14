import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ExoMark } from '@/components/ExoMark';
import { DECELERATE, DUR } from '@/lib/motion';
import { C } from '@/lib/theme';

/** Splash: the ΞX mark zooms through the screen, then the app shows. */
export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    const finish = () => {
      'worklet';
      runOnJS(onDone)();
    };
    p.value = withDelay(reduced ? 0 : 250, withTiming(1, { duration: reduced ? 120 : DUR.complex + 250, easing: DECELERATE }, finish));
  }, [p, onDone, reduced]);
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + p.value * p.value * 14 }], opacity: 1 - p.value }));
  const bg = useAnimatedStyle(() => ({ opacity: 1 - p.value * p.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.c, bg]}>
      <Animated.View style={mark}>
        <ExoMark size={84} />
      </Animated.View>
    </Animated.View>
  );
}
const s = StyleSheet.create({ c: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 } });
