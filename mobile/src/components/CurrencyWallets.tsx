// Port of src/pages/MultiCurrencyWallet.tsx (used by both /currencies and /convert).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, Box, Btn, Empty, Field, k, Loading, Page, Select, SECONDARY } from '@/components/kit';
import { RateAlerts } from '@/components/RateAlerts';
import { SuccessCheck } from '@/components/SuccessCheck';
import { CURRENCIES } from '@/constants/currencies';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { slotLimitMessage, useMultiCurrencyWallet } from '@/hooks/useMultiCurrencyWallet';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NGN', 'KES', 'ZAR', 'INR', 'BRL', 'MXN', 'CNY', 'KRW', 'SGD', 'HKD', 'SEK', 'NOK', 'DKK', 'BTC', 'ETH'];
const n24 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function CurrencyWallets({ mode }: { mode?: 'convert' }) {
  const { wallets, isLoading: walletsLoading, addCurrency, convertCurrency, maxCurrencies, slotsUsed, slotsRemaining, tier } = useMultiCurrencyWallet();
  const { rates, isLive } = useExchangeRates();
  const isConvertView = mode === 'convert';
  const [showConvert, setShowConvert] = useState(isConvertView);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState('');
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [convertAmount, setConvertAmount] = useState('');
  const [justConverted, setJustConverted] = useState(false);
  const { run, busy: isConverting } = useSingleFlight();

  useEffect(() => {
    if (!justConverted) return;
    const t = setTimeout(() => setJustConverted(false), 1800);
    return () => clearTimeout(t);
  }, [justConverted]);

  const sym = (code: string) => CURRENCIES.find((c) => c.code === code)?.symbol || code;
  const name = (code: string) => CURRENCIES.find((c) => c.code === code)?.name || code;
  const totalUSD = wallets.reduce((sum, w) => sum + w.balance / (rates[w.currency] || 1), 0);
  const availableToAdd = AVAILABLE_CURRENCIES.filter((c) => !wallets.find((w) => w.currency === c));
  const convRate = fromCurrency && toCurrency ? (rates[toCurrency] || 1) / (rates[fromCurrency] || 1) : 0;
  const convertedPreview = convertAmount && parseFloat(convertAmount) > 0 ? parseFloat(convertAmount) * convRate : 0;

  const handleAddCurrency = async () => {
    if (!newCurrency || addCurrency.isPending) return;
    try {
      await addCurrency.mutateAsync(newCurrency);
      toast.success(`${newCurrency} wallet created`);
      setNewCurrency('');
      setShowAddCurrency(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleConvert = () =>
    run(async () => {
      haptic.light();
      const amt = parseFloat(convertAmount);
      if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
      if (fromCurrency === toCurrency) { toast.error('Select different currencies'); return; }
      if (!fromCurrency || !toCurrency) { toast.error('Select currencies'); return; }
      try {
        const result = await convertCurrency.mutateAsync({ fromCurrency, toCurrency, amount: amt, rate: convRate });
        toast.success(`Converted ${amt} ${fromCurrency} → ${result.convertedAmount.toFixed(4)} ${toCurrency}`);
        setConvertAmount('');
        setShowConvert(false);
        setJustConverted(true);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || 'Conversion failed');
      }
    });

  if (walletsLoading) return <Loading />;

  return (
    <Page
      title={isConvertView ? 'Convert' : 'Multi-Currency'}
      sub={isConvertView ? 'Move value between your currency wallets' : 'Hold, convert and spend in any currency'}
      right={<Badge label={isLive ? 'Live' : 'Demo'} color={isLive ? C.green : C.muted} />}>
      {justConverted && <View style={{ marginBottom: 12 }}><SuccessCheck size={64} /></View>}
      <Box i={1}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Ionicons name="globe-outline" size={16} color={C.muted} />
          <Text style={k.muted}>Total value (USD)</Text>
        </View>
        <Text style={[k.title, k.mono, { marginTop: 4 }]}>${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <Text style={[k.muted, { marginTop: 4 }]}>{slotsUsed}/{maxCurrencies} currency slots · {tier}</Text>
      </Box>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn
          small
          variant="outline"
          icon="add"
          label="Add currency"
          style={{ flex: 1, opacity: slotsRemaining <= 0 ? 0.6 : 1 }}
          onPress={() => {
            if (slotsRemaining <= 0) { toast.error(slotLimitMessage(tier, maxCurrencies)); return; }
            setShowAddCurrency(!showAddCurrency);
            setShowConvert(false);
          }}
        />
        <Btn small variant="outline" icon="swap-horizontal" label="Convert" style={{ flex: 1 }} disabled={wallets.length < 2} onPress={() => { setShowConvert(!showConvert); setShowAddCurrency(false); }} />
      </View>

      {showAddCurrency && (
        <Box i={0}>
          <Text style={[k.h3, { marginBottom: 10 }]}>Add currency wallet</Text>
          <Select value={newCurrency} onChange={setNewCurrency} placeholder="Select currency" options={availableToAdd.map((c) => ({ value: c, label: `${c} — ${name(c)}` }))} />
          <Btn label="Create wallet" onPress={handleAddCurrency} busy={addCurrency.isPending} disabled={!newCurrency} />
        </Box>
      )}

      {showConvert && (
        <Box i={0}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="swap-horizontal" size={16} color={C.text} />
            <Text style={k.h3}>Convert Currency</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Select label="From" value={fromCurrency} onChange={setFromCurrency} placeholder="From" options={wallets.map((w) => ({ value: w.currency, label: `${w.currency} (${sym(w.currency)}${w.balance.toFixed(2)})` }))} />
            <Select label="To" value={toCurrency} onChange={setToCurrency} placeholder="To" options={wallets.filter((w) => w.currency !== fromCurrency).map((w) => ({ value: w.currency, label: `${w.currency} (${sym(w.currency)}${w.balance.toFixed(2)})` }))} />
          </View>
          <Field placeholder="Amount" keyboardType="decimal-pad" value={convertAmount} onChangeText={setConvertAmount} />
          {fromCurrency ? (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {[0.25, 0.5, 1].map((frac) => {
                const bal = wallets.find((w) => w.currency === fromCurrency)?.balance ?? 0;
                const label = frac === 1 ? 'Max' : frac === 0.5 ? '50%' : '25%';
                return <Btn key={label} small variant="secondary" label={label} style={{ flex: 1 }} disabled={bal <= 0} onPress={() => setConvertAmount(String(Number((bal * frac).toFixed(4))))} />;
              })}
            </View>
          ) : null}
          {convertedPreview > 0 && fromCurrency && toCurrency ? (
            <View style={{ backgroundColor: SECONDARY, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <Text style={k.muted}>You convert</Text>
              <Text style={[k.text, { fontWeight: '600' }]}>
                {sym(fromCurrency)}{n24(parseFloat(convertAmount || '0'))} {fromCurrency} → {sym(toCurrency)}{n24(convertedPreview)} {toCurrency}
              </Text>
              <Text style={[k.muted, { fontSize: 12 }]}>Rate: 1 {fromCurrency} = {convRate.toFixed(6)} {toCurrency}</Text>
            </View>
          ) : null}
          <Btn label="Convert" icon="swap-horizontal" onPress={handleConvert} busy={isConverting} disabled={!convertAmount || parseFloat(convertAmount) <= 0 || !fromCurrency || !toCurrency} />
          {wallets.length < 2 && <Text style={[k.muted, { marginTop: 8, textAlign: 'center' }]}>Add at least two currency wallets to convert between them.</Text>}
        </Box>
      )}

      <Text style={[k.h3, { marginVertical: 8 }]}>Your Wallets</Text>
      {wallets.length === 0 ? (
        <Box i={2}><Empty icon="globe-outline" text="No currency wallets yet. Add your first currency above." /></Box>
      ) : (
        wallets.map((w, i) => (
          <Box key={w.currency} i={2 + i} style={[k.rowB, { padding: 14 }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SECONDARY, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.text, fontWeight: '700' }}>{sym(w.currency)}</Text>
              </View>
              <View>
                <Text style={k.h3}>{w.currency}</Text>
                <Text style={k.muted}>{name(w.currency)}</Text>
              </View>
            </View>
            <Text style={[k.text, k.mono]}>{sym(w.currency)}{n24(Number(w.balance))}</Text>
          </Box>
        ))
      )}
      <RateAlerts />
    </Page>
  );
}
