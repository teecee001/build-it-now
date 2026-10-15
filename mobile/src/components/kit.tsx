// Native building blocks mirroring the web design system (cards, buttons, inputs, badges,
// selects, segmented toggles) in the green-on-black theme. Entrances follow lib/motion.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { enter, IS_IOS, M3_EMPHASIZED, SPRING } from '@/lib/motion';
import { C } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export const AMBER = '#F59E0B';
export const SECONDARY = '#1C1C1F';

/** Stack screen with a back chevron header and scrolling body. */
export function PageHeader({ title, sub, right, back = true }: { title: string; sub?: string; right?: ReactNode; back?: boolean }) {
  return (
    <Animated.View entering={enter(0)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
      {back && (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} style={{ paddingTop: 4 }}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={k.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
        {sub ? <Text style={[k.muted, { marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      {right}
    </Animated.View>
  );
}

export function Page({ title, sub, children, right, scroll = true, back = true }: { title: string; sub?: string; children: ReactNode; right?: ReactNode; scroll?: boolean; back?: boolean }) {
  const insets = useSafeAreaInsets();
  const header = <PageHeader title={title} sub={sub} right={right} back={back} />;
  const pad = { paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: C.bg }, pad]}>{header}{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
      {header}
      {children}
    </ScrollView>
  );
}

export function Box({ children, style, i = 1, tint }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; i?: number; tint?: string }) {
  return (
    <Animated.View entering={enter(i)} style={[k.card, tint ? { borderColor: tint + '40', backgroundColor: tint + '12' } : null, style as ViewStyle]}>
      {children}
    </Animated.View>
  );
}

export function Btn({ label, onPress, icon, variant = 'primary', disabled, busy, style, small }: { label: string; onPress?: () => void; icon?: IconName; variant?: 'primary' | 'outline' | 'secondary' | 'danger'; disabled?: boolean; busy?: boolean; style?: ViewStyle; small?: boolean }) {
  const fg = variant === 'primary' ? C.bg : variant === 'danger' ? C.red : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={() => { haptic.tap(); onPress?.(); }}
      style={({ pressed }) => [
        k.btn,
        small && { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
        variant === 'primary' && { backgroundColor: C.text },
        variant === 'outline' && { borderWidth: 1, borderColor: C.border },
        variant === 'secondary' && { backgroundColor: SECONDARY },
        variant === 'danger' && { borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
        (disabled || busy) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={fg} /> : null}
          <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 13 : 15 }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...p }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <Text style={[k.muted, { marginBottom: 6, fontWeight: '500' }]}>{label}</Text> : null}
      <TextInput placeholderTextColor={C.muted} {...p} style={[k.input, p.editable === false && { opacity: 0.6 }, style]} />
    </View>
  );
}

export function Badge({ label, color = C.green, icon }: { label: string; color?: string; icon?: IconName }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '1A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, small }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => { haptic.tap(); onChange(o.value); }}
            style={[{ paddingHorizontal: small ? 8 : 12, paddingVertical: small ? 5 : 9, borderRadius: 10, backgroundColor: on ? C.green + '1F' : SECONDARY, borderWidth: 1, borderColor: on ? C.green + '40' : 'transparent' }, !small && { flexGrow: 1, alignItems: 'center' }]}>
            <Text style={{ color: on ? C.green : C.muted, fontSize: small ? 12 : 14, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bottom sheet that slides up (iOS spring / Android M3 emphasized). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const slide = IS_IOS
    ? SlideInDown.springify().stiffness(SPRING.stiffness).damping(SPRING.damping).reduceMotion(ReduceMotion.System)
    : SlideInDown.duration(320).easing(M3_EMPHASIZED).reduceMotion(ReduceMotion.System);
  return (
    <Modal transparent visible={open} onRequestClose={onClose} animationType="none" statusBarTranslucent>
      {open && (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
          </Animated.View>
          <Animated.View entering={slide} exiting={SlideOutDown.duration(200)} style={[k.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 12 }} />
            {title ? <Text style={[k.h2, { marginBottom: 12 }]}>{title}</Text> : null}
            {children}
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

/** Native replacement for the web <Select>: a trigger that opens a sheet of options. */
export function Select({ value, onChange, options, placeholder, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <View style={{ marginBottom: 10, flex: 1 }}>
      {label ? <Text style={[k.muted, { marginBottom: 6, fontWeight: '500' }]}>{label}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label ?? placeholder} onPress={() => setOpen(true)} style={[k.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ color: cur ? C.text : C.muted, fontSize: 15, flex: 1 }} numberOfLines={1}>{cur?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={C.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        <ScrollView style={{ maxHeight: 420 }}>
          {options.map((o) => (
            <Pressable key={o.value} accessibilityRole="button" onPress={() => { haptic.tap(); onChange(o.value); setOpen(false); }} style={[k.row, { paddingVertical: 14 }]}>
              <Text style={{ color: o.value === value ? C.green : C.text, fontSize: 15 }}>{o.label}</Text>
              {o.value === value ? <Ionicons name="checkmark" size={18} color={C.green} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={k.section}>{children}</Text>;
}

export function Stat({ label, value, color = C.text, icon, style }: { label: string; value: string; color?: string; icon?: IconName; style?: ViewStyle }) {
  return (
    <View style={[{ flex: 1, backgroundColor: SECONDARY + 'AA', borderRadius: 12, padding: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {icon ? <Ionicons name={icon} size={12} color={color === C.text ? C.muted : color} /> : null}
        <Text style={[k.caption]}>{label}</Text>
      </View>
      <Text style={{ color, fontWeight: '600', fontSize: 14, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

export function IconDot({ name, color = C.text, size = 40, bg }: { name: IconName; color?: string; size?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? SECONDARY, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.45} color={color} />
    </View>
  );
}

export function NavRow({ label, icon, onPress, right, sub }: { label: string; icon?: IconName; onPress?: () => void; right?: ReactNode; sub?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); onPress?.(); }} style={({ pressed }) => [k.row, pressed && { opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {icon ? <Ionicons name={icon} size={18} color={C.muted} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={k.text}>{label}</Text>
          {sub ? <Text style={k.muted}>{sub}</Text> : null}
        </View>
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={C.muted} />}
    </Pressable>
  );
}

export function Empty({ text, icon }: { text: string; icon?: IconName }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
      {icon ? <Ionicons name={icon} size={28} color={C.muted} /> : null}
      <Text style={[k.muted, { textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.green} />
    </View>
  );
}

export const T = ({ children, style, numberOfLines }: { children: ReactNode; style?: TextStyle | TextStyle[]; numberOfLines?: number }) => (
  <Text style={[k.text, style as TextStyle]} numberOfLines={numberOfLines}>{children}</Text>
);

export const k = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12 },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  h2: { color: C.text, fontSize: 17, fontWeight: '600' },
  h3: { color: C.text, fontSize: 14, fontWeight: '600' },
  text: { color: C.text, fontSize: 15 },
  muted: { color: C.muted, fontSize: 13 },
  caption: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  section: { color: C.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  mono: { fontVariant: ['tabular-nums'], fontWeight: '700' },
  input: { backgroundColor: SECONDARY, borderColor: C.border, borderWidth: 1, borderRadius: 12, color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  sheet: { backgroundColor: '#111113', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: C.border, padding: 16, maxHeight: '90%' },
  rowB: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
