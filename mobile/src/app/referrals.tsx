// Port of src/pages/Referrals.tsx (redeem-referral via useReferrals; native share sheet).
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { AMBER, Badge, Box, Btn, Field, IconDot, k, Page, SectionLabel, SECONDARY } from '@/components/kit';
import { useReferrals } from '@/hooks/useReferrals';
import { getErrorMessage } from '@/lib/errors';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

export default function Referrals() {
  const { referralCode, referrals, redeemCode, completedCount, pendingCount, totalEarned } = useReferrals();
  const [redeemInput, setRedeemInput] = useState('');
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  const shareLink = async () => {
    const text = `Join Ξ╳oSky and we both get $10! Use my referral code: ${referralCode}`;
    try {
      await Share.share({ title: 'Ξ╳oSky Referral', message: text });
    } catch {
      await Clipboard.setStringAsync(text);
      toast.success('Share text copied to clipboard!');
    }
  };
  const handleRedeem = async () => {
    if (!redeemInput.trim() || redeemCode.isPending) return;
    try {
      await redeemCode.mutateAsync(redeemInput.trim());
      toast.success('Referral redeemed! $10 bonus credited 🎉');
      setRedeemInput('');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to redeem code');
    }
  };
  const milestones = [
    { count: 1, reward: '$10', label: 'First Referral' },
    { count: 5, reward: '$50 + bonus', label: '5 Friends' },
    { count: 10, reward: '$100 + VIP', label: '10 Friends' },
    { count: 25, reward: '$250 + Metal+', label: '25 Friends' },
  ];

  return (
    <Page title="Refer & Earn" sub="Invite friends and you both earn $10">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { icon: 'person-add-outline' as const, color: C.green, v: String(completedCount), l: 'Referred' },
          { icon: 'cash-outline' as const, color: C.green, v: `$${totalEarned}`, l: 'Earned' },
          { icon: 'trophy-outline' as const, color: AMBER, v: String(pendingCount), l: 'Pending' },
        ].map((s, i) => (
          <Box key={s.l} i={1 + i} style={{ flex: 1, alignItems: 'center', padding: 12 }}>
            <Ionicons name={s.icon} size={20} color={s.color} />
            <Text style={[k.text, k.mono, { fontSize: 22, marginTop: 6 }]}>{s.v}</Text>
            <Text style={k.caption}>{s.l}</Text>
          </Box>
        ))}
      </View>
      <Box i={4}>
        <Text style={[k.h3, { marginBottom: 10 }]}>Your Referral Code</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <View style={{ flex: 1, backgroundColor: SECONDARY, borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={[k.mono, { color: C.text, fontSize: 20, letterSpacing: 3 }]}>{referralCode || 'Loading...'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Copy" onPress={copyCode} style={{ width: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color={copied ? C.green : C.text} />
          </Pressable>
        </View>
        <Btn label="Share with Friends" icon="share-outline" onPress={shareLink} />
      </Box>
      <Box i={5}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="gift-outline" size={16} color={AMBER} />
          <Text style={k.h3}>Have a Referral Code?</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field value={redeemInput} onChangeText={(t) => setRedeemInput(t.toUpperCase())} placeholder="Enter code" maxLength={15} autoCapitalize="characters" />
          </View>
          <Btn label="Redeem" onPress={handleRedeem} busy={redeemCode.isPending} disabled={!redeemInput.trim()} style={{ height: 48 }} />
        </View>
      </Box>
      <Box i={6}>
        <Text style={[k.h3, { marginBottom: 10 }]}>Referral Milestones</Text>
        {milestones.map((m) => {
          const achieved = completedCount >= m.count;
          return (
            <View key={m.count} style={[k.rowB, { padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: achieved ? C.green + '0D' : SECONDARY + 'AA' }]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: achieved ? C.green : SECONDARY, alignItems: 'center', justifyContent: 'center' }}>
                  {achieved ? <Ionicons name="checkmark" size={16} color={C.bg} /> : <Text style={[k.muted, { fontWeight: '700' }]}>{m.count}</Text>}
                </View>
                <View>
                  <Text style={[k.text, { fontSize: 14 }]}>{m.label}</Text>
                  <Text style={k.muted}>{m.reward}</Text>
                </View>
              </View>
              {achieved && <Badge label="Unlocked" />}
            </View>
          );
        })}
      </Box>
      {referrals.length > 0 && (
        <>
          <SectionLabel>Referral History</SectionLabel>
          {referrals.map((r, i) => (
            <Box key={r.id} i={Math.min(7 + i, 16)} style={[k.rowB, { padding: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <IconDot name="person-add-outline" size={32} color={r.status === 'completed' ? C.green : C.muted} bg={r.status === 'completed' ? C.green + '1A' : undefined} />
                <View>
                  <Text style={[k.text, { fontSize: 14 }]}>{r.status === 'completed' ? 'Friend joined' : 'Invite pending'}</Text>
                  <Text style={k.muted}>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</Text>
                </View>
              </View>
              <Text style={[k.mono, { color: r.status === 'completed' ? C.green : C.muted }]}>{r.status === 'completed' ? `+$${r.reward_amount}` : 'Pending'}</Text>
            </Box>
          ))}
        </>
      )}
    </Page>
  );
}
