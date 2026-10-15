// Port of src/pages/Forecasts.tsx. Paper positions persist on-device via localStorage
// (expo-sqlite polyfill), same key as web. No funds move.
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Sparkline } from '@/components/Chart';
import { FearGreedGauge } from '@/components/FearGreedGauge';
import { Badge, Box, Btn, Field, k, Sheet } from '@/components/kit';
import { ListPage } from '@/components/ListPage';
import { type ForecastMarket, type MarketCategory, useForecastMarkets } from '@/hooks/useForecastMarkets';
import { haptic } from '@/lib/haptics';
import { DECELERATE } from '@/lib/motion';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

function fmtUsd(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
const CAT_LABEL: Record<string, string> = { rates: 'FX', crypto: 'Crypto', commodities: 'Metals', events: 'Events' };
interface Position {
  marketId: string; side: 'YES' | 'NO'; shares: number; avgPrice: number; question: string; openedAt: string; resolvesAt: string;
  status: 'open' | 'won' | 'lost' | 'expired'; settledAt?: string; settleNote?: string;
}
const POS_KEY = 'exosky-paper-positions-v1';
function loadPositions(): Position[] {
  try {
    const raw = globalThis.localStorage?.getItem(POS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function savePositions(list: Position[]) {
  try { globalThis.localStorage?.setItem(POS_KEY, JSON.stringify(list)); } catch { /* quota */ }
}
function settleDue(list: Position[], markets: ForecastMarket[]): Position[] {
  const now = Date.now();
  let changed = false;
  const next = list.map((pos) => {
    if (pos.status !== 'open') return pos;
    const resolveMs = Date.parse(pos.resolvesAt);
    const m = markets.find((x) => x.id === pos.marketId);
    const due = (Number.isFinite(resolveMs) && resolveMs + 86400000 < now) || (m ? m.resolvesInDays <= 0 : false);
    if (!due) return pos;
    const yes = m?.yesPrice ?? pos.avgPrice;
    const won = pos.side === 'YES' ? yes >= 50 : yes < 50;
    changed = true;
    return { ...pos, status: (won ? 'won' : 'lost') as Position['status'], settledAt: new Date().toISOString(), settleNote: m ? `Settled on model close · YES ${yes}¢` : 'Market expired · settled without live book' };
  });
  return changed ? next : list;
}

function OddsBar({ yes }: { yes: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(yes, { duration: 600, easing: DECELERATE, reduceMotion: ReduceMotion.System }); }, [yes, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(239,68,68,0.35)', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, backgroundColor: C.green, borderRadius: 3 }, st]} />
    </View>
  );
}

const MarketCard = memo(function MarketCard({ m, onTrade }: { m: ForecastMarket; onTrade: (m: ForecastMarket, side: 'YES' | 'NO') => void }) {
  const yes = m.yesPrice;
  const no = 100 - yes;
  return (
    <View style={[k.card, { marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        {m.hot && <Badge label="Trending" icon="flame" color="#F97316" />}
        <Badge label={CAT_LABEL[m.category] ?? m.category} color={C.muted} />
        <Badge label="Model odds" color={C.muted} />
        {m.spotLabel ? <Text style={[k.muted, { fontSize: 11 }]}>{m.spotLabel}</Text> : null}
      </View>
      <Text style={[k.text, { fontSize: 14, fontWeight: '600', marginBottom: 6 }]}>{m.question}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <Text style={[k.muted, { fontSize: 11 }]}>⏱ {m.resolvesInDays}d · {m.resolvesAt}</Text>
        {m.volume ? <Text style={[k.muted, { fontSize: 11 }]}>{fmtUsd(m.volume)} 24h</Text> : null}
        <Text style={[k.muted, { fontSize: 11 }]}>{m.source}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {m.spark.length ? <Sparkline values={m.spark} width={72} height={24} color={m.spark[m.spark.length - 1] >= m.spark[0] ? C.green : C.red} /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={k.rowB}>
            <Text style={{ color: yes >= 50 ? C.green : C.red, fontSize: 12, fontWeight: '600' }}>{yes}% YES</Text>
            <Text style={[k.muted, { fontSize: 12 }]}>{no}% NO</Text>
          </View>
          <OddsBar yes={yes} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small variant="secondary" label={`Yes ${yes}¢`} style={{ flex: 1 }} onPress={() => onTrade(m, 'YES')} />
        <Btn small variant="secondary" label={`No ${no}¢`} style={{ flex: 1 }} onPress={() => onTrade(m, 'NO')} />
      </View>
    </View>
  );
});

export default function Forecasts() {
  const { markets, counts, isLoading, isError, isFetching, lastUpdated, refetch } = useForecastMarkets();
  const [tab, setTab] = useState<'all' | MarketCategory>('all');
  const [q, setQ] = useState('');
  const [rawPositions, setPositions] = useState<Position[]>(() => loadPositions());
  // Settlement is derived (no setState in an effect); the settled view is what gets saved.
  const positions = useMemo(() => settleDue(rawPositions, markets), [rawPositions, markets]);
  useEffect(() => { savePositions(positions); }, [positions]);
  const [trading, setTrading] = useState<{ market: ForecastMarket; side: 'YES' | 'NO' } | null>(null);
  const [amount, setAmount] = useState('10');
  const priceOf = useCallback((id: string) => markets.find((m) => m.id === id)?.yesPrice ?? 50, [markets]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return markets.filter((m) => (tab === 'all' || m.category === tab) && (!needle || (m.question + m.detail + m.source + (m.spotLabel ?? '')).toLowerCase().includes(needle)));
  }, [tab, markets, q]);
  const headline = markets.find((m) => m.hot && m.category === 'events') ?? markets.find((m) => m.id === 'usd-eur-7d') ?? markets[0];
  const investAmount = parseFloat(amount) || 0;
  const openTrade = useCallback((market: ForecastMarket, side: 'YES' | 'NO') => { haptic.tap(); setTrading({ market, side }); setAmount('10'); }, []);
  const confirmTrade = () => {
    if (!trading || investAmount <= 0) return;
    const priceCents = trading.side === 'YES' ? priceOf(trading.market.id) : 100 - priceOf(trading.market.id);
    const shares = investAmount / (priceCents / 100);
    setPositions(() => {
      const next: Position[] = [...positions, { marketId: trading.market.id, side: trading.side, shares: Math.round(shares * 100) / 100, avgPrice: priceCents, question: trading.market.question, openedAt: new Date().toISOString(), resolvesAt: trading.market.resolvesAt, status: 'open' }];
      savePositions(next);
      return next;
    });
    haptic.success();
    toast(`Position opened — ${trading.side}`, { description: `${shares.toFixed(2)} shares at ${priceCents}¢ · Paper position, no funds moved.` });
    setTrading(null);
  };
  const tradePrice = trading ? (trading.side === 'YES' ? priceOf(trading.market.id) : 100 - priceOf(trading.market.id)) : 0;
  const potentialShares = tradePrice > 0 ? investAmount / (tradePrice / 100) : 0;
  const openPos = positions.filter((p) => p.status === 'open');
  const portfolioValue = openPos.reduce((s, p) => { const y = priceOf(p.marketId); return s + p.shares * ((p.side === 'YES' ? y : 100 - y) / 100); }, 0);
  const portfolioCost = openPos.reduce((s, p) => s + p.shares * (p.avgPrice / 100), 0);
  const pl = portfolioValue - portfolioCost;
  const tabs: { v: 'all' | MarketCategory; l: string }[] = [
    { v: 'all', l: `All (${counts.all})` }, { v: 'rates', l: `FX (${counts.rates})` }, { v: 'crypto', l: `Crypto (${counts.crypto})` },
    { v: 'commodities', l: `Metals (${counts.commodities})` }, { v: 'events', l: `Events (${counts.events})` },
  ];

  const top = (
    <>
      <View style={[k.rowB, { marginBottom: 10 }]}>
        <Text style={[k.muted, { fontSize: 12 }]}>● Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Pressable accessibilityLabel="Refresh" disabled={isFetching} onPress={() => refetch()} hitSlop={8}><Ionicons name="refresh" size={16} color={C.muted} /></Pressable>
      </View>
      {isError && (
        <Box i={1} tint={C.red} style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="warning-outline" size={16} color={C.red} />
          <View style={{ flex: 1 }}>
            <Text style={k.text}>Live market data is unavailable right now.</Text>
            <Text style={k.muted}>We only list markets backed by real feeds. Try refresh in a moment.</Text>
          </View>
        </Box>
      )}
      <FearGreedGauge variant="compact" />
      {headline && (
        <Box i={2} tint={C.green}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name="sparkles" size={18} color={C.green} />
            <View style={{ flex: 1 }}>
              <Text style={k.caption}>Featured</Text>
              <Text style={[k.text, { fontWeight: '600' }]}>{headline.question}</Text>
            </View>
          </View>
          <Text style={[k.muted, { fontSize: 12, marginVertical: 8 }]}>
            <Text style={{ color: C.green, fontWeight: '600' }}>{headline.yesPrice}% YES</Text> · model{headline.spotLabel ? ` · ${headline.spotLabel}` : ''} · {headline.source}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small variant="outline" label="Back the move" icon="arrow-up" style={{ flex: 1 }} onPress={() => openTrade(headline, 'YES')} />
            <Btn small variant="secondary" label="Alert me" icon="timer-outline" style={{ flex: 1 }} onPress={() => toast('Alert set', { description: `We'll watch ${headline.question}` })} />
          </View>
        </Box>
      )}
      {positions.length > 0 && (
        <Box i={3} style={k.rowB}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Ionicons name="wallet-outline" size={14} color={C.muted} />
            <Text style={[k.muted, { fontSize: 12 }]}>{openPos.length} open · {positions.length - openPos.length} settled</Text>
          </View>
          <Text style={[k.muted, { fontSize: 12 }]}>Value <Text style={k.text}>${portfolioValue.toFixed(2)}</Text></Text>
          <Text style={[k.muted, { fontSize: 12 }]}>P/L <Text style={{ color: pl >= 0 ? C.green : C.red }}>{pl >= 0 ? '+' : ''}${pl.toFixed(2)}</Text></Text>
        </Box>
      )}
      <Field value={q} onChangeText={setQ} placeholder="Search BTC, ETH, EUR, gold, dominance…" autoCapitalize="none" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
        {tabs.map((t) => (
          <Pressable key={t.v} accessibilityRole="tab" accessibilityState={{ selected: tab === t.v }} onPress={() => setTab(t.v)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: tab === t.v ? C.text : C.card, borderWidth: 1, borderColor: tab === t.v ? C.text : C.border }}>
            <Text style={{ color: tab === t.v ? C.bg : C.text, fontSize: 12, fontWeight: '600' }}>{t.l}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );

  return (
    <>
      <ListPage
        title="Forecasts"
        sub={`${counts.all} markets from live spots · model-implied odds · paper trades persist on this device.`}
        right={<Badge label="Beta" color={C.muted} />}
        top={top}
        data={isLoading ? [] : filtered}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MarketCard m={item} onTrade={openTrade} />}
        empty={isLoading ? <Text style={[k.muted, { textAlign: 'center', padding: 24 }]}>…</Text> : <Box i={0}><Text style={k.muted}>No markets in this book. Try another tab or clear search.</Text></Box>}
        footer={
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <Ionicons name="information-circle-outline" size={14} color={C.muted} />
            <Text style={[k.muted, { fontSize: 11, flex: 1, lineHeight: 16 }]}>
              Odds are <Text style={{ fontWeight: '700' }}>model-implied</Text> from live spots (ECB FX, CoinGecko, Fear &amp; Greed) using realized volatility — not an exchange order book. Paper positions save on this device and settle when the resolve date passes. No real funds move.
            </Text>
          </View>
        }
      />
      <Sheet open={!!trading} onClose={() => setTrading(null)} title={trading ? `Back ${trading.side} at ${tradePrice}¢` : undefined}>
        {trading && (
          <>
            <Text style={[k.text, { fontWeight: '600' }]}>{trading.market.question}</Text>
            <Text style={[k.muted, { fontSize: 12, marginVertical: 6 }]}>{trading.market.detail}</Text>
            <Field label="Amount (USD)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {[5, 10, 25, 50].map((v) => <Btn key={v} small variant="outline" label={`$${v}`} style={{ flex: 1 }} onPress={() => setAmount(String(v))} />)}
            </View>
            <View style={{ backgroundColor: '#1C1C1F', borderRadius: 12, padding: 12, gap: 6, marginBottom: 12 }}>
              <View style={k.rowB}><Text style={k.muted}>Shares</Text><Text style={k.text}>{potentialShares.toFixed(2)}</Text></View>
              <View style={k.rowB}><Text style={k.muted}>Pays out if correct</Text><Text style={k.text}>${potentialShares.toFixed(2)}</Text></View>
              <View style={k.rowB}><Text style={k.muted}>Potential profit</Text><Text style={{ color: C.green }}>+${(potentialShares - investAmount).toFixed(2)}</Text></View>
            </View>
            <Btn label={`Buy ${trading.side} — $${investAmount.toFixed(2)}`} icon={trading.side === 'YES' ? 'arrow-up' : 'arrow-down'} onPress={confirmTrade} disabled={investAmount <= 0} />
            <Text style={[k.muted, { fontSize: 11, textAlign: 'center', marginTop: 8 }]}>Paper trading — no real funds move. Each share pays $1 if the outcome resolves {trading.side}.</Text>
          </>
        )}
      </Sheet>
    </>
  );
}
