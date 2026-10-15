// Port of src/pages/BillPay.tsx (same wallet-operation `bill_pay` call, then bills.is_paid).
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Badge, Box, Btn, Field, type IconName, k, Loading, Page, Select, Sheet } from '@/components/kit';
import { FeatureGate } from '@/components/FeatureGate';
import { BILL_PROVIDERS } from '@/constants/bills';
import { type Bill, useBills } from '@/hooks/useBills';
import { invokeWalletOp, useWallet } from '@/hooks/useWallet';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

const BILL_CATEGORIES: { icon: IconName; label: string; color: string }[] = [
  { icon: 'flash-outline', label: 'Electric', color: '#F59E0B' },
  { icon: 'water-outline', label: 'Water', color: '#60A5FA' },
  { icon: 'wifi-outline', label: 'Internet', color: C.green },
  { icon: 'call-outline', label: 'Phone', color: C.green },
  { icon: 'tv-outline', label: 'Streaming', color: C.red },
  { icon: 'home-outline', label: 'Rent', color: C.text },
];

export default function BillPay() {
  return (
    <FeatureGate feature="features_bill_pay" featureLabel="Bill Pay">
      <BillPayContent />
    </FeatureGate>
  );
}

function BillPayContent() {
  const { bills, isLoading, payBill, addBill } = useBills();
  const { balance } = useWallet();
  const [search, setSearch] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState('Electric');
  const [newBiller, setNewBiller] = useState(BILL_PROVIDERS['Electric']?.[0]?.name ?? '');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [confirmBill, setConfirmBill] = useState<Bill | null>(null);
  const { run } = useSingleFlight();

  const handleCategoryChange = (cat: string) => {
    setNewCategory(cat);
    const providers = BILL_PROVIDERS[cat] || [];
    if (providers.length > 0) { setNewBiller(providers[0].name); setNewAmount(providers[0].avgAmount.toFixed(2)); }
    else { setNewBiller(''); setNewAmount(''); }
  };
  const handleProviderChange = (providerName: string) => {
    setNewBiller(providerName);
    const p = (BILL_PROVIDERS[newCategory] || []).find((x) => x.name === providerName);
    if (p) setNewAmount(p.avgAmount.toFixed(2));
  };
  const handlePayClick = (bill: Bill) => {
    if (!bill.account_number) { toast.error('No account number on file. Edit this bill to add one before paying.'); return; }
    setConfirmBill(bill);
  };
  const handleConfirmPay = () =>
    run(async () => {
      const bill = confirmBill;
      if (!bill) return;
      setConfirmBill(null);
      if (bill.amount > balance) { toast.error('Insufficient balance'); return; }
      setPayingId(bill.id);
      try {
        const result = await invokeWalletOp({ operation: 'bill_pay', amount: bill.amount, biller_name: bill.biller_name });
        await payBill.mutateAsync(bill.id);
        const cashback = Number(result?.cashback ?? bill.amount * 0.01);
        haptic.success();
        toast.success(`Paid ${bill.biller_name} — earned $${cashback.toFixed(2)} cashback`);
      } catch (err: unknown) {
        haptic.error();
        toast.error(getErrorMessage(err) || 'Payment failed');
      } finally {
        setPayingId(null);
      }
    });
  const handleAddBill = async () => {
    if (addBill.isPending) return;
    if (!newBiller || !newAmount || !newDueDate || !newAccountNumber.trim()) { toast.error('Fill in all fields including account number'); return; }
    try {
      await addBill.mutateAsync({ biller_name: newBiller, category: newCategory, amount: parseFloat(newAmount), due_date: newDueDate, account_number: newAccountNumber.trim() });
      toast.success('Bill added');
      setShowAdd(false); setNewBiller(''); setNewAmount(''); setNewDueDate(''); setNewAccountNumber('');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to add bill');
    }
  };

  const filtered = bills.filter((b) => !search || b.biller_name.toLowerCase().includes(search.toLowerCase()));
  const unpaid = filtered.filter((b) => !b.is_paid);
  const paid = filtered.filter((b) => b.is_paid);

  return (
    <Page title="Pay Bills" sub="Pay utilities, subscriptions, and more" right={<Btn small variant="outline" icon="add" label="Add" onPress={() => setShowAdd(!showAdd)} />}>
      {showAdd && (
        <Box i={0}>
          <Select label="Category" value={newCategory} onChange={handleCategoryChange} placeholder="Category" options={BILL_CATEGORIES.map((c) => ({ value: c.label, label: c.label }))} />
          <Select label="Provider" value={newBiller} onChange={handleProviderChange} placeholder="Provider" options={(BILL_PROVIDERS[newCategory] || []).map((p) => ({ value: p.name, label: p.name }))} />
          <Field label="Amount ($)" placeholder="Amount" keyboardType="decimal-pad" value={newAmount} onChangeText={setNewAmount} />
          <Field label="Account / Reference Number" placeholder="e.g. 1234-5678-9012" value={newAccountNumber} onChangeText={setNewAccountNumber} />
          <Field placeholder="YYYY-MM-DD" value={newDueDate} onChangeText={setNewDueDate} />
          <Btn label="Add Bill" onPress={handleAddBill} busy={addBill.isPending} />
        </Box>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {BILL_CATEGORIES.map((cat) => (
          <View key={cat.label} style={[k.card, { alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0 }]}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
            <Text style={[k.muted, { fontSize: 12 }]}>{cat.label}</Text>
          </View>
        ))}
      </ScrollView>
      <Field placeholder="Search billers..." value={search} onChangeText={setSearch} />
      {isLoading ? <Loading /> : (
        <>
          {unpaid.length > 0 && (
            <>
              <Text style={[k.h3, { marginVertical: 8 }]}>Upcoming Bills</Text>
              {unpaid.map((bill, i) => (
                <Box key={bill.id} i={1 + i} style={k.rowB}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={k.h3}>{bill.biller_name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Badge label={bill.category} color={C.muted} />
                      <Text style={k.muted}>Due {format(new Date(bill.due_date), 'MMM d')}</Text>
                    </View>
                    {bill.account_number ? <Text style={[k.muted, { fontSize: 11 }]}>Acct: •••• {bill.account_number.slice(-4)}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[k.text, k.mono]}>${Number(bill.amount).toFixed(2)}</Text>
                    <Btn small label="Pay" icon="arrow-forward" onPress={() => handlePayClick(bill)} busy={payingId === bill.id} />
                  </View>
                </Box>
              ))}
            </>
          )}
          {paid.length > 0 && (
            <>
              <Text style={[k.h3, { marginVertical: 8 }]}>Paid</Text>
              {paid.map((bill) => (
                <Box key={bill.id} i={0} style={[k.rowB, { opacity: 0.7 }]}>
                  <View style={{ gap: 4 }}>
                    <Text style={k.h3}>{bill.biller_name}</Text>
                    <Badge label={bill.category} color={C.muted} />
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[k.text, k.mono]}>${Number(bill.amount).toFixed(2)}</Text>
                    <Badge label="Paid" icon="checkmark-circle" />
                  </View>
                </Box>
              ))}
            </>
          )}
          {bills.length === 0 && <Text style={[k.muted, { textAlign: 'center', paddingVertical: 24 }]}>No bills yet. Add a bill to get started!</Text>}
        </>
      )}
      <Sheet open={!!confirmBill} onClose={() => setConfirmBill(null)} title="Confirm Payment">
        <Text style={[k.muted, { marginBottom: 12 }]}>Please review your payment details before proceeding.</Text>
        {confirmBill && (
          <View style={{ gap: 10, marginBottom: 14 }}>
            {[
              ['Provider', confirmBill.biller_name],
              ['Account', `•••• ${(confirmBill.account_number || '').slice(-4)}`],
              ['Category', confirmBill.category],
              ['Amount', `$${Number(confirmBill.amount).toFixed(2)}`],
            ].map(([l, v]) => (
              <View key={l} style={k.rowB}><Text style={k.muted}>{l}</Text><Text style={k.text}>{v}</Text></View>
            ))}
            <View style={k.rowB}><Text style={k.muted}>Cashback (1%)</Text><Text style={[k.text, { color: C.green }]}>+${(confirmBill.amount * 0.01).toFixed(2)}</Text></View>
            <Text style={[k.muted, { fontSize: 12 }]}>By confirming, you authorize this payment from your Ξ╳oSky wallet.</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn variant="outline" label="Cancel" style={{ flex: 1 }} onPress={() => setConfirmBill(null)} />
          <Btn label="Pay Now" icon="arrow-forward" style={{ flex: 1 }} onPress={handleConfirmPay} />
        </View>
      </Sheet>
    </Page>
  );
}
