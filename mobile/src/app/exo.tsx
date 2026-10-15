import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rich } from '@/components/ExoText';
import { ui } from '@/components/ui';
import { Sheet } from '@/components/kit';
import { useAuth } from '@/hooks/useAuth';
import { askExo, type ChatMessage, type ChatThread, type ExoMode, excerpt, extractLinks, followUps, loadMode, saveMode, splitReply, stripSources, loadHistory, loadThreads, MAIN_THREAD, newId, now, saveHistory, saveThreads, threadKey } from '@/lib/exo';
import { ChatListView, ExoFace, LinkCards, SwipeReply, type ThreadRow, TypingBubble } from '@/components/ExoChatParts';
import { useWallet } from '@/hooks/useWallet';
import { useSavings } from '@/hooks/useSavings';
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

const LIFE_SUGGESTIONS = ['Plan a weekend trip', 'Find a gift under $50', 'Plan a dinner on Friday'];
const GREETING_MONEY = "Hey 👋 I'm keeping an eye on your money and the markets. What's on your mind?";
const GREETING_LIFE = 'Hey 👋 Shopping, trips, plans and places. What are we sorting out today?';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
  const [activeId, setActiveId] = useState('exo');
  const [mode, setModeState] = useState<ExoMode>(() => loadMode());
  const setMode = (m: ExoMode) => { haptic.tap(); setModeState(m); saveMode(m); };
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads(userKey));
  const [view, setView] = useState<'chat' | 'list'>('chat');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { balance, savingsBalance } = useWallet();
  const { apyRate } = useSavings();
  const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  useEffect(() => { saveHistory(threadKey(userKey, activeId), msgs); }, [msgs, userKey, activeId]);
  useEffect(() => { saveThreads(userKey, threads); }, [threads, userKey]);
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
    if (active.kind === 'chat') setThreads((ts) => ts.map((x) => (x.id === active.id ? { ...x, updatedAt: now(), title: x.title === 'New chat' ? excerpt(t, 40) : x.title } : x)));
    const r = await askExo(next, active.context, { mode });
    // Delivered: double tick, then Exo's reply arrives as short bubbles (sources as cards on the last).
    setMsgs((m) => m.map((x) => (x.role === 'user' ? { ...x, read: true } : x)));
    const sources = extractLinks(r.text, 4);
    const parts = splitReply(stripSources(r.text) || r.text);
    for (let i = 0; i < parts.length; i++) {
      const last = i === parts.length - 1;
      const msg: ChatMessage = { id: newId(), role: 'assistant', content: parts[i], createdAt: now(), ...(last && sources.length ? { sources } : {}) };
      setMsgs((m) => [...m, msg]);
      if (!last) await wait(Math.min(900, 280 + parts[i].length * 2));
    }
    setTyping(false);
    if (r.ok) haptic.success();
  };
  const react = (m: ChatMessage, emoji: string) => { haptic.tap(); setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, reaction: x.reaction === emoji ? undefined : emoji } : x))); setMenu(null); };
  const startReply = (m: ChatMessage) => { setReplyTo(m); setMenu(null); inputRef.current?.focus(); };
  const copy = async (m: ChatMessage) => { await Clipboard.setStringAsync(m.content); haptic.success(); setCopied(true); setTimeout(() => { setCopied(false); setMenu(null); }, 600); };
  const jumpTo = (id: string) => { const i = msgs.findIndex((m) => m.id === id); if (i >= 0) list.current?.scrollToIndex({ index: i, viewPosition: 0.5 }); };
  // New chat starts a fresh conversation; earlier ones stay in the chat list.
  const newChat = () => {
    if (typing) return;
    haptic.tap();
    const t: ChatThread = { id: `c-${newId()}`, title: 'New chat', kind: 'chat', updatedAt: now() };
    setThreads((ts) => [t, ...ts]);
    setActiveId(t.id);
    setMsgs([]);
    setReplyTo(null);
    setView('chat');
  };
  const allThreads = useMemo<ChatThread[]>(() => [
    MAIN_THREAD,
    ...goals.map((g): ChatThread => ({ id: `goal:${g.id}`, title: g.goal, kind: 'goal', updatedAt: 0, context: `> My goal: ${g.goal}${g.target_amount != null ? ` ($${Number(g.target_amount).toLocaleString()}` + (g.target_date ? ` by ${g.target_date})` : ')') : ''}` })),
    ...[...threads].sort((a, b) => b.updatedAt - a.updatedAt),
  ], [goals, threads]);
  const active = allThreads.find((t) => t.id === activeId) ?? MAIN_THREAD;
  const threadRows: ThreadRow[] = view === 'list' ? allThreads.map((t) => {
    const h = t.id === activeId ? msgs : loadHistory(threadKey(userKey, t.id));
    const l = h[h.length - 1];
    return { ...t, last: l?.content, lastAt: l?.createdAt };
  }) : [];
  const openThread = (id: string) => {
    setView('chat');
    setSearchOpen(false);
    setQuery('');
    if (id === activeId || typing) return;
    setActiveId(id);
    setReplyTo(null);
    setMsgs(loadHistory(threadKey(userKey, id)));
  };
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q ? msgs.filter((m) => m.content.toLowerCase().includes(q)) : msgs), [msgs, q]);

  const rows = useMemo(() => shown.map((m, i) => {
    const prev = shown[i - 1];
    const nxt = shown[i + 1];
    const sameDay = (a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString();
    const newDay = !prev || !sameDay(prev, m);
    const lastInGroup = !nxt || !sameDay(nxt, m) || nxt.role !== m.role || nxt.createdAt - m.createdAt > GROUP_GAP_MS;
    return { newDay, lastInGroup };
  }), [shown]);
  const empty = msgs.length === 0;
  const lastExo = [...msgs].reverse().find((m) => m.role === 'assistant');
  const chips = lastExo && !typing ? followUps(lastExo.content, mode) : mode === 'money' ? SUGGESTIONS : LIFE_SUGGESTIONS;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.head, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={view === 'chat' ? 'Chats' : 'Close'} onPress={() => (view === 'chat' ? setView('list') : router.back())} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        {view === 'list' ? <Text style={[ui.text, { flex: 1, fontWeight: '700', fontSize: 17 }]}>Chats</Text> : <>
        <ExoFace size={40} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[ui.text, { fontWeight: '700' }]}>{active.kind === 'exo' ? 'Exo' : active.title}</Text>
          <Text style={{ color: C.green, fontSize: 12 }}>{typing ? 'typing...' : 'online'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Search in chat" onPress={() => { setSearchOpen((o) => !o); setQuery(''); }} hitSlop={10}>
          <Ionicons name="search" size={21} color={searchOpen ? C.green : C.text} />
        </Pressable>
        </>}
        <Pressable accessibilityRole="button" accessibilityLabel="New chat" disabled={view === 'chat' && (empty || typing)} onPress={newChat} hitSlop={10} style={{ opacity: view === 'chat' && (empty || typing) ? 0.4 : 1 }}>
          <Ionicons name="create-outline" size={22} color={C.text} />
        </Pressable>
      </View>
      {view === 'list' ? <View style={{ flex: 1, paddingBottom: insets.bottom }}><ChatListView threads={threadRows} activeId={activeId} onOpen={openThread} /></View> : <>
      {searchOpen && (
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput autoFocus accessibilityLabel="Search in chat" placeholder="Search" placeholderTextColor={C.muted} value={query} onChangeText={setQuery} style={{ flex: 1, color: C.text, paddingVertical: 8 }} />
          {q ? <Text style={ui.muted}>{shown.length}</Text> : null}
        </View>
      )}
      <View accessibilityRole="tablist" accessibilityLabel="Exo mode" style={s.modes}>
        {(['money', 'life'] as const).map((m) => (
          <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => setMode(m)} style={[s.modeBtn, mode === m && s.modeOn]}>
            <Ionicons name={m === 'money' ? 'wallet-outline' : 'sparkles-outline'} size={14} color={mode === m ? C.bg : C.muted} />
            <Text style={{ color: mode === m ? C.bg : C.muted, fontWeight: '700', fontSize: 13 }}>{m === 'money' ? 'Exo Money' : 'Exo Life'}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'money' && <ScrollView horizontal accessibilityLabel="Pinned" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
        <View style={s.pin}>
          <Ionicons name="wallet-outline" size={16} color={C.green} />
          <View><Text style={{ color: C.muted, fontSize: 11 }}>Balance</Text><Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{money(balance)}</Text></View>
        </View>
        <View style={s.pin}>
          <Ionicons name="trending-up-outline" size={16} color={C.green} />
          <View><Text style={{ color: C.muted, fontSize: 11 }}>Savings</Text><Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{money(savingsBalance)} <Text style={{ color: C.green, fontWeight: '400' }}>· {apyRate}% APY</Text></Text></View>
        </View>
      </ScrollView>}
      {goals.length > 0 && active.kind === 'exo' && mode === 'money' && (
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
        data={shown}
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
            // No bot splash: Exo opens the conversation like a person would.
            <View style={{ flex: 1, justifyContent: 'flex-end', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <ExoFace size={28} online={false} />
                <View style={[s.bubble, s.theirs, { maxWidth: '82%' }]}>
                  <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{mode === 'money' ? GREETING_MONEY : GREETING_LIFE}</Text>
                </View>
              </View>
              {mode === 'money' && <Text style={[ui.muted, { fontSize: 11, marginLeft: 36 }]}>Not financial advice</Text>}
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
                <SwipeReply mine={mine} onReply={() => startReply(item)}>
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
                  <Rich text={mine ? item.content : stripSources(item.content)} mine={mine} />
                  {!mine && <LinkCards links={item.sources ?? extractLinks(item.content, 4)} />}
                  {lastInGroup && (
                    <View style={{ flexDirection: 'row', alignSelf: 'flex-end', gap: 4, marginTop: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: mine ? '#0b3b1d' : C.muted }}>{time(item.createdAt)}</Text>
                      {mine && <Ionicons accessibilityLabel={item.read ? 'Read' : 'Sent'} name={item.read ? 'checkmark-done' : 'checkmark'} size={12} color="#0b3b1d" />}
                    </View>
                  )}
                </Pressable>
                </SwipeReply>
                {item.reaction && (
                  <Pressable accessibilityLabel={`Reaction ${item.reaction}`} onPress={() => react(item, item.reaction!)} style={[s.reaction, mine ? { right: 8 } : { left: 8 }]}>
                    <Text style={{ fontSize: 13 }}>{item.reaction}</Text>
                  </Pressable>
                )}
              </Animated.View>
            </View>
          );
        }}
        ListFooterComponent={typing ? <TypingBubble /> : null}
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
          {chips.map((item) => (
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
      </>}
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
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.card },
  pin: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 150, backgroundColor: C.card, borderLeftWidth: 3, borderLeftColor: C.green, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  modes: { flexDirection: 'row', alignSelf: 'center', backgroundColor: C.card, borderRadius: 999, padding: 3, marginTop: 8, gap: 2 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  modeOn: { backgroundColor: C.green },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
