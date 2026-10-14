import { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TxRow } from '@/components/TxRow';
import { Title, ui } from '@/components/ui';
import { useTransactions } from '@/hooks/data';
import { getTransactionTitle } from '@/lib/formatTransaction';
import { C } from '@/lib/theme';

export default function Activity() {
  const insets = useSafeAreaInsets();
  const { transactions, isLoading, refetch } = useTransactions();
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const list = q
    ? transactions.filter((t) => `${getTransactionTitle(t)} ${t.recipient ?? ''} ${t.description ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    : transactions;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
      <Title sub="All wallet movements">Activity</Title>
      <TextInput style={ui.input} placeholder="Search activity" placeholderTextColor={C.muted} value={q} onChangeText={setQ} />
      <FlatList
        data={list}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => <TxRow tx={item} i={Math.min(index, 12)} />}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={ui.h2}>{q ? 'No matching transactions' : 'No transactions yet'}</Text>
              {!q && <Text style={[ui.muted, { textAlign: 'center' }]}>Your transaction history will appear here once you make your first deposit, send money, or trade.</Text>}
            </View>
          )
        }
      />
    </View>
  );
}
