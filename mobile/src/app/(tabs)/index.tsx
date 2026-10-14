import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { TxRow } from '@/components/TxRow';
import { Card, Screen, ui } from '@/components/ui';
import { useProfile, useRates, useTransactions, useWallets } from '@/hooks/data';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount } from '@/lib/formatTransaction';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { prefs } from '@/lib/prefs';
import { C, fmtUsd } from '@/lib/theme';
import { openWeb } from '@/lib/web';

export default function Account() {
  const { user } = useAuth();
  const { wallets } = useWallets();
  const { profile } = useProfile();
  const { rates, toUSD } = useRates();
  const { transactions } = useTransactions(8);
  const recent = transactions.filter((t) => t.type !== 'welcome_bonus').slice(0, 4);
  const [show, setShow] = useState(true);
  useEffect(() => {
    prefs.get('exo.hideBalance').then((v) => setShow(v !== '1'));
  }, []);
  const toggle = () => {
    haptic.light();
    setShow((v) => {
      prefs.set('exo.hideBalance', v ? '1' : '0');
      return !v;
    });
  };
  const total = useMemo(() => wallets.reduce((s, w) => s + toUSD(Number(w.balance), w.currency), 0), [wallets, rates]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = profile?.full_name?.trim() || (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'User';
  const mask = (s: string) => (show ? s : '••••••');

  const actions = [
    { label: 'Send', icon: 'paper-plane' as const, primary: true, on: () => router.navigate('/send') },
    { label: 'Add', icon: 'arrow-down' as const, on: () => openWeb('/deposit') },
    { label: 'Convert', icon: 'repeat' as const, on: () => openWeb('/convert') },
    { label: 'More', icon: 'grid' as const, on: () => router.navigate('/menu') },
  ];

  return (
    <Screen>
      <Animated.View entering={enter(0)} style={[ui.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
        <View>
          <Text style={ui.muted}>Welcome back,</Text>
          <Text style={ui.title}>{name}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide balance' : 'Show balance'} onPress={toggle} hitSlop={12}>
          <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={22} color={C.muted} />
        </Pressable>
      </Animated.View>

      <Card i={1}>
        <Text style={ui.muted}>Total Balance</Text>
        {show ? (
          <AnimatedNumber value={total} format={(n) => fmtUsd(n)} style={s.big} />
        ) : (
          <Text style={s.big}>••••••</Text>
        )}
      </Card>

      <Animated.View entering={enter(2)}>
        <FlatList
          horizontal
          data={wallets}
          keyExtractor={(w) => w.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={232}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={enter(3 + index)} style={s.wallet}>
              <Text style={s.cur}>{item.currency}</Text>
              <Text style={s.wbal}>{mask(formatAmount(Number(item.balance), item.currency))}</Text>
              <Text style={ui.muted}>Savings {mask(formatAmount(Number(item.savings_balance), item.currency))}</Text>
            </Animated.View>
          )}
        />
      </Animated.View>

      <Animated.View entering={enter(4)} style={[ui.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
        {actions.map((a) => (
          <Pressable key={a.label} accessibilityRole="button" onPress={() => { haptic.tap(); a.on(); }} style={{ alignItems: 'center', width: 72 }}>
            <View style={[s.qa, a.primary && { backgroundColor: C.green, borderColor: C.green }]}>
              <Ionicons name={a.icon} size={20} color={a.primary ? C.bg : C.text} />
            </View>
            <Text style={[ui.muted, { marginTop: 6, color: C.text }]}>{a.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      <Card i={5}>
        <Text style={ui.h2}>Activity</Text>
        {recent.map((t, i) => (
          <TxRow key={t.id} tx={t} i={6 + i} />
        ))}
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  big: { color: C.text, fontSize: 38, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  wallet: { width: 220, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16 },
  cur: { color: C.green, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  wbal: { color: C.text, fontSize: 22, fontWeight: '700', marginVertical: 6, fontVariant: ['tabular-nums'] },
  qa: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
});
