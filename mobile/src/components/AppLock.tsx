import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { ExoMark } from '@/components/ExoMark';
import { haptic } from '@/lib/haptics';
import { biometricLabel, unlock } from '@/lib/lock';
import { C } from '@/lib/theme';

/** Full-screen biometric lock with a pulsing ring. Shown only when the user opted in. */
export function AppLock({ onUnlocked }: { onUnlocked: () => void }) {
  const [label, setLabel] = useState('Face ID');
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }), -1, false);
    biometricLabel().then((l) => l && setLabel(l));
  }, [ring]);
  const go = useCallback(async () => {
    if (await unlock()) {
      haptic.success();
      onUnlocked();
    } else haptic.error();
  }, [onUnlocked]);
  useEffect(() => {
    go();
  }, [go]);
  const rs = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ring.value * 0.6 }], opacity: 0.6 * (1 - ring.value) }));
  return (
    <View style={[StyleSheet.absoluteFill, s.c]}>
      <View style={s.center}>
        <Animated.View style={[s.ring, rs]} />
        <ExoMark size={56} />
      </View>
      <Pressable accessibilityRole="button" onPress={go} style={s.btn}>
        <Text style={s.btnT}>{label}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  c: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', zIndex: 90 },
  center: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: C.green },
  btn: { marginTop: 40, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: C.green },
  btnT: { color: C.green, fontWeight: '600', fontSize: 16 },
});
