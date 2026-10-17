// Port of src/pages/Savings.tsx (6% APY unchanged; same savings_transfer calls via useSavings).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AreaChart } from '@/components/Chart';
import { FeatureGate } from '@/components/FeatureGate';
import { Badge, Box, Btn, Field, k, Page, Segmented, Stat } from '@/components/kit';
import { useSavings } from '@/hooks/useSavings';
import { formatMoney } from '@/lib/formatCurrency';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';

type TransferDirection = 'to_savings' | 'to_wallet';
const usd2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

export default function Savings() {
  return (
    <FeatureGate feature="features_savings" featureLabel="Savings">
      <SavingsContent />
    </FeatureGate>
  );
}

function SavingsContent() {
  const { apyRate, savingsBalance, walletBalance, monthlyEarnings, dailyEarnings, yearlyEarnings, projectBalance, transferToSavings, transferToWallet, isTransferring } = useSavings();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<TransferDirection>('to_savings');
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const { run, busy } = useSingleFlight();
  const chartData = projectBalance(projectionMonths, monthlyContribution);
  const projectedEnd = chartData[chartData.length - 1];
  const totalProjectedInterest = projectedEnd?.interest ?? 0;

  const handleTransfer = () =>
    run(async () => {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) return;
      if (direction === 'to_savings') await transferToSavings(num);
      else await transferToWallet(num);
      setAmount('');
    });

  const avail = direction === 'to_savings' ? walletBalance : savingsBalance;
  return (
    <Page title="Savings" sub="Grow your money with industry-leading yields" right={<Badge label={`${apyRate}% APY`} />}>
      <Box i={1} tint={C.green}>
        <Text style={k.muted}>Savings Balance</Text>
        <Text style={[k.title, k.mono, { fontSize: 34, marginTop: 4 }]}>${usd2(savingsBalance)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Stat label="Daily" icon="cash-outline" color={C.green} value={`+$${dailyEarnings.toFixed(4)}`} />
          <Stat label="Monthly" icon="calendar-outline" color={C.green} value={`+$${monthlyEarnings.toFixed(2)}`} />
          <Stat label="Yearly" icon="trending-up" color={C.green} value={`+$${yearlyEarnings.toFixed(2)}`} />
        </View>
      </Box>

      <Box i={2}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="swap-horizontal" size={16} color={C.muted} />
          <Text style={k.h3}>Transfer Funds</Text>
        </View>
        <Segmented value={direction} onChange={setDirection} options={[{ value: 'to_savings', label: 'Wallet → Savings' }, { value: 'to_wallet', label: 'Savings → Wallet' }]} />
        <Text style={[k.muted, { marginVertical: 10 }]}>
          Available: <Text style={{ color: C.text, fontWeight: '600' }}>${usd2(avail)}</Text>
        </Text>
        <Field placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={{ fontSize: 18, fontWeight: '600' }} />
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {[10, 25, 50, 100].map((qa) => (
            <Btn key={qa} small variant="secondary" label={`$${qa}`} onPress={() => setAmount(qa.toString())} style={{ flex: 1 }} />
          ))}
          <Btn small variant="secondary" label="Max" onPress={() => setAmount(avail.toString())} style={{ flex: 1 }} />
        </View>
        <Btn label="Transfer" icon="arrow-forward" onPress={handleTransfer} busy={busy || isTransferring} disabled={!amount || parseFloat(amount) <= 0} />
      </Box>

      <Box i={3}>
        <View style={[k.rowB, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name="trending-up" size={16} color={C.green} />
            <Text style={k.h3}>Growth Projection</Text>
          </View>
          <Segmented small value={projectionMonths} onChange={setProjectionMonths} options={[6, 12, 24, 60].map((m) => ({ value: m, label: m < 12 ? `${m}mo` : `${m / 12}yr` }))} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <Text style={k.muted}>Monthly deposit:</Text>
          <Segmented small value={monthlyContribution} onChange={setMonthlyContribution} options={[0, 50, 100, 250, 500].map((c) => ({ value: c, label: `$${c}` }))} />
        </View>
        <AreaChart values={chartData.map((d) => d.balance)} labels={{ left: '0mo', right: `${projectionMonths}mo` }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Stat label="Projected Balance" value={formatMoney(projectedEnd?.balance ?? 0)} />
          <Stat label="Total Interest Earned" color={C.green} value={`+$${usd2(totalProjectedInterest)}`} />
        </View>
      </Box>

      <Box i={4} style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <Ionicons name="shield-checkmark-outline" size={16} color={C.muted} />
        <Text style={[k.muted, { fontSize: 11, flex: 1, lineHeight: 16 }]}>
          Deposits are held at our partner bank and eligible for FDIC insurance up to $250,000. APY is variable and may change. Interest is calculated daily and paid monthly.
        </Text>
      </Box>
    </Page>
  );
}
