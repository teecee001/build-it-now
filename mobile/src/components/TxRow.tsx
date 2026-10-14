import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Transaction } from '@/hooks/data';
import { formatTxAmount, getTransactionTitle } from '@/lib/formatTransaction';
import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

export function TxRow({ tx, i = 0 }: { tx: Transaction; i?: number }) {
  const amt = formatTxAmount(tx);
  return (
    <Animated.View entering={enter(i)} style={s.row}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={s.t} numberOfLines={1}>{getTransactionTitle(tx)}</Text>
        <Text style={s.d}>{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
      </View>
      <Text style={[s.a, { color: amt.tone === 'in' ? C.green : C.text }]}>{amt.text}</Text>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  t: { color: C.text, fontSize: 15, fontWeight: '500' },
  d: { color: C.muted, fontSize: 12, marginTop: 2 },
  a: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
