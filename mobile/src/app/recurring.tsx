// Port of src/pages/RecurringPayments.tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Box, Btn, Field, k, Loading, Page, Select } from '@/components/kit';
import { useRecurringPayments } from '@/hooks/useRecurringPayments';
import { getErrorMessage } from '@/lib/errors';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function RecurringPayments() {
  const { payments, isLoading, addPayment, updatePayment, deletePayment } = useRecurringPayments();
  const [showAdd, setShowAdd] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [description, setDescription] = useState('');
  const [nextDate, setNextDate] = useState('');

  const handleAdd = async () => {
    if (addPayment.isPending) return;
    if (!recipient || !amount || !nextDate) { toast.error('Please fill in all required fields'); return; }
    try {
      await addPayment.mutateAsync({ recipient, amount: parseFloat(amount), frequency, description: description || undefined, next_payment_date: nextDate });
      toast.success('Recurring payment created');
      setShowAdd(false); setRecipient(''); setAmount(''); setDescription(''); setNextDate('');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to create');
    }
  };
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updatePayment.mutateAsync({ id, is_active: !isActive });
      toast.success(isActive ? 'Payment paused' : 'Payment resumed');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to update');
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await deletePayment.mutateAsync(id);
      toast.success('Recurring payment deleted');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to delete');
    }
  };

  const activePayments = payments.filter((p) => p.is_active);
  const pausedPayments = payments.filter((p) => !p.is_active);
  const totalMonthly = activePayments.reduce((sum, p) => {
    const m: Record<string, number> = { daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 0.33, yearly: 0.083 };
    return sum + Number(p.amount) * (m[p.frequency] || 1);
  }, 0);
  const Icon = ({ name, onPress, label }: { name: 'pause' | 'play' | 'trash-outline'; onPress: () => void; label: string }) => (
    <Pressable accessibilityLabel={label} hitSlop={8} onPress={onPress} style={{ padding: 6 }}>
      <Ionicons name={name} size={16} color={C.muted} />
    </Pressable>
  );

  return (
    <Page title="Recurring Payments" sub="Automate your regular transfers" right={<Btn small variant="outline" icon="add" label="New" onPress={() => setShowAdd(!showAdd)} />}>
      <Box i={1}>
        <View style={k.rowB}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Ionicons name="refresh" size={16} color={C.green} />
            <Text style={k.muted}>Est. monthly total</Text>
          </View>
          <Text style={[k.h2, k.mono]}>${totalMonthly.toFixed(2)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <Text style={[k.muted, { color: C.green, fontSize: 12 }]}>{activePayments.length} active</Text>
          {pausedPayments.length > 0 && <Text style={[k.muted, { fontSize: 12 }]}>{pausedPayments.length} paused</Text>}
        </View>
      </Box>
      {showAdd && (
        <Box i={0}>
          <Text style={[k.h3, { marginBottom: 10 }]}>New Recurring Payment</Text>
          <Field placeholder="Recipient (email, handle, or name)" value={recipient} onChangeText={setRecipient} autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} /></View>
            <Select value={frequency} onChange={setFrequency} placeholder="Monthly" options={FREQUENCIES} />
          </View>
          <Field placeholder="Description (optional)" value={description} onChangeText={setDescription} />
          <Field label="First payment date" placeholder="YYYY-MM-DD" value={nextDate} onChangeText={setNextDate} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn variant="outline" label="Cancel" style={{ flex: 1 }} onPress={() => setShowAdd(false)} />
            <Btn label="Create" style={{ flex: 1 }} onPress={handleAdd} busy={addPayment.isPending} />
          </View>
        </Box>
      )}
      {isLoading ? <Loading /> : (
        <>
          {activePayments.length > 0 && (
            <>
              <Text style={[k.h3, { marginVertical: 8 }]}>Active</Text>
              {activePayments.map((p, i) => (
                <Box key={p.id} i={2 + i}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={k.h3} numberOfLines={1}>{p.recipient}</Text>
                      <Text style={k.muted} numberOfLines={1}>{p.description || p.frequency}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[k.text, k.mono]}>${Number(p.amount).toFixed(2)}</Text>
                      <Badge label={p.frequency} color={C.muted} />
                    </View>
                    <Icon name="pause" label="Pause" onPress={() => handleToggle(p.id, p.is_active)} />
                    <Icon name="trash-outline" label="Delete" onPress={() => handleDelete(p.id)} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8 }}>
                    <Ionicons name="calendar-outline" size={12} color={C.muted} />
                    <Text style={[k.muted, { fontSize: 12 }]}>
                      Next: {format(new Date(p.next_payment_date), 'MMM d, yyyy')} ({formatDistanceToNow(new Date(p.next_payment_date), { addSuffix: true })})
                    </Text>
                  </View>
                </Box>
              ))}
            </>
          )}
          {pausedPayments.length > 0 && (
            <>
              <Text style={[k.h3, { marginVertical: 8 }]}>Paused</Text>
              {pausedPayments.map((p) => (
                <Box key={p.id} i={0} style={[k.rowB, { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={k.h3}>{p.recipient}</Text>
                    <Text style={k.muted}>${Number(p.amount).toFixed(2)} · {p.frequency}</Text>
                  </View>
                  <Icon name="play" label="Resume" onPress={() => handleToggle(p.id, p.is_active)} />
                  <Icon name="trash-outline" label="Delete" onPress={() => handleDelete(p.id)} />
                </Box>
              ))}
            </>
          )}
          {payments.length === 0 && !showAdd && (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Ionicons name="refresh" size={32} color={C.muted} />
              <Text style={k.muted}>No recurring payments set up</Text>
              <Btn small variant="outline" icon="add" label="Create your first" onPress={() => setShowAdd(true)} />
            </View>
          )}
        </>
      )}
    </Page>
  );
}
