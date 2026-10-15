import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutUp, ReduceMotion, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { M3_EMPHASIZED, IS_IOS, SPRING } from '@/lib/motion';
import { C } from '@/lib/theme';
import { subscribeToasts, type ToastItem } from '@/lib/toast';

const enterAnim = IS_IOS
  ? SlideInUp.springify().stiffness(SPRING.stiffness).damping(SPRING.damping).reduceMotion(ReduceMotion.System)
  : SlideInUp.duration(280).easing(M3_EMPHASIZED).reduceMotion(ReduceMotion.System);

/** Calm top banner for toasts (errors use the same InfoBanner treatment as the web). */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(
    () =>
      subscribeToasts((t) => {
        if (t.kind === 'error') haptic.error();
        else if (t.kind === 'success') haptic.success();
        setItems((xs) => [...xs.slice(-2), t]);
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.kind === 'error' ? 5000 : 3200);
      }),
    [],
  );
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 6, zIndex: 80 }]}>
      {items.map((t) => (
        <Animated.View key={t.id} entering={enterAnim} exiting={FadeOutUp.duration(200)} style={[s.t, t.kind === 'error' && s.err]}>
          <Pressable accessibilityRole="alert" onPress={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} style={s.row}>
            <Ionicons
              name={t.kind === 'error' ? 'information-circle' : t.kind === 'success' ? 'checkmark-circle' : 'information-circle-outline'}
              size={18}
              color={t.kind === 'error' ? '#FCA5A5' : C.green}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t.title}</Text>
              {t.description ? <Text style={s.desc}>{t.description}</Text> : null}
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  t: { marginHorizontal: 12, marginBottom: 8, borderRadius: 16, backgroundColor: '#141416', borderWidth: 1, borderColor: C.border, padding: 12 },
  err: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: '#1a1011' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title: { color: C.text, fontSize: 14, fontWeight: '600' },
  desc: { color: C.muted, fontSize: 13, marginTop: 2 },
});
