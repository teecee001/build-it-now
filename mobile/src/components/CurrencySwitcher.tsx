// Port of src/components/CurrencySwitcher.tsx (same convert-all flow via useMultiCurrencyWallet).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Btn, Field, k, Sheet } from '@/components/kit';
import { CURRENCIES } from '@/constants/currencies';
import { useActiveCurrency } from '@/hooks/useActiveCurrency';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

const FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', CNY: '🇨🇳', INR: '🇮🇳', MXN: '🇲🇽', BRL: '🇧🇷', ZAR: '🇿🇦',
  KRW: '🇰🇷', SGD: '🇸🇬', HKD: '🇭🇰', NOK: '🇳🇴', SEK: '🇸🇪', DKK: '🇩🇰', NZD: '🇳🇿', TRY: '🇹🇷', PLN: '🇵🇱', AED: '🇦🇪', KES: '🇰🇪', GHS: '🇬🇭', NGN: '🇳🇬',
};
const flag = (c: string) => FLAGS[c] ?? (c === 'BTC' ? '₿' : '◎');
const sym = (c: string) => CURRENCIES.find((x) => x.code === c)?.symbol || c;
const nm = (c: string) => CURRENCIES.find((x) => x.code === c)?.name || c;
const fmtAmt = (a: number, c: string) => `${sym(c)}${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CurrencySwitcher() {
  const { activeCurrency, setActiveCurrency, wallets } = useActiveCurrency();
  const { convertCurrency } = useMultiCurrencyWallet();
  const { rates } = useExchangeRates();
  const [picker, setPicker] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [txPin, setTxPin] = useState('');
  const { run, busy } = useSingleFlight();
  const fromWallet = wallets.find((w) => w.currency === activeCurrency);
  const fromBalance = fromWallet?.balance ?? 0;
  const rate = (pending ? rates[pending] || 1 : 1) / (rates[activeCurrency] || 1);
  const converted = fromBalance * rate;

  const select = (c: string) => {
    setPicker(false);
    if (c === activeCurrency) return;
    haptic.tap();
    if (!fromWallet || fromBalance <= 0) { setActiveCurrency(c); return; }
    setPending(c);
  };
  const confirm = () =>
    run(async () => {
      if (!pending) return;
      try {
        await convertCurrency.mutateAsync({ fromCurrency: activeCurrency, toCurrency: pending, amount: fromBalance, rate, pin: txPin });
        setActiveCurrency(pending);
        haptic.success();
        toast.success(`Switched to ${pending}`, { description: `${fmtAmt(converted, pending)} now in your ${pending} wallet` });
      } catch (err: unknown) {
        toast.error('Conversion failed', { description: getErrorMessage(err) });
      } finally {
        setPending(null);
      }
    });

  if (wallets.length <= 1) return null;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={activeCurrency} disabled={busy} onPress={() => setPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}>
        <Text>{flag(activeCurrency)}</Text>
        <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{busy ? 'Converting…' : activeCurrency}</Text>
        <Ionicons name="chevron-down" size={12} color={C.muted} />
      </Pressable>
      <Sheet open={picker} onClose={() => setPicker(false)}>
        <ScrollView style={{ maxHeight: 420 }}>
          {wallets.map((w) => (
            <Pressable key={w.currency} accessibilityRole="button" onPress={() => select(w.currency)} style={[k.rowB, { paddingVertical: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18 }}>{flag(w.currency)}</Text>
                <View><Text style={k.h3}>{w.currency}</Text><Text style={k.muted}>{nm(w.currency)}</Text></View>
              </View>
              {w.currency === activeCurrency && <Ionicons name="checkmark" size={18} color={C.green} />}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
      <Sheet open={!!pending} onClose={() => !busy && setPending(null)} title={`Switch to ${pending}?`}>
        <Text style={[k.muted, { marginBottom: 12 }]}>Your full {activeCurrency} balance will be converted. For partial conversions, use the Multi-Currency page.</Text>
        {pending && (
          <>
            <View style={[k.rowB, { backgroundColor: '#1C1C1F', borderRadius: 12, padding: 12, marginBottom: 10 }]}>
              <View style={{ alignItems: 'center' }}><Text>{flag(activeCurrency)} {activeCurrency}</Text><Text style={[k.text, k.mono]}>{fmtAmt(fromBalance, activeCurrency)}</Text></View>
              <Ionicons name="arrow-forward" size={16} color={C.muted} />
              <View style={{ alignItems: 'center' }}><Text>{flag(pending)} {pending}</Text><Text style={[k.text, k.mono, { color: C.green }]}>{fmtAmt(converted, pending)}</Text></View>
            </View>
            <View style={[k.rowB, { marginBottom: 6 }]}><Text style={k.muted}>Exchange Rate</Text><Text style={k.text}>1 {activeCurrency} = {rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {pending}</Text></View>
            <View style={[k.rowB, { marginBottom: 14 }]}><Text style={k.muted}>Fee</Text><Text style={{ color: C.green }}>Free</Text></View>
            {fromBalance / (rates[activeCurrency] || 1) > 500 && (
              <Field placeholder="Transaction PIN (if you set one)" secureTextEntry keyboardType="number-pad" maxLength={6} value={txPin} onChangeText={(v) => setTxPin(v.replace(/\D/g, ''))} />
            )}
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn variant="outline" label="Cancel" style={{ flex: 1 }} disabled={busy} onPress={() => setPending(null)} />
          <Btn label={busy ? 'Converting…' : 'Convert All & Switch'} style={{ flex: 1 }} busy={busy} onPress={confirm} />
        </View>
      </Sheet>
    </>
  );
}
