// Port of src/pages/SpendingAnalytics.tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, isAfter, startOfWeek, subDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Bars, Donut } from '@/components/Chart';
import { Badge, Box, IconDot, k, Loading, Page, Segmented } from '@/components/kit';
import { useTransactions } from '@/hooks/useTransactions';
import { C } from '@/lib/theme';

const CATEGORY_MAP: Record<string, { label: string }> = {
  send: { label: 'Transfers Out' },
  purchase: { label: 'Shopping' },
  bill_payment: { label: 'Bills' },
  withdrawal: { label: 'Withdrawals' },
  conversion: { label: 'Conversions' },
};
const PIE_COLORS = ['hsl(0, 72%, 51%)', 'hsl(280, 70%, 55%)', 'hsl(38, 92%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(180, 60%, 45%)', 'hsl(142, 71%, 45%)'];
type TimeRange = '7d' | '30d' | 'all';
const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2 });

export default function SpendingAnalytics() {
  const { transactions, isLoading } = useTransactions();
  const [range, setRange] = useState<TimeRange>('30d');

  const filtered = useMemo(() => {
    if (range === 'all') return transactions;
    const cutoff = subDays(new Date(), range === '7d' ? 7 : 30);
    return transactions.filter((t) => isAfter(new Date(t.created_at), cutoff));
  }, [transactions, range]);
  const spending = useMemo(() => filtered.filter((t) => Number(t.amount) < 0), [filtered]);
  const income = useMemo(() => filtered.filter((t) => Number(t.amount) > 0), [filtered]);
  const totalSpending = spending.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    spending.forEach((t) => {
      const cat = t.type || 'other';
      map.set(cat, (map.get(cat) || 0) + Math.abs(Number(t.amount)));
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ name: CATEGORY_MAP[key]?.label || key, value: Math.round(value * 100) / 100, type: key }))
      .sort((a, b) => b.value - a.value);
  }, [spending]);

  const weeklyData = useMemo(() => {
    const weeks = new Map<string, { spent: number; earned: number }>();
    const now = new Date();
    for (let i = 3; i >= 0; i--) weeks.set(format(startOfWeek(subDays(now, i * 7)), 'MMM d'), { spent: 0, earned: 0 });
    filtered.forEach((t) => {
      const entry = weeks.get(format(startOfWeek(new Date(t.created_at)), 'MMM d'));
      if (entry) {
        const amt = Number(t.amount);
        if (amt < 0) entry.spent += Math.abs(amt);
        else entry.earned += amt;
      }
    });
    return Array.from(weeks.entries()).map(([name, d]) => ({ name, spent: Math.round(d.spent * 100) / 100, earned: Math.round(d.earned * 100) / 100 }));
  }, [filtered]);

  if (isLoading) return <Loading />;
  const net = totalIncome - totalSpending;

  return (
    <Page title="Spending Analytics" sub="Understand where your money goes">
      <View style={{ marginBottom: 12 }}>
        <Segmented
          options={[{ value: '7d', label: '7 Days' }, { value: '30d', label: '30 Days' }, { value: 'all', label: 'All Time' }]}
          value={range}
          onChange={(v) => setRange(v as TimeRange)}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Box i={1} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <IconDot size={28} name="arrow-down" color={C.green} bg={C.green + '1A'} />
            <Text style={k.muted}>Income</Text>
          </View>
          <Text style={[k.h2, k.mono, { color: C.green, marginTop: 8 }]}>+${money(totalIncome)}</Text>
        </Box>
        <Box i={2} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <IconDot size={28} name="arrow-up" color={C.red} bg={C.red + '1A'} />
            <Text style={k.muted}>Spending</Text>
          </View>
          <Text style={[k.h2, k.mono, { color: C.red, marginTop: 8 }]}>-${money(totalSpending)}</Text>
        </Box>
      </View>
      <Box i={3} style={k.rowB}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name={net >= 0 ? 'trending-up' : 'trending-down'} size={16} color={net >= 0 ? C.green : C.red} />
          <Text style={k.text}>Net Flow</Text>
        </View>
        <Text style={[k.h3, k.mono, { color: net >= 0 ? C.green : C.red }]}>{net >= 0 ? '+' : '-'}${money(Math.abs(net))}</Text>
      </Box>

      {categoryData.length > 0 && (
        <>
          <Text style={[k.h3, { marginVertical: 8 }]}>Spending by Category</Text>
          <Box i={4} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Donut data={categoryData.map((c) => c.value)} colors={PIE_COLORS} size={120} />
            <View style={{ flex: 1, gap: 8 }}>
              {categoryData.slice(0, 5).map((cat, i) => {
                const pct = totalSpending > 0 ? Math.round((cat.value / totalSpending) * 100) : 0;
                return (
                  <View key={cat.type} style={k.rowB}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <Text style={[k.text, { fontSize: 12 }]} numberOfLines={1}>{cat.name}</Text>
                    </View>
                    <Text style={[k.text, k.mono, { fontSize: 12, marginRight: 6 }]}>${cat.value.toFixed(2)}</Text>
                    <Badge label={`${pct}%`} color={C.muted} />
                  </View>
                );
              })}
            </View>
          </Box>
        </>
      )}

      <Text style={[k.h3, { marginVertical: 8 }]}>Weekly Trend</Text>
      <Box i={5}>
        <Bars rows={weeklyData} series={[{ key: 'earned', color: 'hsl(142, 71%, 45%)', name: 'Earned' }, { key: 'spent', color: 'hsl(0, 72%, 51%)', name: 'Spent' }]} />
      </Box>

      <Text style={[k.h3, { marginVertical: 8 }]}>Largest Expenses</Text>
      {spending.slice(0, 5).map((tx, i) => (
        <Box key={tx.id} i={6 + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
          <IconDot size={34} name="cash-outline" color={C.red} bg={C.red + '1A'} />
          <View style={{ flex: 1 }}>
            <Text style={[k.text, { fontSize: 14 }]} numberOfLines={1}>{tx.description || tx.type}</Text>
            <Text style={k.muted}>{format(new Date(tx.created_at), 'MMM d, yyyy')}</Text>
          </View>
          <Text style={[k.text, k.mono, { color: C.red }]}>-${Math.abs(Number(tx.amount)).toFixed(2)}</Text>
        </Box>
      ))}
      {spending.length === 0 && <Text style={[k.muted, { textAlign: 'center', paddingVertical: 24 }]}>No spending data yet</Text>}
    </Page>
  );
}
