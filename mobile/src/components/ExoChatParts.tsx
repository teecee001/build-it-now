import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, type ReactNode } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Breathing } from '@/components/Breathing';
import { ExoMark } from '@/components/ExoMark';
import { ui } from '@/components/ui';
import { excerpt, type ChatThread, type LinkPreview } from '@/lib/exo';
import { haptic } from '@/lib/haptics';
import { animateTo } from '@/lib/motion';
import { C } from '@/lib/theme';

/** Green presence dot that softly pulses (Telegram "online"). */
export function PresenceDot({ size = 11 }: { size?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }), -1, false);
  }, [t]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.9 }], opacity: 0.6 * (1 - t.value) }));
  return (
    <View accessibilityLabel="online" style={{ position: 'absolute', right: -1, bottom: -1, width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: C.green }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: C.green, borderWidth: 2, borderColor: C.bg }} />
    </View>
  );
}

/** Breathing ΞX avatar with the presence pulse. */
export function ExoFace({ size = 40, online = true }: { size?: number; online?: boolean }) {
  return (
    <View>
      <Breathing>
        <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}><ExoMark size={Math.round(size * 0.45)} /></View>
      </Breathing>
      {online && <PresenceDot />}
    </View>
  );
}

/** Three bouncing dots inside an incoming bubble. */
export function TypingBubble() {
  return (
    <View accessibilityLabel="Exo is typing..." style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
      <ExoFace size={28} online={false} />
      <View style={[s.typing]}>
        {[0, 1, 2].map((i) => <Dot key={i} i={i} />)}
      </View>
    </View>
  );
}
function Dot({ i }: { i: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(i * 150, withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 }), withTiming(0, { duration: 400 })), -1, false));
  }, [y, i]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: 0.5 + (-y.value / 8) }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.muted }, st]} />;
}

/** Rich previews for the Sources Exo cites (site + title). */
export function LinkCards({ links }: { links: LinkPreview[] }) {
  if (!links.length) return null;
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      {links.map((l) => (
        <Pressable key={l.url} accessibilityRole="link" accessibilityLabel={`${l.host}, ${l.title}`} onPress={() => { WebBrowser.openBrowserAsync(l.url).catch(() => undefined); }} style={s.link}>
          <Image source={{ uri: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(l.host)}&sz=64` }} style={{ width: 20, height: 20, borderRadius: 4 }} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>{l.host}</Text>
            <Text numberOfLines={1} style={{ color: C.text, fontSize: 13 }}>{l.title}</Text>
          </View>
          <Ionicons name="open-outline" size={14} color={C.muted} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Swipe a bubble sideways to reply (incoming: right, mine: left). JS-thread gesture
 * so no app closures cross into the worklet runtime; vertical scrolling wins.
 */
export function SwipeReply({ mine, onReply, children }: { mine: boolean; onReply: () => void; children: ReactNode }) {
  const x = useSharedValue(0);
  const dir = mine ? -1 : 1;
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX(mine ? [-15, 1000] : [-1000, 15])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      x.value = dir * Math.min(72, Math.max(0, dir * e.translationX));
    })
    .onEnd(() => {
      const hit = Math.abs(x.value) > 56;
      try {
        x.value = animateTo(0);
      } catch {
        x.value = 0;
      }
      if (hit) {
        haptic.light();
        onReply();
      }
    });
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const icon = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(x.value) / 56) }));
  return (
    <GestureDetector gesture={pan}>
      <View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '40%', [mine ? 'right' : 'left']: -4 }, icon]}>
          <Ionicons name="arrow-undo" size={18} color={C.green} />
        </Animated.View>
        <Animated.View style={st}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

export type ThreadRow = ChatThread & { last?: string; lastAt?: number };
const when = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/** Telegram-style chat list: Exo first, goals as conversations, then saved chats. */
export function ChatListView({ threads, activeId, onOpen }: { threads: ThreadRow[]; activeId: string; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const shown = q.trim() ? threads.filter((t) => `${t.title} ${t.last ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())) : threads;
  return (
    <View style={{ flex: 1 }} accessibilityLabel="Chats">
      <View style={s.search}>
        <Ionicons name="search" size={16} color={C.muted} />
        <TextInput accessibilityLabel="Search chats" placeholder="Search" placeholderTextColor={C.muted} value={q} onChangeText={setQ} style={{ flex: 1, color: C.text, paddingVertical: 8 }} />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(t) => t.id}
        renderItem={({ item: t }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={t.title} onPress={() => { haptic.tap(); onOpen(t.id); }} style={[s.row, t.id === activeId && { backgroundColor: C.green + '1f' }]}>
            {t.kind === 'goal' ? (
              <View style={[s.avatar, { width: 48, height: 48, borderRadius: 24, borderColor: C.green }]}><Ionicons name="locate-outline" size={22} color={C.green} /></View>
            ) : (
              <ExoFace size={48} online={t.kind === 'exo'} />
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text numberOfLines={1} style={[ui.text, { flex: 1, fontWeight: '700' }]}>{t.title}</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{when(t.lastAt)}</Text>
              </View>
              <Text numberOfLines={1} style={ui.muted}>{t.last ? excerpt(t.last, 60) : ' '}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { backgroundColor: '#0a0a0b', borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)', alignItems: 'center', justifyContent: 'center' },
  typing: { flexDirection: 'row', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: C.green, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
});
