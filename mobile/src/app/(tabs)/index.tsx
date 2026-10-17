// Port of src/pages/Dashboard.tsx: same hooks, labels and navigation targets, all native.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Sparkline } from '@/components/Chart';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import { IconName, Sheet, k } from '@/components/kit';
import { TravelMode } from '@/components/TravelMode';
import { TxRow } from '@/components/TxRow';
import { Card, Screen, ui } from '@/components/ui';
import { useActiveCurrency } from '@/hooks/useActiveCurrency';
import { useAuth } from '@/hooks/useAuth';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useGeoVerification } from '@/hooks/useGeoVerification';
import { useProfile } from '@/hooks/useProfile';
import { useTransactions } from '@/hooks/useTransactions';
import { useWallet } from '@/hooks/useWallet';
import { balanceSeries } from '@/lib/balanceHistory';
import { formatAmount } from '@/lib/formatTransaction';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { prefs } from '@/lib/prefs';
import { C } from '@/lib/theme';

type Feature = Parameters<ReturnType<typeof useGeoVerification>['isFeatureAvailable']>[0];
const SHORTCUTS: { label: string; sub: string; icon: IconName; tint: string; path: Href; feature?: Feature }[] = [
  { label: 'Markets', sub: 'Live prices', icon: 'bar-chart-outline', tint: '#A78BFA', path: '/markets' },
  { label: 'Cards', sub: 'Virtual & metal', icon: 'card-outline', tint: C.green, path: '/card' },
  { label: 'Savings', sub: 'Projection only', icon: 'wallet-outline', tint: C.green, path: '/savings' },
  { label: 'QR Pay', sub: 'Scan & pay', icon: 'qr-code-outline', tint: C.muted, path: '/qr' },
  { label: 'Pay Bills', sub: 'Utilities & more', icon: 'business-outline', tint: C.green, path: '/bills', feature: 'features_bill_pay' as Feature },
  { label: 'Exo', sub: 'Exo Intelligence', icon: 'sparkles-outline', tint: '#A78BFA', path: '/exo' },
  { label: 'Crypto', sub: 'Trade digital assets', icon: 'logo-bitcoin', tint: '#F59E0B', path: '/crypto', feature: 'features_crypto' as Feature },
  { label: 'Stocks', sub: 'Invest in markets', icon: 'briefcase-outline', tint: C.green, path: '/stocks', feature: 'features_stocks' as Feature },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { savingsBalance } = useWallet();
  const { activeCurrency, formatBalance, fromUSD, wallets } = useActiveCurrency();
  const { rates, isLive } = useExchangeRates();
  const { isFeatureAvailable } = useGeoVerification();
  const { transactions: recentTx, isLoading: txLoading } = useTransactions(8);
  const recent = recentTx.filter((t) => t.type !== 'welcome_bonus').slice(0, 4);
  const { transactions: historyTx } = useTransactions(50);
  const { profile } = useProfile();
  const { width } = useWindowDimensions();
  const [show, setShow] = useState(true);
  useEffect(() => { prefs.get('exo.hideBalance').then((v) => setShow(v !== '1')); }, []);
  const toggle = () => { haptic.tap(); setShow((v) => { void prefs.set('exo.hideBalance', v ? '1' : '0'); return !v; }); };
  const mask = (s: string) => (show ? s : '••••••');

  const displayName = profile?.full_name?.trim() || (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'User';
  const handle = '@' + (user?.email?.split('@')[0] || 'user');
  const total = wallets.reduce((sum, w) => sum + (w.balance / (rates[w.currency] || 1)) * (rates[activeCurrency] || 1), 0);
  const walletCards = [...wallets].sort((a, b) => (a.currency === activeCurrency ? -1 : b.currency === activeCurrency ? 1 : 0));
  const fmtWallet = (cur: string) => (n: number) => (cur === activeCurrency ? formatBalance(n) : formatAmount(n, cur));
  const series = useMemo(() => {
    const codes = new Set(wallets.map((w) => w.currency));
    return balanceSeries(historyTx, total, (amount, cur) => (codes.has(cur) && rates[cur] ? (amount / rates[cur]) * (rates[activeCurrency] || 1) : null));
  }, [historyTx, total, rates, activeCurrency, wallets]);

  const cardW = Math.min(240, width * 0.6);
  const listRef = useRef<FlatList>(null);
  // Reset to the first card when the wallet set or active currency changes (derived, no setState in effect).
  const slideKey = `${wallets.length}:${activeCurrency}`;
  const [slideState, setSlideState] = useState({ key: slideKey, i: 0 });
  const slide = slideState.key === slideKey ? slideState.i : 0;
  const setSlide = (i: number) => setSlideState({ key: slideKey, i });
  useEffect(() => { listRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [slideKey]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const expWallet = walletCards.find((w) => w.currency === expanded);
  const expTx = expanded ? historyTx.filter((t) => (t.currency || 'USD').toUpperCase() === expanded && t.type !== 'welcome_bonus').slice(0, 5) : [];
  const slides = [...walletCards.map((w) => w.currency), 'savings'];

  const actions: { label: string; icon: IconName; primary?: boolean; to: Href }[] = [
    { label: 'Send', icon: 'paper-plane', primary: true, to: '/send' },
    { label: 'Add', icon: 'arrow-down', to: '/deposit' },
    { label: 'Convert', icon: 'repeat', to: '/convert' },
    { label: 'More', icon: 'grid', to: '/menu' },
  ];

  return (
    <Screen>
      <Animated.View entering={enter(0)} style={[ui.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={ui.muted}>Welcome back,</Text>
          <Text style={ui.title} numberOfLines={1}>{displayName}</Text>
          <Text style={ui.muted}>{handle}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CurrencySwitcher />
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide balance' : 'Show balance'} onPress={toggle} hitSlop={12}>
            <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={22} color={C.muted} />
          </Pressable>
        </View>
      </Animated.View>

      <Card i={1}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={ui.muted}>Total Balance</Text>
          <View style={[s.live, { borderColor: isLive ? C.green : C.border }]}><View style={[s.dot, { backgroundColor: isLive ? C.green : C.muted }]} /><Text style={{ color: isLive ? C.green : C.muted, fontSize: 10, fontWeight: '700' }}>{isLive ? 'Live' : 'Demo'}</Text></View>
        </View>
        {show ? <AnimatedNumber value={total} format={formatBalance} style={s.big} /> : <Text style={s.big}>••••••</Text>}
        {series.length > 0 && show && <View style={{ marginVertical: 6 }}><Sparkline values={series} width={width - 72} height={36} /></View>}
        <FlatList
          ref={listRef}
          horizontal
          data={slides}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + 12}
          decelerationRate="fast"
          initialNumToRender={4}
          windowSize={5}
          contentContainerStyle={{ gap: 12, paddingTop: 8 }}
          onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (cardW + 12)))}
          renderItem={({ item, index }) => {
            if (item === 'savings')
              return (
                <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); router.push('/savings'); }} style={[s.wallet, { width: cardW, borderColor: C.green + '40' }]}>
                  <Text style={s.cur}>Savings</Text>
                  <Text style={s.wbal}>{mask(formatBalance(fromUSD(savingsBalance)))}</Text>
                </Pressable>
              );
            const w = walletCards[index];
            return (
              <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); setExpanded(w.currency); }} style={[s.wallet, { width: cardW }]}>
                <Text style={s.cur}>{w.currency} Wallet</Text>
                {show ? <AnimatedNumber value={w.balance} format={fmtWallet(w.currency)} style={s.wbal} /> : <Text style={s.wbal}>••••••</Text>}
              </Pressable>
            );
          }}
        />
        {slides.length > 2 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }}>
            {slides.map((c, i) => <View key={c} style={{ height: 5, width: i === slide ? 14 : 5, borderRadius: 3, backgroundColor: i === slide ? C.green : C.border }} />)}
          </View>
        )}
      </Card>

      <Animated.View entering={enter(2)} style={[ui.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
        {actions.map((a) => (
          <Pressable key={a.label} accessibilityRole="button" onPress={() => { haptic.tap(); router.navigate(a.to); }} style={{ alignItems: 'center', width: 72 }}>
            <View style={[s.qa, a.primary && { backgroundColor: C.green, borderColor: C.green }]}>
              <Ionicons name={a.icon} size={20} color={a.primary ? C.bg : C.text} />
            </View>
            <Text style={[ui.muted, { marginTop: 6, color: C.text }]}>{a.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      <Card i={3}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.h2}>Activity</Text>
          <Pressable onPress={() => router.navigate('/activity')} hitSlop={10}><Text style={{ color: C.green, fontWeight: '600' }}>See all</Text></Pressable>
        </View>
        {txLoading ? <Text style={ui.muted}>…</Text> : recent.length ? recent.map((t, i) => (
          <Pressable key={t.id} onPress={() => router.navigate('/activity')}><TxRow tx={t} i={4 + i} /></Pressable>
        )) : <Text style={[ui.muted, { marginTop: 8 }]}>Your transaction history will appear here once you make your first deposit, send money, or trade.</Text>}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {SHORTCUTS.map((sc, i) => {
          const available = !sc.feature || isFeatureAvailable(sc.feature);
          return (
            <Animated.View key={sc.label} entering={enter(5 + i)} style={{ width: (width - 42) / 2 }}>
              <Pressable accessibilityRole="button" disabled={!available} onPress={() => { haptic.tap(); router.push(sc.path); }} style={({ pressed }) => [s.sc, { opacity: available ? 1 : 0.5, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                <Ionicons name={available ? sc.icon : 'close-circle-outline'} size={20} color={available ? sc.tint : C.muted} />
                <View style={{ flex: 1 }}><Text style={k.h3} numberOfLines={1}>{sc.label}</Text><Text style={k.muted} numberOfLines={1}>{sc.sub}</Text></View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      <TravelMode />

      <Sheet open={!!expWallet} onClose={() => setExpanded(null)} title={expWallet ? `${expWallet.currency} Wallet` : undefined}>
        {expWallet && (
          <>
            <Text style={[s.big, { marginBottom: 8 }]}>{mask(fmtWallet(expWallet.currency)(expWallet.balance))}</Text>
            {expTx.map((t, i) => <TxRow key={t.id} tx={t} i={i} />)}
            <Pressable onPress={() => { setExpanded(null); router.navigate('/activity'); }} style={{ paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: C.green, fontWeight: '600' }}>See all</Text></Pressable>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
const s = StyleSheet.create({
  big: { color: C.text, fontSize: 38, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  wallet: { backgroundColor: '#141416', borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14 },
  cur: { color: C.green, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  wbal: { color: C.text, fontSize: 20, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] },
  qa: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  sc: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
