import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PriceTick } from '@/components/PriceTick';
import { Card, Screen, Title, ui } from '@/components/ui';
import { useCryptoHoldings, useMarketData } from '@/hooks/data';
import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 6 : 2 });

export default function Crypto() {
  const { crypto } = useMarketData('crypto');
  const { holdings } = useCryptoHoldings();
  const price = (c: string) => crypto[c]?.price ?? 0;
  const portfolio = holdings.reduce((s, h) => s + Number(h.amount) * price(h.crypto_code), 0);
  const coins = Object.entries(crypto).sort((a, b) => b[1].price - a[1].price).slice(0, 30);

  return (
    <Screen>
      <Title>Crypto Wallet</Title>
      <Card i={1}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.muted}>Portfolio Value</Text>
          {coins.length > 0 && <Text style={s.live}>● Live</Text>}
        </View>
        <Text style={s.big}>{usd(portfolio)}</Text>
      </Card>
      {holdings.length > 0 && (
        <Card i={2}>
          <Text style={ui.h2}>Your Holdings</Text>
          {holdings.map((h, i) => (
            <Animated.View key={h.id} entering={enter(3 + i)} style={s.row}>
              <Text style={s.sym}>{h.crypto_code}</Text>
              <Text style={ui.muted}>{Number(h.amount).toLocaleString('en-US', { maximumFractionDigits: 8 })}</Text>
              <Text style={s.val}>{usd(Number(h.amount) * price(h.crypto_code))}</Text>
            </Animated.View>
          ))}
        </Card>
      )}
      <Card i={3}>
        <Text style={ui.h2}>All Assets</Text>
        {coins.map(([code, q], i) => (
          <Animated.View key={code} entering={enter(4 + i)} style={s.row}>
            <Text style={s.sym}>{code}</Text>
            <Text style={{ color: q.changePct >= 0 ? C.green : C.red, fontSize: 13, fontVariant: ['tabular-nums'] }}>
              {q.changePct >= 0 ? '+' : ''}
              {q.changePct.toFixed(2)}%
            </Text>
            <PriceTick value={q.price} text={usd(q.price)} style={s.val} />
          </Animated.View>
        ))}
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  live: { color: C.green, fontSize: 12, fontWeight: '600' },
  big: { color: C.text, fontSize: 32, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  sym: { color: C.text, fontWeight: '600', width: 70 },
  val: { color: C.text, fontWeight: '600', minWidth: 110, textAlign: 'right' },
});
