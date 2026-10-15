import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breathing } from '@/components/Breathing';
import { Rich } from '@/components/ExoText';
import { ExoMark } from '@/components/ExoMark';
import { ui } from '@/components/ui';
import { Sheet } from '@/components/kit';
import { useAuth } from '@/hooks/useAuth';
import { askExo, type ChatMessage, clearHistory, excerpt, loadHistory, newId, now, saveHistory } from '@/lib/exo';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

const SUGGESTIONS = [
  "What's happening in crypto markets today?",
  'How should I think about portfolio risk?',
  'Explain dollar-cost averaging simply',
  'What are key factors for long-term investing?',
];

const REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];
const GROUP_GAP_MS = 5 * 60 * 1000;
type Goal = { id: string; goal: string; target_amount: number | null; target_date: string | null };
const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export default function Exo() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userKey = user?.id ?? 'anon';
  const [msgs, setMsgs] = useState<ChatMessage[]>(() => loadHistory(userKey));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const list = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const atBottomRef = useRef(true);
  useEffect(() => { atBottomRef.current = atBottom; }, [atBottom]);

  useEffect(() => { saveHistory(userKey, msgs); }, [msgs, userKey]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Goal[] | null; error: unknown }> } } } })
          .from('exo_goals').select('id, goal, target_amount, target_date').order('created_at', { ascending: false }).limit(3);
        if (!cancelled && !error && data) setGoals(data);
      } catch { /* goals table not installed: no pinned area */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const toBottom = useCallback((animated = true) => { list.current?.scrollToEnd({ animated }); setUnseen(0); }, []);
  const last = msgs[msgs.length - 1];
  useEffect(() => {
    if (!last) return;
    if (atBottomRef.current || last.role === 'user') setTimeout(() => toBottom(), 50);
    else setUnseen((n) => n + 1);
  }, [last?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    haptic.light();
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: t, createdAt: now(), replyTo: replyTo ? { id: replyTo.id, role: replyTo.role, excerpt: excerpt(replyTo.content) } : undefined };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput('');
    setReplyTo(null);
    setTyping(true);
    const r = await askExo(next);
    setTyping(false);
    if (r.ok) haptic.success();
    setMsgs((m) => [...m.map((x) => (x.role === 'user' ? { ...x, read: true } : x)), { id: newId(), role: 'assistant', content: r.text, createdAt: now() }]);
  };
  const react = (m: ChatMessage, emoji: string) => { haptic.tap(); setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, reaction: x.reaction === emoji ? undefined : emoji } : x))); setMenu(null); };
  const startReply = (m: ChatMessage) => { setReplyTo(m); setMenu(null); inputRef.current?.focus(); };
  const copy = async (m: ChatMessage) => { await Clipboard.setStringAsync(m.content); haptic.success(); setCopied(true); setTimeout(() => { setCopied(false); setMenu(null); }, 600); };
  const jumpTo = (id: string) => { const i = msgs.findIndex((m) => m.id === id); if (i >= 0) list.current?.scrollToIndex({ index: i, viewPosition: 0.5 }); };
  const newChat = () => { if (typing) return; haptic.tap(); setMsgs([]); setReplyTo(null); clearHistory(userKey); };

  const rows = useMemo(() => msgs.map((m, i) => {
    const prev = msgs[i - 1];
    const nxt = msgs[i + 1];
    const sameDay = (a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString();
    const newDay = !prev || !sameDay(prev, m);
    const lastInGroup = !nxt || !sameDay(nxt, m) || nxt.role !== m.role || nxt.createdAt - m.createdAt > GROUP_GAP_MS;
    return { newDay, lastInGroup };
  }), [msgs]);
  const empty = msgs.length === 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.head, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Breathing>
          <View style={s.avatar}><ExoMark size={18} /></View>
        </Breathing>
        <View style={{ flex: 1 }}>
          <Text style={[ui.text, { fontWeight: '700' }]}>Exo</Text>
          {typing ? <Text style={{ color: C.green, fontSize: 12 }}>typing...</Text> : <Text style={ui.muted} numberOfLines={1}><Text style={{ color: C.green }}>online</Text> · Exo Intelligence · Not financial advice</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="New chat" disabled={empty || typing} onPress={newChat} hitSlop={10} style={{ opacity: empty || typing ? 0.4 : 1 }}>
          <Ionicons name="create-outline" size={22} color={C.text} />
        </Pressable>
      </View>
      {goals.length > 0 && (
        <ScrollView horizontal accessibilityLabel="Goals" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 10, alignItems: 'center' }}>
          <Ionicons name="locate-outline" size={14} color={C.green} />
          {goals.map((g) => (
            <View key={g.id} style={s.goal}>
              <Text style={{ color: C.text, fontSize: 12 }}>{g.goal}{g.target_amount != null ? <Text style={{ fontWeight: '700' }}> ${Number(g.target_amount).toLocaleString()}</Text> : null}{g.target_date ? <Text style={{ color: C.muted }}> · {new Date(g.target_date).toLocaleDateString([], { month: 'short', year: 'numeric' })}</Text> : null}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        accessibilityLabel="Exo"
        initialNumToRender={20}
        windowSize={11}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onLayout={() => toBottom(false)}
        onScrollToIndexFailed={() => undefined}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const b = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
          setAtBottom(b);
          if (b) setUnseen(0);
        }}
        scrollEventThrottle={64}
        ListEmptyComponent={
          typing ? null : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Breathing amount={0.08}>
                <View style={[s.avatar, { width: 88, height: 88, borderRadius: 44 }]}><ExoMark size={40} /></View>
              </Breathing>
              <Text style={[ui.text, { fontWeight: '700' }]}>Exo</Text>
              <Text style={ui.muted}>Ask Exo about markets, budgets, investing, or strategy</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const mine = item.role === 'user';
          const { newDay, lastInGroup } = rows[index] ?? { newDay: false, lastInGroup: true };
          return (
            <View style={{ marginBottom: lastInGroup ? 12 : 3 }}>
              {newDay && <View accessibilityRole="text" style={s.day}><Text style={{ color: C.muted, fontSize: 11 }}>{dayLabel(item.createdAt)}</Text></View>}
              <Animated.View entering={enter(0)} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <Pressable
                  accessibilityLabel={`${mine ? 'You' : 'Exo'}, ${time(item.createdAt)}`}
                  accessibilityHint="Long press for Reply, Copy and React"
                  delayLongPress={350}
                  onLongPress={() => { haptic.medium(); setMenu(item); }}
                  style={[s.bubble, mine ? s.mine : s.theirs, !lastInGroup && (mine ? { borderBottomRightRadius: 20 } : { borderBottomLeftRadius: 20 })]}>
                  {item.replyTo && (
                    <Pressable onPress={() => jumpTo(item.replyTo!.id)} style={[s.quote, { borderLeftColor: mine ? C.bg : C.green }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: mine ? C.bg : C.green }}>{item.replyTo.role === 'user' ? 'You' : 'Exo'}</Text>
                      <Text numberOfLines={2} style={{ fontSize: 12, color: mine ? '#0b3b1d' : C.muted }}>{item.replyTo.excerpt}</Text>
                    </Pressable>
                  )}
                  <Rich text={item.content} mine={mine} />
                  {lastInGroup && (
                    <View style={{ flexDirection: 'row', alignSelf: 'flex-end', gap: 4, marginTop: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: mine ? '#0b3b1d' : C.muted }}>{time(item.createdAt)}</Text>
                      {mine && <Ionicons accessibilityLabel={item.read ? 'Read' : 'Sent'} name={item.read ? 'checkmark-done' : 'checkmark'} size={12} color="#0b3b1d" />}
                    </View>
                  )}
                </Pressable>
                {item.reaction && (
                  <Pressable accessibilityLabel={`Reaction ${item.reaction}`} onPress={() => react(item, item.reaction!)} style={[s.reaction, mine ? { right: 8 } : { left: 8 }]}>
                    <Text style={{ fontSize: 13 }}>{item.reaction}</Text>
                  </Pressable>
                )}
              </Animated.View>
            </View>
          );
        }}
        ListFooterComponent={typing ? <Breathing><Text accessibilityLabel="Exo is typing..." style={[ui.muted, { fontSize: 22 }]}>•••</Text></Breathing> : null}
      />
      {!atBottom && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={s.fab}>
          <Pressable accessibilityLabel={unseen ? `${unseen} new message` : 'Scroll to bottom'} onPress={() => toBottom()} style={s.fabBtn}>
            <Ionicons name="arrow-down" size={18} color={C.text} />
            {unseen > 0 && <View style={s.badge}><Text style={{ color: C.bg, fontSize: 10, fontWeight: '700' }}>{unseen}</Text></View>}
          </Pressable>
        </Animated.View>
      )}
      <View style={{ height: 48 }}>
        <ScrollView horizontal accessibilityLabel="Suggestions" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
          {SUGGESTIONS.map((item) => (
            <Pressable key={item} accessibilityRole="button" disabled={typing} onPress={() => send(item)} style={s.chip}>
              <Text style={{ color: C.text, fontSize: 13 }}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {replyTo && (
        <Animated.View entering={FadeIn.duration(150)} style={s.replyBar}>
          <Ionicons name="arrow-undo-outline" size={16} color={C.green} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>{replyTo.role === 'user' ? 'You' : 'Exo'}</Text>
            <Text style={ui.muted} numberOfLines={1}>{excerpt(replyTo.content)}</Text>
          </View>
          <Pressable accessibilityLabel="Cancel reply" onPress={() => setReplyTo(null)} hitSlop={10}><Ionicons name="close" size={18} color={C.muted} /></Pressable>
        </Animated.View>
      )}
      <View style={[s.bar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput ref={inputRef} multiline style={[ui.input, { flex: 1, marginBottom: 0, maxHeight: 160 }]} placeholder="Ask Exo..." placeholderTextColor={C.muted} value={input} onChangeText={setInput} onSubmitEditing={() => send(input)} submitBehavior="submit" />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={typing || !input.trim()} onPress={() => send(input)} style={[s.send, { opacity: typing || !input.trim() ? 0.5 : 1 }]}>
          <Ionicons name="arrow-up" size={20} color={C.bg} />
        </Pressable>
      </View>
      <Sheet open={!!menu} onClose={() => setMenu(null)}>
        {menu && (
          <View accessibilityLabel="Message actions">
            <View accessibilityLabel="React" style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
              {REACTIONS.map((e) => (
                <Pressable key={e} accessibilityLabel={`React ${e}`} onPress={() => react(menu, e)} style={[s.emoji, menu.reaction === e && { backgroundColor: C.green + '33' }]}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Reply" onPress={() => startReply(menu)} style={s.action}>
              <Ionicons name="arrow-undo-outline" size={18} color={C.text} /><Text style={ui.text}>Reply</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={copied ? 'Copied' : 'Copy'} onPress={() => copy(menu)} style={s.action}>
              <Ionicons name="copy-outline" size={18} color={C.text} /><Text style={ui.text}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
        )}
      </Sheet>
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
  goal: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  day: { alignSelf: 'center', backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginVertical: 10 },
  quote: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6, opacity: 0.85 },
  reaction: { position: 'absolute', bottom: -10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 },
  fab: { position: 'absolute', right: 16, bottom: 140 },
  fabBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, padding: 10, borderRadius: 12, backgroundColor: C.card, borderLeftWidth: 3, borderLeftColor: C.green },
  emoji: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14 },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
