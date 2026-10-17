// Same admin credit as the web control center. The Android APK and Expo Go share this screen.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Btn, Field, k, Loading, Page } from '@/components/kit';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

export default function AdminCredit() {
  const { user, isLoading } = useAuth();
  const [checkedId, setCheckedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    const id = user.id;
    let cancelled = false;
    (async () => {
      await supabase.rpc('claim_founder_admin');
      const { data } = await supabase.rpc('has_role', { _user_id: id, _role: 'admin' });
      if (!cancelled) {
        setCheckedId(id);
        setIsAdmin(!!data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isLoading]);

  const known = !!user && checkedId === user.id;
  if (isLoading || (user && !known)) return <Page title="Admin"><Loading /></Page>;
  if (!user || !isAdmin) return <Redirect href="/(tabs)/menu" />;

  const add = async () => {
    const target = email.trim().toLowerCase();
    const value = Number(amount);
    if (!target || !Number.isFinite(value) || value <= 0) {
      toast.error('Enter an email and a positive amount');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_credit_wallet', {
      p_email: target,
      p_amount: value,
      p_currency: 'USD',
    });
    setBusy(false);
    if (error) {
      haptic.error();
      toast.error(error.message || 'Could not add money');
      return;
    }
    haptic.success();
    toast.success(`Added $${value.toFixed(2)}. Balance $${Number(data || 0).toFixed(2)}`);
    setAmount('');
  };

  return (
    <Page title="Add money" sub="Only an admin can add a balance. Send, receive, and trades stay open.">
      <Field label="Email" autoCapitalize="none" keyboardType="email-address" placeholder="user@email.com" value={email} onChangeText={setEmail} />
      <Field label="Amount (USD)" keyboardType="decimal-pad" placeholder="25.00" value={amount} onChangeText={setAmount} />
      <Btn label="Add to wallet" icon="add" busy={busy} disabled={!email || !amount} onPress={add} />
      <Text style={[k.muted, { marginTop: 12 }]}>New accounts still receive the $25 test bonus. This screen is the same on the APK and Expo Go.</Text>
    </Page>
  );
}
