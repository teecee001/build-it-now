import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: C.bg }, pad]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={pad}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, i = 0 }: { children: ReactNode; style?: ViewStyle; i?: number }) {
  return <Animated.View entering={enter(i)} style={[ui.card, style]}>{children}</Animated.View>;
}

export const Title = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <Animated.View entering={enter(0)} style={{ marginBottom: 16 }}>
    <Text style={ui.title}>{children}</Text>
    {sub ? <Text style={ui.muted}>{sub}</Text> : null}
  </Animated.View>
);

export const ui = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12 },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  h2: { color: C.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  text: { color: C.text, fontSize: 15 },
  muted: { color: C.muted, fontSize: 13 },
  input: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, color: C.text, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginBottom: 10 },
  btn: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnT: { color: C.bg, fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  banner: { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  bannerT: { color: '#FCA5A5', fontSize: 14 },
});
