// Port of src/components/CurrencyConverter.tsx + ConversionHistory.tsx (calculator only, no wallet writes).
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, Box, Btn, Field, k, Select } from '@/components/kit';
import { CURRENCIES } from '@/constants/currencies';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import type { ConversionResult } from '@/types';

export function CurrencyConverter({ onConvert }: { onConvert: (r: ConversionResult) => void }) {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('BTC');
  const [amount, setAmount] = useState('1000');
  const [result, setResult] = useState<number | null>(null);
  const { rates, isLoading, isLive } = useExchangeRates();
  const handleConvert = () => {
    const n = parseFloat(amount);
    if (isNaN(n)) return;
    const converted = (n / rates[fromCurrency]) * rates[toCurrency];
    setResult(converted);
    onConvert({ from: fromCurrency, to: toCurrency, amount: n, result: converted, timestamp: new Date() });
  };
  const opts = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }));
  return (
    <Box i={3}>
      <View style={[k.rowB, { marginBottom: 10 }]}>
        <Text style={k.h3}>Convert Currency</Text>
        <Badge label={isLoading ? 'Loading rates...' : isLive ? 'Live Rates' : 'Mock Rates'} color={isLive ? undefined : '#71717A'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Select label="From:" value={fromCurrency} onChange={setFromCurrency} placeholder="USD" options={opts} />
        <Select label="To:" value={toCurrency} onChange={setToCurrency} placeholder="BTC" options={opts} />
      </View>
      <Field label="Amount:" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Enter amount" />
      <Btn label={isLoading ? 'Loading Rates...' : 'Convert'} onPress={handleConvert} disabled={isLoading} />
      {result !== null && <Text style={[k.text, { textAlign: 'center', marginTop: 10, fontWeight: '600' }]}>{amount} {fromCurrency} = {result.toFixed(4)} {toCurrency}</Text>}
    </Box>
  );
}

export function ConversionHistory({ history }: { history: ConversionResult[] }) {
  return (
    <Box i={4}>
      <Text style={[k.h3, { marginBottom: 8 }]}>Conversion History</Text>
      {history.length === 0 ? (
        <Text style={k.muted}>No conversions yet. Try converting a currency!</Text>
      ) : (
        history.slice().reverse().map((it, i) => (
          <Text key={i} style={[k.muted, { fontSize: 12, paddingVertical: 4 }]}>
            {it.amount} {it.from} → {it.result.toFixed(4)} {it.to} ({it.timestamp.toLocaleString()})
          </Text>
        ))
      )}
    </Box>
  );
}
