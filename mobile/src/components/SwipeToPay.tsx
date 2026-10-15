import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { animateTo } from '@/lib/motion';
import { C } from '@/lib/theme';

const THUMB = 52;

/**
 * Swipe-to-pay. Double-submit protection: a latch is set synchronously on the
 * first confirm and only released after onConfirm settles, so a second swipe (or a
 * re-render mid-request) can never fire a second wallet-operation call.
 *
 * Crash safety: the pan callbacks run on the JS thread (`runOnJS(true)`), so the
 * UI-thread worklet runtime never has to capture/serialise the payment closure
 * (onConfirm -> query client, Supabase, PIN modal...). Every native or async call
 * (haptics, onConfirm, animations) is wrapped so a failure can't take the app down.
 */
export function SwipeToPay({ label, disabled, onConfirm }: { label: string; disabled?: boolean; onConfirm: () => Promise<void> }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const confirmRef = useRef(onConfirm);
  const [pending, setPending] = useState(false);
  const max = Math.max(0, w - THUMB - 8);

  useEffect(() => {
    confirmRef.current = onConfirm;
  }, [onConfirm]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const slide = (to: number) => {
    try {
      x.value = animateTo(to);
    } catch {
      x.value = to;
    }
  };

  const fire = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      haptic.success();
    } catch {
      /* haptics are best-effort */
    }
    try {
      await confirmRef.current();
    } catch {
      /* the caller surfaces its own errors; never let a rejection crash the app */
    } finally {
      busy.current = false;
      if (mounted.current) {
        setPending(false);
        slide(0);
      }
    }
  };
  const fireSafe = () => {
    fire().catch(() => undefined);
  };

  const pan = Gesture.Pan()
    .withTestId('swipe-pan')
    .runOnJS(true)
    .enabled(!disabled && !pending)
    .onUpdate((e) => {
      x.value = Math.min(max, Math.max(0, e.translationX));
    })
    // eslint-disable-next-line react-hooks/refs -- gesture callback runs on touch, not during render
    .onEnd(() => {
      if (max > 0 && x.value > max * 0.85) {
        slide(max);
        fireSafe();
      } else slide(0);
    });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB + 4 }));
  const txt = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.6 || 1], [1, 0]) }));

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => {
        if (!disabled) fireSafe();
      }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[s.track, (disabled || pending) && { opacity: 0.5 }]}>
      <Animated.View style={[s.fill, fill]} />
      <Animated.Text style={[s.label, txt]}>{label}</Animated.Text>
      <GestureDetector gesture={pan}>
        <Animated.View testID="swipe-thumb" style={[s.thumb, thumb]}>
          <Text style={s.arrow}>›</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
const s = StyleSheet.create({
  track: { height: THUMB + 8, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.25)' },
  label: { position: 'absolute', alignSelf: 'center', color: C.text, fontWeight: '600', fontSize: 16 },
  thumb: { position: 'absolute', left: 4, width: THUMB, height: THUMB, borderRadius: 999, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: C.bg, fontSize: 30, fontWeight: '800', marginTop: -3 },
});
