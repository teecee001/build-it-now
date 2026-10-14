import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breathing } from '@/components/Breathing';
import { ExoMark } from '@/components/ExoMark';
import { ui } from '@/components/ui';
import { askExo, type ChatMessage, newId, now } from '@/lib/exo';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

const SUGGESTIONS = [
  "What's happening in crypto markets today?",
  'How should I think about portfolio risk?',
  'Explain dollar-cost averaging simply',
  'What are key factors for long-term investing?',
];

/** Renders Exo text; markdown links (Exo's sources) become tappable and open in the in-app browser. */
function Rich({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return (
    <Text style={{ color: mine ? C.bg : C.text, fontSize: 15, lineHeight: 21 }}>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
        if (!m) return p.replace(/\*\*/g, '');
        return (
          <Text key={i} style={{ color: C.green, textDecorationLine: 'underline' }} onPress={() => WebBrowser.openBrowserAsync(m[2]).catch(() => undefined)}>
            {m[1]}
          </Text>
        );
      })}
    </Text>
  );
}

export default function Exo() {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    haptic.light();
    const next = [...msgs, { id: newId(), role: 'user' as const, content: t, createdAt: now() }];
    setMsgs(next);
    setInput('');
    setTyping(true);
    const r = await askExo(next);
    setTyping(false);
    if (r.ok) haptic.success();
    setMsgs((m) => [...m, { id: newId(), role: 'assistant', content: r.text, createdAt: now() }]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.head, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Breathing>
          <View style={s.avatar}><ExoMark size={18} /></View>
        </Breathing>
        <View>
          <Text style={[ui.text, { fontWeight: '700' }]}>Exo</Text>
          <Text style={ui.muted}><Text style={{ color: C.green }}>online</Text> · Exo Intelligence · Not financial advice</Text>
        </View>
      </View>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Breathing amount={0.08}>
              <View style={[s.avatar, { width: 88, height: 88, borderRadius: 44 }]}><ExoMark size={40} /></View>
            </Breathing>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.role === 'user';
          return (
            <Animated.View entering={enter(0)} style={[s.bubble, mine ? s.mine : s.theirs]}>
              <Rich text={item.content} mine={mine} />
            </Animated.View>
          );
        }}
        ListFooterComponent={typing ? <Breathing><Text accessibilityLabel="Exo is typing..." style={[ui.muted, { fontSize: 22 }]}>•••</Text></Breathing> : null}
      />
      {msgs.length === 0 && (
        <View style={{ height: 48 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
            {SUGGESTIONS.map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => send(item)} style={s.chip}>
                <Text style={{ color: C.text, fontSize: 13 }}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={[s.bar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput style={[ui.input, { flex: 1, marginBottom: 0 }]} placeholder="Ask Exo..." placeholderTextColor={C.muted} value={input} onChangeText={setInput} onSubmitEditing={() => send(input)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(input)} style={s.send}>
          <Ionicons name="arrow-up" size={20} color={C.bg} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0a0a0b', borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)', alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '85%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: C.green, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 6 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  bar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, alignItems: 'center' },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
