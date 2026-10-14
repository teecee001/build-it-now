import { StyleSheet, Text, type TextStyle } from 'react-native';
import { C } from '@/lib/theme';

/** The ΞX mark (same glyphs as public/favicon.svg). */
export function ExoMark({ size = 32, color = C.green, style }: { size?: number; color?: string; style?: TextStyle }) {
  return (
    <Text accessibilityLabel="ExoSky" style={[s.t, { fontSize: size, color, letterSpacing: -size * 0.04 }, style]}>
      Ξ╳
    </Text>
  );
}
const s = StyleSheet.create({ t: { fontWeight: '800', includeFontPadding: false } });
