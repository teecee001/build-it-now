import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { SwipeToPay } from '@/components/SwipeToPay';
import { TransactionPinModal } from '@/components/TransactionPinModal';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { mpcConfig } from '@/wallet/mpc/config';
import { type ConfirmOutcome, useConfirmSheet } from '@/wallet/mpc/ConfirmSheet';
import { Card, Screen, Title, ui } from '@/components/ui';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { invokeWalletOp } from '@/hooks/useWallet';
import { formatAmount, formatHandle } from '@/lib/formatTransaction';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { C } from '@/lib/theme';

const symbolOf = (cur: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? '';
  } catch {
    return '';
  }
};
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export default function Send() {
  const qc = useQueryClient();
  const { wallets } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();
  const toUSD = (n: number, c: string) => n / (rates[c] || 1);
  const [cur, setCur] = useState('USD');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // One idempotency key per payment attempt; reused on retry so the server dedupes.
  const idem = useRef(newKey());
  const wallet = useMemo(() => wallets.find((w) => w.currency === cur), [wallets, cur]);
  const parsed = parseFloat(amount);
  const { requiresPin, verifyPin, isPinSet, PIN_THRESHOLD } = useTransactionPin();
  const [pinOpen, setPinOpen] = useState(false);
  const pinGate = useRef<((ok: boolean) => void) | null>(null);
  const { ask, sheet: confirmSheet } = useConfirmSheet();
  const closePin = (ok: boolean) => { setPinOpen(false); pinGate.current?.(ok); pinGate.current = null; };

  const handleSend = async () => {
    setError(null);
    if (!recipient || !amount || !(parsed > 0)) {
      haptic.error();
      setError('Please fill in all fields');
      return;
    }
    if (!wallet || parsed > Number(wallet.balance)) {
      haptic.error();
      setError(`Insufficient ${cur} balance`);
      return;
    }
    // Exo Wallet flag on: one native review + biometric confirm for every send (same sheet as crypto).
    let bio: ConfirmOutcome | null = null;
    if (mpcConfig().enabled) {
      bio = await ask({ title: 'Send money', amount: `${symbolOf(cur)}${parsed.toFixed(2)} ${cur}`, to: formatHandle(recipient) });
      if (bio === 'cancelled') return;
    }
    if (bio !== 'confirmed' && requiresPin(toUSD(parsed, cur))) {
      const ok = await new Promise<boolean>((resolve) => { pinGate.current = resolve; setPinOpen(true); });
      if (!ok) return;
    }
    try {
      const result = await invokeWalletOp({
        operation: 'send',
        wallet_id: wallet.id,
        amount: parsed,
        usd_amount: toUSD(parsed, cur),
        currency: cur,
        recipient: recipient.trim(),
        idempotency_key: idem.current,
        description: `Sent ${symbolOf(cur)}${parsed.toFixed(2)} ${cur} to ${formatHandle(recipient)}`,
      });
      // Only report success when the server confirms the transfer was recorded (same rule as web).
      if (!result || result.success !== true || !result.transaction_id) {
        throw new Error('Transfer could not be confirmed. Check your activity before trying again.');
      }
      idem.current = newKey();
      haptic.success();
      setTimeout(() => setSent(true), 450);
    } catch (e) {
      haptic.error();
      setError((e instanceof Error && e.message) || 'Transfer failed');
    } finally {
      ['wallet', 'multi-wallets', 'transactions', 'notifications'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View entering={ZoomIn.springify().stiffness(420).damping(28)} style={s.check}>
            <Text style={{ color: C.bg, fontSize: 40, fontWeight: '800' }}>✓</Text>
          </Animated.View>
          <Text style={[ui.title, { marginTop: 20 }]}>Payment Sent!</Text>
          <Pressable accessibilityRole="button" onPress={() => { setSent(false); setRecipient(''); setAmount(''); }} style={[s.outline, { marginTop: 24 }]}>
            <Text style={{ color: C.text, fontWeight: '600' }}>Send Another</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title sub="Transfer funds to anyone, anywhere in the world">Send Money</Title>
      {error ? (
        <Animated.View entering={enter(0)} style={ui.banner} accessibilityRole="alert">
          <Text style={ui.bannerT}>{error}</Text>
        </Animated.View>
      ) : null}
      <Card i={1}>
        <Text style={ui.muted}>Spending from</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
          {wallets.map((w) => (
            <Pressable key={w.id} onPress={() => { haptic.tap(); setCur(w.currency); }} style={[s.chip, w.currency === cur && { borderColor: C.green }]}>
              <Text style={{ color: w.currency === cur ? C.green : C.text, fontWeight: '600' }}>{w.currency}</Text>
              <Text style={ui.muted}>{formatAmount(Number(w.balance), w.currency)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>
      <Card i={2}>
        <Text style={[ui.muted, { marginBottom: 6 }]}>Recipient</Text>
        <TextInput style={ui.input} placeholder="Email, username, or wallet address" placeholderTextColor={C.muted} autoCapitalize="none" value={recipient} onChangeText={setRecipient} />
        <TextInput style={[ui.input, { fontSize: 28, fontWeight: '700' }]} placeholder="0.00" placeholderTextColor={C.muted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
          <Text style={ui.muted}>Network fee</Text>
          <Text style={{ color: C.green, fontWeight: '600' }}>Free</Text>
        </View>
        {isPinSet && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#A78BFA" />
            <Text style={ui.muted}>Transaction PIN required for transfers over <Text style={{ color: C.text, fontWeight: '600' }}>${PIN_THRESHOLD}</Text></Text>
          </View>
        )}
        <SwipeToPay label="Send" onConfirm={handleSend} disabled={!recipient || !amount} />
        {confirmSheet}
        <TransactionPinModal open={pinOpen} amount={toUSD(parsed || 0, cur)} verifyPin={verifyPin} onVerified={() => closePin(true)} onCancel={() => closePin(false)} />
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  check: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
});
