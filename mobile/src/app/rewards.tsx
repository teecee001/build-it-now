// Port of src/pages/Rewards.tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AMBER, Badge, Box, Empty, IconDot, k, Loading, Page, SectionLabel, Stat } from '@/components/kit';
import { useTransactions } from '@/hooks/useTransactions';
import { useWallet } from '@/hooks/useWallet';
import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

const CASHBACK_CATEGORIES = [
  { name: 'Dining', rate: '3%', icon: 'star-outline' as const, color: AMBER },
  { name: 'Shopping', rate: '2%', icon: 'bag-outline' as const, color: C.green },
  { name: 'Travel', rate: '2%', icon: 'flash-outline' as const, color: C.text },
  { name: 'Everything else', rate: '1%', icon: 'card-outline' as const, color: C.muted },
];

export default function Rewards() {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { savingsBalance, isLoading: walletLoading } = useWallet();
  const rewardsTx = transactions.filter((t) => t.type === 'cashback' || t.type === 'interest' || t.type === 'welcome_bonus');
  const totalRewards = rewardsTx.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const now = new Date();
  const thisMonthRewards = rewardsTx
    .filter((t) => { const d = new Date(t.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const apyEarnings = rewardsTx.filter((t) => t.type === 'interest').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  if (txLoading || walletLoading) return <Loading />;

  return (
    <Page title="Rewards" sub="Cashback and bonuses. Savings interest is not paid.">
      <Box i={1} tint={AMBER}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Ionicons name="gift-outline" size={16} color={AMBER} />
          <Text style={k.muted}>Total Rewards Earned</Text>
        </View>
        <Text style={[k.title, k.mono, { color: AMBER, fontSize: 30, marginTop: 4 }]}>${totalRewards.toFixed(2)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Stat label="This Month" value={`$${thisMonthRewards.toFixed(2)}`} />
          <Stat label="Interest paid" color={C.green} value={`$${apyEarnings.toFixed(2)}`} />
        </View>
      </Box>
      <Box i={2} tint={C.green} style={[k.rowB]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Ionicons name="trending-up" size={16} color={C.green} />
            <Text style={k.h3}>High-Yield Savings</Text>
          </View>
          <Text style={[k.muted, { marginTop: 4 }]}>Illustrated rate only. Interest is not paid.</Text>
          {savingsBalance > 0 && <Text style={{ color: C.green, fontSize: 12, marginTop: 4 }}>Current savings: ${savingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[k.mono, { color: C.green, fontSize: 24 }]}>0%</Text>
          <Text style={{ color: C.green + 'B3', fontSize: 12 }}>paid</Text>
        </View>
      </Box>
      <SectionLabel>Cashback Rates</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {CASHBACK_CATEGORIES.map((cat, i) => (
          <Animated.View key={cat.name} entering={enter(3 + i)} style={[k.card, { width: '48.5%', marginBottom: 0, padding: 12 }]}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name={cat.icon} size={16} color={cat.color} />
              <Text style={k.muted}>{cat.name}</Text>
            </View>
            <Text style={[k.text, k.mono, { fontSize: 18 }]}>{cat.rate}</Text>
          </Animated.View>
        ))}
      </View>
      <SectionLabel>Rewards History</SectionLabel>
      {rewardsTx.length === 0 ? (
        <Empty text="No rewards yet. Start spending to earn cashback!" />
      ) : (
        rewardsTx.map((item, i) => (
          <Box key={item.id} i={Math.min(8 + i, 16)} style={[k.rowB, { padding: 12 }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
              <IconDot name="gift-outline" color={AMBER} size={32} bg={AMBER + '1A'} />
              <View style={{ flex: 1 }}>
                <Text style={[k.text, { fontSize: 14 }]} numberOfLines={1}>{item.description || item.type}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={k.muted}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
                  <Badge label={item.type.replace('_', ' ')} color={C.muted} />
                </View>
              </View>
            </View>
            <Text style={[k.mono, { color: C.green }]}>+${Math.abs(Number(item.amount)).toFixed(2)}</Text>
          </Box>
        ))
      )}
    </Page>
  );
}
