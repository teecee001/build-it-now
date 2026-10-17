// Port of src/pages/Deposit.tsx (same strings, same wallet-operation "demo_deposit" call).
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, Box, Btn, Field, IconDot, k, Page, SectionLabel, SECONDARY } from '@/components/kit';
import { SuccessCheck } from '@/components/SuccessCheck';
import { invokeWalletOp, useWallet } from '@/hooks/useWallet';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/formatCurrency';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

const routingNumber = '021000021';
const accountNumber = '9876543210';

export default function Deposit() {
  const { balance } = useWallet();
  const [method, setMethod] = useState<'direct' | 'bank' | 'card' | null>(null);
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const { run, busy: isProcessing } = useSingleFlight();

  const handleDeposit = () =>
    run(async () => {
      haptic.light();
      const depositAmount = parseFloat(amount);
      if (!depositAmount || depositAmount <= 0) {
        toast.error('Enter a valid amount');
        return;
      }
      try {
        await invokeWalletOp({ operation: 'demo_deposit', amount: depositAmount, method: method === 'bank' ? 'bank' : 'card' });
        setDone(true);
        toast.success(`$${amount} deposited successfully`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || 'Deposit failed');
      }
    });

  if (done) {
    return (
      <Page title="Deposit Funds">
        <View style={{ alignItems: 'center', gap: 14, marginTop: 60 }}>
          <SuccessCheck />
          <Text style={k.title}>Deposit Complete!</Text>
          <Text style={k.muted}>${amount} has been added to your wallet</Text>
          <Btn variant="outline" label="Make Another Deposit" onPress={() => { setDone(false); setAmount(''); setMethod(null); }} />
        </View>
      </Page>
    );
  }

  const copy = async (v: string) => { await Clipboard.setStringAsync(v); toast.success('Copied'); };
  const methods = [
    { id: 'direct' as const, icon: 'business-outline' as const, title: 'Direct Deposit', desc: 'Set up recurring deposits from your employer', badge: '6% APY' },
    { id: 'bank' as const, icon: 'library-outline' as const, title: 'Bank Transfer', desc: 'Transfer from your bank account (1-3 days)' },
    { id: 'card' as const, icon: 'card-outline' as const, title: 'Debit Card', desc: 'Instant deposit from a debit card' },
  ];

  return (
    <Page title="Deposit Funds" sub="Add money to your Ξ╳oSky wallet">
      <Box i={1} style={[k.rowB, { padding: 14 }]}>
        <Text style={k.muted}>Current wallet balance</Text>
        <Text style={[k.text, k.mono, { fontSize: 18 }]}>{formatMoney(balance)}</Text>
      </Box>
      <Box i={2} tint={C.green} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Ionicons name="trending-up" size={20} color={C.green} />
        <View style={{ flex: 1 }}>
          <Text style={k.h3}>Earn 6.00% APY</Text>
          <Text style={k.muted}>Set up direct deposit and earn interest on your balance</Text>
        </View>
      </Box>
      <SectionLabel>Choose Method</SectionLabel>
      {methods.map((m, i) => (
        <Animated.View key={m.id} entering={enter(3 + i)}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: method === m.id }} onPress={() => { haptic.tap(); setMethod(m.id); }} style={[k.card, { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 }, method === m.id && { borderColor: C.green + '80' }]}>
            <IconDot name={m.icon} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={k.h3}>{m.title}</Text>
                {m.badge ? <Badge label={m.badge} /> : null}
              </View>
              <Text style={k.muted}>{m.desc}</Text>
            </View>
          </Pressable>
        </Animated.View>
      ))}
      {method === 'direct' && (
        <Box i={0}>
          <Text style={k.h3}>Direct Deposit Details</Text>
          <Text style={[k.muted, { marginVertical: 6 }]}>Share these details with your employer to set up direct deposit</Text>
          {[['Routing Number', routingNumber], ['Account Number', accountNumber]].map(([l, v]) => (
            <View key={l} style={[k.rowB, { backgroundColor: SECONDARY, borderRadius: 10, padding: 12, marginTop: 8 }]}>
              <View>
                <Text style={k.muted}>{l}</Text>
                <Text style={[k.text, k.mono]}>{v}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${l}`} onPress={() => copy(v)} hitSlop={10}>
                <Ionicons name="copy-outline" size={18} color={C.muted} />
              </Pressable>
            </View>
          ))}
          <View style={{ backgroundColor: C.green + '0D', borderRadius: 10, padding: 12, marginTop: 12, flexDirection: 'row', gap: 6 }}>
            <Ionicons name="checkmark" size={14} color={C.green} />
            <Text style={{ color: C.green, fontSize: 12, flex: 1 }}>Deposits arrive within 1-2 business days. Earn 6.00% APY on your entire balance.</Text>
          </View>
        </Box>
      )}
      {(method === 'bank' || method === 'card') && (
        <Box i={0}>
          <Field label="Amount" placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={{ fontSize: 26, textAlign: 'center', fontWeight: '700' }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {['50', '100', '250', '500'].map((a) => (
              <Btn key={a} small variant="secondary" label={`$${a}`} onPress={() => setAmount(a)} style={{ flex: 1 }} />
            ))}
          </View>
          <View style={[k.rowB, { marginBottom: 14 }]}>
            <Text style={k.muted}>Fee</Text>
            <Text style={{ color: C.green, fontWeight: '600' }}>Free</Text>
          </View>
          <Btn label={`Deposit $${amount || '0.00'}`} icon="arrow-down" onPress={handleDeposit} busy={isProcessing} disabled={!amount} />
        </Box>
      )}
    </Page>
  );
}
