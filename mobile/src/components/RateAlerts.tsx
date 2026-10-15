// Port of src/components/RateAlerts.tsx (rate_alerts table via useRateAlerts).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Box, Btn, Empty, Field, IconDot, k, Select } from '@/components/kit';
import { CURRENCIES } from '@/constants/currencies';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useRateAlerts } from '@/hooks/useRateAlerts';
import { getErrorMessage } from '@/lib/errors';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

const ALERT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'BTC', 'ETH', 'NGN', 'KES', 'ZAR', 'INR', 'BRL', 'MXN'];

export function RateAlerts() {
  const { activeAlerts, triggeredAlerts, isLoading, createAlert, deleteAlert } = useRateAlerts();
  const { rates } = useExchangeRates();
  const [showCreate, setShowCreate] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [targetRate, setTargetRate] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const sym = (code: string) => CURRENCIES.find((c) => c.code === code)?.symbol || code;
  const currentRate = (rates[toCurrency] || 1) / (rates[fromCurrency] || 1);

  const handleCreate = async () => {
    const rate = parseFloat(targetRate);
    if (!rate || rate <= 0) { toast.error('Enter a valid target rate'); return; }
    if (fromCurrency === toCurrency) { toast.error('Select different currencies'); return; }
    try {
      await createAlert.mutateAsync({ from_currency: fromCurrency, to_currency: toCurrency, target_rate: rate, direction });
      toast.success('Rate alert created');
      setTargetRate('');
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <View style={{ marginTop: 8 }}>
      <View style={[k.rowB, { marginBottom: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="notifications-outline" size={16} color={C.green} />
          <Text style={k.h3}>Rate Alerts</Text>
          {activeAlerts.length > 0 && <Badge label={`${activeAlerts.length} active`} color={C.muted} />}
        </View>
        <Btn small variant="outline" icon="add" label="New Alert" onPress={() => setShowCreate(!showCreate)} />
      </View>
      {showCreate && (
        <Box i={0}>
          <View style={[k.rowB, { marginBottom: 10 }]}>
            <Text style={k.h3}>Create Rate Alert</Text>
            <Pressable accessibilityLabel="Close" onPress={() => setShowCreate(false)} hitSlop={10}><Ionicons name="close" size={18} color={C.muted} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Select label="From" value={fromCurrency} onChange={setFromCurrency} placeholder="From" options={ALERT_CURRENCIES.map((c) => ({ value: c, label: `${sym(c)} ${c}` }))} />
            <Select label="To" value={toCurrency} onChange={setToCurrency} placeholder="To" options={ALERT_CURRENCIES.filter((c) => c !== fromCurrency).map((c) => ({ value: c, label: `${sym(c)} ${c}` }))} />
          </View>
          <View style={{ backgroundColor: '#1C1C1F', borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <Text style={k.muted}>Current rate</Text>
            <Text style={[k.text, k.mono, { fontSize: 14 }]}>1 {fromCurrency} = {currentRate.toFixed(6)} {toCurrency}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Select label="Alert when rate goes" value={direction} onChange={(v) => setDirection(v as 'above' | 'below')} placeholder="Above" options={[{ value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }]} />
            <View style={{ flex: 1 }}>
              <Field label="Target rate" keyboardType="decimal-pad" placeholder={currentRate.toFixed(4)} value={targetRate} onChangeText={setTargetRate} />
            </View>
          </View>
          <Btn label="Create Alert" icon="notifications-outline" onPress={handleCreate} busy={createAlert.isPending} disabled={!targetRate} />
        </Box>
      )}
      {isLoading ? null : activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
        <Box i={1}>
          <Empty icon="notifications-outline" text="No rate alerts yet. Create one to get notified when rates hit your target." />
        </Box>
      ) : (
        <>
          {activeAlerts.map((alert, i) => {
            const rate = (rates[alert.to_currency] || 1) / (rates[alert.from_currency] || 1);
            const progress = alert.direction === 'above' ? Math.min((rate / alert.target_rate) * 100, 100) : Math.min((alert.target_rate / rate) * 100, 100);
            return (
              <Box key={alert.id} i={1 + i} style={[k.rowB, { padding: 12 }]}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
                  <IconDot size={32} name={alert.direction === 'above' ? 'trending-up' : 'trending-down'} color={alert.direction === 'above' ? C.green : C.red} />
                  <View style={{ flex: 1 }}>
                    <Text style={[k.text, { fontSize: 14, fontWeight: '600' }]}>{alert.from_currency}/{alert.to_currency}</Text>
                    <Text style={k.muted}>{alert.direction === 'above' ? 'Above' : 'Below'} {alert.target_rate} · Now: {rate.toFixed(4)}</Text>
                  </View>
                </View>
                <Badge label={`${progress.toFixed(0)}%`} color={C.muted} />
                <Pressable accessibilityLabel="Delete" hitSlop={10} style={{ marginLeft: 10 }} onPress={() => deleteAlert.mutateAsync(alert.id).then(() => toast.success('Alert deleted'))}>
                  <Ionicons name="trash-outline" size={16} color={C.muted} />
                </Pressable>
              </Box>
            );
          })}
          {triggeredAlerts.length > 0 && (
            <>
              <Text style={[k.caption, { marginVertical: 6 }]}>Triggered</Text>
              {triggeredAlerts.slice(0, 5).map((alert) => (
                <Box key={alert.id} i={0} style={[k.rowB, { padding: 12, opacity: 0.8 }]}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
                    <IconDot size={32} name="checkmark" color={C.green} bg={C.green + '1A'} />
                    <View>
                      <Text style={[k.text, { fontSize: 14, fontWeight: '600' }]}>{alert.from_currency}/{alert.to_currency}</Text>
                      <Text style={k.muted}>Target {alert.target_rate} {alert.direction === 'above' ? '↑' : '↓'} · Triggered</Text>
                    </View>
                  </View>
                  <Pressable accessibilityLabel="Delete" hitSlop={10} onPress={() => deleteAlert.mutateAsync(alert.id)}>
                    <Ionicons name="trash-outline" size={16} color={C.muted} />
                  </Pressable>
                </Box>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
