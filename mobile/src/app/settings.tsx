// Port of src/pages/Settings.tsx: same sections, wording and hooks.
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Badge, Box, Btn, Field, IconName, k, Loading, NavRow, Page } from '@/components/kit';
import { resetOnboarding } from '@/components/OnboardingTutorial';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { useTrustedDevices } from '@/hooks/useTrustedDevices';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { prefs } from '@/lib/prefs';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

function Pref({ icon, title, sub, right }: { icon: IconName; title: string; sub: string; right: React.ReactNode }) {
  return (
    <View style={[k.rowB, { paddingVertical: 10 }]}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
        <Ionicons name={icon} size={18} color={C.muted} />
        <View><Text style={k.h3}>{title}</Text><Text style={k.muted}>{sub}</Text></View>
      </View>
      {right}
    </View>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const { isSubscribed } = useSubscription();
  const { isPinSet, setupPin, removePin, PIN_THRESHOLD } = useTransactionPin();
  const { devices, currentDeviceId, isCurrentDeviceTrusted, trustCurrentDevice, removeDevice } = useTrustedDevices();
  const [fullName, setFullName] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [hideBalance, setHideBalanceState] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [deviceName, setDeviceName] = useState('');
  useEffect(() => { prefs.get('exo.hideBalance').then((v) => setHideBalanceState(v === '1')); }, []);
  const setHideBalance = (v: boolean) => { setHideBalanceState(v); void prefs.set('exo.hideBalance', v ? '1' : '0'); };

  const displayName = fullName ?? profile?.full_name ?? '';
  const displayHandle = handle ?? profile?.handle ?? '';
  const hasChanges = (fullName !== null && fullName !== (profile?.full_name ?? '')) || (handle !== null && handle !== (profile?.handle ?? ''));

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (fullName !== null && fullName !== (profile?.full_name ?? '')) updates.full_name = fullName;
      if (handle !== null && handle !== (profile?.handle ?? '')) updates.handle = handle;
      if (Object.keys(updates).length === 0) { toast.info('No changes to save'); return; }
      await updateProfile.mutateAsync(updates);
      toast.success('Profile updated');
      setFullName(null); setHandle(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  const handleAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    const a = res.assets?.[0];
    if (res.canceled || !a) return;
    if ((a.fileSize ?? 0) > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setIsUploading(true);
    try {
      const body = await (await fetch(a.uri)).arrayBuffer();
      if (body.byteLength > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
      const type = a.mimeType && /^image\/(png|jpeg|webp)$/.test(a.mimeType) ? a.mimeType : 'image/jpeg';
      await uploadAvatar({ name: a.fileName || `avatar.${type.split('/')[1]}`, body, type });
      toast.success('Avatar updated');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };
  const handleSetupPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) { toast.error('PIN must be 4-6 digits'); return; }
    if (newPin !== confirmPin) { toast.error("PINs don't match"); return; }
    try {
      await setupPin(newPin);
      toast.success('Transaction PIN set. It is checked by the server for transfers over $500.');
      setShowPinSetup(false); setNewPin(''); setConfirmPin('');
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  if (isLoading) return <Page title="Settings"><Loading /></Page>;
  return (
    <Page title="Settings" sub="Manage your profile, security, and preferences">
      <Box i={0} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Avatar" disabled={isUploading} onPress={handleAvatar}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.green + '22', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: 64, height: 64 }} accessibilityLabel="Avatar" /> : <Text style={{ color: C.green, fontSize: 24, fontWeight: '700' }}>{displayName?.[0]?.toUpperCase() || '?'}</Text>}
          </View>
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={isUploading ? 'hourglass-outline' : 'camera'} size={13} color={C.bg} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={[k.h3, { fontSize: 17 }]}>{displayName || 'Your Name'}</Text>{isSubscribed && <Badge label="Pro" icon="diamond-outline" />}</View>
          <Text style={k.muted}>{displayHandle || '@handle'}</Text>
          <Text style={k.muted}>{user?.email}</Text>
        </View>
      </Box>

      <Box i={1}>
        <Text style={[k.h3, { marginBottom: 10 }]}>Profile Details</Text>
        <Field label="Display Name" value={displayName} onChangeText={setFullName} placeholder="Your full name" />
        <Field label="Handle" value={displayHandle} onChangeText={setHandle} placeholder="@yourhandle" autoCapitalize="none" />
        <Field label="Email" value={user?.email || ''} editable={false} />
        <Text style={[k.muted, { fontSize: 11, marginTop: -6, marginBottom: 10 }]}>Email cannot be changed</Text>
        <Btn icon="save-outline" label={hasChanges ? 'Save Changes' : 'No Changes'} busy={isSaving} disabled={!hasChanges} onPress={handleSave} />
      </Box>

      <Box i={2}>
        <View style={[k.rowB, { marginBottom: 6 }]}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="key-outline" size={16} color={C.green} /><Text style={k.h3}>Transaction PIN</Text></View>
          <Badge label={isPinSet ? 'Active' : 'Not Set'} color={isPinSet ? C.green : C.muted} />
        </View>
        <Text style={[k.muted, { marginBottom: 10 }]}>Require a 4-6 digit PIN for transactions over ${PIN_THRESHOLD}. Adds an extra layer of security to high-value transfers.</Text>
        {isPinSet && !showPinSetup ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small variant="outline" icon="key-outline" label="Change PIN" onPress={() => setShowPinSetup(true)} />
            <Btn small variant="outline" label="Remove" onPress={() => { void removePin().then(() => toast.success('PIN removed')).catch((err: unknown) => toast.error(getErrorMessage(err))); }} />
          </View>
        ) : !showPinSetup ? (
          <Btn small icon="add" label="Set Up PIN" onPress={() => setShowPinSetup(true)} />
        ) : (
          <View>
            <Field secureTextEntry keyboardType="number-pad" maxLength={6} placeholder="Enter new PIN (4-6 digits)" value={newPin} onChangeText={(t) => setNewPin(t.replace(/\D/g, ''))} />
            <Field secureTextEntry keyboardType="number-pad" maxLength={6} placeholder="Confirm PIN" value={confirmPin} onChangeText={(t) => setConfirmPin(t.replace(/\D/g, ''))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small variant="outline" label="Cancel" onPress={() => { setShowPinSetup(false); setNewPin(''); setConfirmPin(''); }} />
              <Btn small label="Save PIN" disabled={newPin.length < 4 || confirmPin.length < 4} onPress={handleSetupPin} />
            </View>
          </View>
        )}
      </Box>

      <Box i={3}>
        <View style={[k.rowB, { marginBottom: 6 }]}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="phone-portrait-outline" size={16} color={C.green} /><Text style={k.h3}>Trusted Devices</Text></View>
          <Badge label={`${devices.length} device${devices.length !== 1 ? 's' : ''}`} color={C.muted} />
        </View>
        <Text style={[k.muted, { marginBottom: 10 }]}>Trusted devices skip Face ID verification when accessing card details.</Text>
        {!isCurrentDeviceTrusted && (
          <View style={{ backgroundColor: '#1C1C1F', borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={[k.text, { marginBottom: 8 }]}>This device is not trusted</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}><Field placeholder="Device name (optional)" value={deviceName} onChangeText={setDeviceName} /></View>
              <Btn small icon="add" label="Trust" onPress={() => { trustCurrentDevice(deviceName || undefined); toast.success('Device added to trusted list'); setDeviceName(''); }} />
            </View>
          </View>
        )}
        {devices.map((d) => (
          <View key={d.id} style={[k.rowB, { paddingVertical: 8 }]}>
            <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
              <Ionicons name="desktop-outline" size={16} color={C.muted} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={k.text}>{d.name}</Text>{d.id === currentDeviceId && <Badge label="This device" />}</View>
                <Text style={[k.muted, { fontSize: 11 }]}>{d.browser} · {d.os} · Last used {formatDistanceToNow(new Date(d.lastUsed), { addSuffix: true })}</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Remove" onPress={() => { removeDevice(d.id); toast.success('Device removed'); }} hitSlop={10}><Ionicons name="trash-outline" size={16} color={C.muted} /></Pressable>
          </View>
        ))}
        {devices.length === 0 && <Text style={[k.muted, { textAlign: 'center', paddingVertical: 8 }]}>No trusted devices yet</Text>}
      </Box>

      <Box i={4}>
        <Text style={[k.h3, { marginBottom: 4 }]}>Preferences</Text>
        <Pref icon="notifications-outline" title="Push Notifications" sub="Transaction alerts & updates" right={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: C.green, false: C.border }} />} />
        <Pref icon="eye-outline" title="Hide Balances" sub="Mask amounts on dashboard" right={<Switch value={hideBalance} onValueChange={(v) => { haptic.tap(); setHideBalance(v); }} trackColor={{ true: C.green, false: C.border }} />} />
        <Pref icon="moon-outline" title="Dark Mode" sub="Always on" right={<Badge label="Default" color={C.muted} />} />
      </Box>

      <Box i={5}>
        <Text style={[k.h3, { marginBottom: 4 }]}>Account</Text>
        <NavRow icon="shield-outline" label="Identity Verification" onPress={() => router.push('/kyc')} right={<Badge label="Not available" />} />
        <NavRow icon="diamond-outline" label="Subscription" onPress={() => router.push('/premium')} right={<Badge label={isSubscribed ? 'Pro' : 'Free'} color={isSubscribed ? C.green : C.muted} />} />
      </Box>

      <Box i={6}>
        <Text style={[k.h3, { marginBottom: 4 }]}>Legal & Compliance</Text>
        <NavRow icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/terms')} />
        <NavRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
        <NavRow icon="scale-outline" label="Compliance & Disclosures" onPress={() => router.push('/compliance')} />
      </Box>

      <Btn variant="outline" icon="play" label="Replay Welcome Tutorial" style={{ marginBottom: 10 }} onPress={() => { resetOnboarding(); router.navigate('/'); toast.success('Welcome tutorial will play now!'); }} />
      <Btn variant="outline" icon="log-out-outline" label="Sign Out" onPress={signOut} />
    </Page>
  );
}
