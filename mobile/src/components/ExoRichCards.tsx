import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInLeft, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Sparkline } from '@/components/Chart';
import { useMarketData } from '@/hooks/useMarketData';
import { type ExoMode, mentionedTickers, parseAllocation, parseItinerary, parseProducts } from '@/lib/exo';
import { C } from '@/lib/theme';

export const LIME = '#bef264';
export const accentFor = (mode: ExoMode) => (mode === 'life' ? LIME : C.green);
const MONO = { fontVariant: ['tabular-nums' as const] };
const PALETTE = ['#34d399', '#2dd4bf', LIME, '#047857', '#22d3ee'];

function Bar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => { w.value = withTiming(pct, { duration: 700, reduceMotion: ReduceMotion.System }); }, delay);
    return () => clearTimeout(t);
  }, [pct, delay, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: '100%', backgroundColor: color }, st]} />;
}

export function AllocationCard({ text }: { text: string }) {
  const rows = parseAllocation(text);
  if (!rows.length) return null;
  return (
    <View style={[s.card, { borderColor: 'rgba(16,185,129,0.25)' }]} accessibilityLabel="Governor">
      <View style={s.cardHead}>
        <Ionicons name="shield-checkmark" size={14} color={C.green} />
        <Text style={[s.kicker, { color: '#6ee7b7' }]}>GOVERNOR</Text>
        <View style={s.badge}><Text style={[s.badgeT, MONO]}>1x leverage</Text></View>
      </View>
      <View style={{ flexDirection: 'row', height: 8, overflow: 'hidden' }}>
        {rows.map((r, i) => <Bar key={r.symbol} pct={r.pct} color={PALETTE[i % PALETTE.length]} delay={i * 80} />)}
      </View>
      <View style={{ padding: 10, gap: 5 }}>
        {rows.map((r, i) => (
          <View key={r.symbol} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE[i % PALETTE.length] }} />
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{r.symbol}</Text>
            {r.note ? <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, flex: 1 }}>{r.note}</Text> : <View style={{ flex: 1 }} />}
            <Text style={[{ color: C.text, fontSize: 13 }, MONO]}>{r.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ItineraryCard({ text }: { text: string }) {
  const rows = parseItinerary(text);
  if (!rows.length) return null;
  return (
    <View style={[s.card, { borderColor: 'rgba(190,242,100,0.25)', padding: 10 }]} accessibilityLabel="Itinerary">
      <View style={[s.cardHead, { padding: 0, borderBottomWidth: 0, marginBottom: 8 }]}>
        <Ionicons name="calendar" size={14} color={LIME} />
        <Text style={[s.kicker, { color: LIME }]}>ITINERARY</Text>
      </View>
      <View style={{ borderLeftWidth: 1, borderLeftColor: 'rgba(190,242,100,0.3)', paddingLeft: 12, gap: 8 }}>
        {rows.map((r, i) => (
          <Animated.View key={i} entering={FadeInLeft.delay(i * 60)}>
            <View style={s.dot} />
            <Text style={{ color: '#ecfccb', fontWeight: '700', fontSize: 12 }}>{r.label}</Text>
            <Text style={{ color: C.text, fontSize: 13 }}>{r.text}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export function ProductCards({ text }: { text: string }) {
  const items = parseProducts(text);
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {items.map((p) => (
        <Pressable key={p.url} accessibilityRole="link" accessibilityLabel={p.title} onPress={() => { WebBrowser.openBrowserAsync(p.url).catch(() => undefined); }} style={[s.card, { width: '48%', marginTop: 0, padding: 10, gap: 4 }]}>
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11 }}>{p.host}</Text>
          <Text numberOfLines={2} style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{p.title}</Text>
          <Text style={[{ color: LIME, fontSize: 14 }, MONO]}>{p.price ?? 'See price'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function QuoteCards({ text }: { text: string }) {
  const tickers = mentionedTickers(text);
  const crypto = useMarketData('crypto');
  const stocks = useMarketData('stocks');
  // Only tickers with a live quote get a card: no placeholders, no guessed prices.
  const live = tickers.map(({ symbol, cls }) => ({ symbol, q: cls === 'crypto' ? crypto.getCrypto(symbol) : stocks.getStock(symbol) })).filter((t) => t.q && t.q.price > 0);
  if (!live.length) return null;
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      {live.map(({ symbol, q }) => {
        const up = (q!.changePct ?? 0) >= 0;
        return (
          <View key={symbol} style={[s.card, { marginTop: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8 }]}>
            <View>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>{symbol}</Text>
              <Text style={[{ color: C.text, fontSize: 13 }, MONO]}>${q!.price.toLocaleString(undefined, { maximumFractionDigits: q!.price >= 1000 ? 0 : 2 })}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}><Sparkline values={q!.spark ?? []} width={90} height={24} color={up ? C.green : '#f87171'} /></View>
            <Text style={[{ color: up ? '#34d399' : '#f87171', fontSize: 12 }, MONO]}>{up ? '+' : ''}{q!.changePct.toFixed(2)}%</Text>
          </View>
        );
      })}
    </View>
  );
}

export function RichCards({ text, mode }: { text: string; mode: ExoMode }) {
  return (
    <>
      <AllocationCard text={text} />
      {mode === 'life' ? <ItineraryCard text={text} /> : null}
      {mode === 'life' ? <ProductCards text={text} /> : <QuoteCards text={text} />}
    </>
  );
}

/** Rotating presence ring around the avatar; spins faster while Exo is typing. */
export function PresenceRing({ size, color, fast, children }: { size: number; color: string; fast: boolean; children: React.ReactNode }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = 0;
    r.value = withRepeat(withTiming(360, { duration: fast ? 1600 : 8000, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1, false);
  }, [fast, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: (size + 8) / 2, borderWidth: 2, borderColor: 'transparent', borderTopColor: color, borderRightColor: color + '55' }, st]} />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(0,0,0,0.4)', overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  badge: { marginLeft: 'auto', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  badgeT: { color: '#6ee7b7', fontSize: 11 },
  dot: { position: 'absolute', left: -17, top: 3, width: 9, height: 9, borderRadius: 5, backgroundColor: LIME, borderWidth: 2, borderColor: '#000' },
});
