// Port of src/pages/CardPage.tsx (list / detail / settings / add / tiers). Card PIN hash and
// lockout stay on-device as on web, but in the Keychain/Keystore (secureKV) instead of localStorage.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CARD_DESIGNS, CardVisual, DesignBg } from '@/components/CardVisual';
import { FeatureGate } from '@/components/FeatureGate';
import { Badge, Box, Btn, Field, type IconName, k, Loading, Page, SECONDARY, Sheet } from '@/components/kit';
import { type AccountTierType, TIER_CONFIG, useAccountTier } from '@/hooks/useAccountTier';
import { useAuth } from '@/hooks/useAuth';
import { type CardData, useCard } from '@/hooks/useCard';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { secureKV } from '@/lib/secureKV';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';

type ViewName = 'list' | 'detail' | 'settings' | 'add' | 'tiers';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const SESSION_TIMEOUT = 5 * 60 * 1000;

function simpleHash(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) { hash = (hash << 5) - hash + pin.charCodeAt(i); hash |= 0; }
  return String(hash);
}
const getCardPinHash = (id: string) => secureKV.get(`card_pin_${id}`);
const setCardPinHash = (id: string, pin: string) => secureKV.set(`card_pin_${id}`, simpleHash(pin));
const verifyCardPin = (id: string, pin: string) => { const s = getCardPinHash(id); return !!s && simpleHash(pin) === s; };
function getLockedUntil(): number | null {
  const raw = secureKV.get('card_lockout');
  if (!raw) return null;
  const until = parseInt(raw, 10);
  if (Date.now() >= until) { secureKV.remove('card_lockout'); secureKV.remove('card_fail_count'); return null; }
  return until;
}
const getFailCount = () => parseInt(secureKV.get('card_fail_count') || '0', 10);
function recordFailure() {
  const count = getFailCount() + 1;
  secureKV.set('card_fail_count', String(count));
  if (count >= MAX_ATTEMPTS) { secureKV.set('card_lockout', String(Date.now() + LOCKOUT_DURATION)); return { locked: true, remaining: 0 }; }
  return { locked: false, remaining: MAX_ATTEMPTS - count };
}
const clearFailures = () => { secureKV.remove('card_fail_count'); secureKV.remove('card_lockout'); };
const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const PinField = (p: { value: string; onChange: (v: string) => void; placeholder: string; label?: string; onSubmit?: () => void }) => (
  <Field label={p.label} secureTextEntry keyboardType="number-pad" maxLength={6} placeholder={p.placeholder} value={p.value} onChangeText={(v) => p.onChange(v.replace(/\D/g, ''))} onSubmitEditing={p.onSubmit} autoFocus style={{ textAlign: 'center', letterSpacing: 8, fontSize: 18 }} />
);

export default function CardPage() {
  return (
    <FeatureGate feature="features_cards" featureLabel="Cards">
      <CardPageContent />
    </FeatureGate>
  );
}

function CardPageContent() {
  const { user } = useAuth();
  const { cards, isLoading, toggleFreeze, addCard } = useCard();
  const { tier, config, limits } = useAccountTier();
  const [view, setView] = useState<ViewName>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedCard = cards.find((c) => c.id === selectedId) ?? null;
  const [newCardFormat, setNewCardFormat] = useState<'virtual' | 'physical'>('virtual');
  const [newCardName, setNewCardName] = useState('');
  const [newCardDesign, setNewCardDesign] = useState(CARD_DESIGNS[0].id);
  const [newCardPin, setNewCardPin] = useState('');
  const [newCardPinConfirm, setNewCardPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const handle = '@' + (user?.email?.split('@')[0] || 'user');
  const [pinInput, setPinInput] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinVerifyError, setPinVerifyError] = useState('');
  const [showResetPin, setShowResetPin] = useState(false);
  const [resetPinStep, setResetPinStep] = useState<'verify' | 'new' | 'confirm'>('verify');
  const [resetOldPin, setResetOldPin] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [onlinePurchases, setOnlinePurchases] = useState(true);
  const [internationalTx, setInternationalTx] = useState(true);
  const [contactless, setContactless] = useState(true);
  const [atmWithdrawals, setAtmWithdrawals] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);
  const [addStep, setAddStep] = useState<'format' | 'design' | 'pin'>('format');

  useEffect(() => {
    const check = () => {
      const until = getLockedUntil();
      setIsLocked(!!until);
      setLockTimeLeft(until ? Math.ceil((until - Date.now()) / 1000) : 0);
    };
    check();
    const i = setInterval(check, 1000);
    return () => clearInterval(i);
  }, []);
  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    setVerifiedAt(Date.now());
    sessionTimerRef.current = setTimeout(() => {
      setPinVerified(false); setVerifiedAt(null);
      toast.info('Session expired — please verify again');
    }, SESSION_TIMEOUT);
  }, []);
  useEffect(() => () => { if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current); }, []);
  useEffect(() => {
    if (!verifiedAt) return;
    const i = setInterval(() => {
      const left = Math.max(0, Math.ceil((verifiedAt + SESSION_TIMEOUT - Date.now()) / 1000));
      setSessionTimeLeft(left);
      if (left === 0) clearInterval(i);
    }, 1000);
    return () => clearInterval(i);
  }, [verifiedAt]);

  const handlePinVerify = () => {
    if (!selectedCard) return;
    if (!getCardPinHash(selectedCard.id)) {
      if (pinInput.length < 4 || pinInput.length > 6) { setPinVerifyError('PIN must be 4-6 digits'); return; }
      setCardPinHash(selectedCard.id, pinInput);
      clearFailures(); setPinVerified(true); setPinInput(''); setPinVerifyError(''); startSessionTimer();
      haptic.success();
      toast.success('Card PIN set & verified successfully');
      return;
    }
    if (verifyCardPin(selectedCard.id, pinInput)) {
      clearFailures(); setPinVerified(true); setPinInput(''); setPinVerifyError(''); startSessionTimer();
      haptic.success();
      toast.success('PIN verified successfully');
    } else {
      haptic.error();
      const r = recordFailure();
      if (r.locked) { setIsLocked(true); toast.error('Too many failed attempts. Card locked for 15 minutes.'); }
      else setPinVerifyError(`Incorrect PIN. ${r.remaining} attempt${r.remaining !== 1 ? 's' : ''} remaining.`);
      setPinInput('');
    }
  };
  const handleResetPinStep = () => {
    if (!selectedCard) return;
    if (resetPinStep === 'verify') {
      if (!verifyCardPin(selectedCard.id, resetOldPin)) { setResetPinError('Incorrect current PIN'); setResetOldPin(''); return; }
      setResetPinStep('new'); return;
    }
    if (resetPinStep === 'new') {
      if (resetNewPin.length < 4 || resetNewPin.length > 6) { setResetPinError('PIN must be 4-6 digits'); return; }
      setResetPinStep('confirm'); return;
    }
    if (resetConfirmPin !== resetNewPin) { setResetPinError('PINs do not match'); setResetConfirmPin(''); return; }
    setCardPinHash(selectedCard.id, resetNewPin);
    setShowResetPin(false);
    toast.success('Card PIN updated successfully');
  };
  const handleFreezeToggle = async (card: CardData) => {
    const wasFrozen = card.is_frozen;
    haptic.light();
    toggleFreeze.mutate(card.id);
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id, type: 'security', title: wasFrozen ? 'Card Unfrozen' : 'Card Frozen',
        message: `Your card ending in ${card.card_number_last4} has been ${wasFrozen ? 'unfrozen' : 'frozen'}.`,
        metadata: { card_id: card.id, action: wasFrozen ? 'unfreeze' : 'freeze' },
      });
    }
    toast.success(wasFrozen ? 'Card unfrozen' : 'Card frozen');
  };
  const handleCreateCard = async () => {
    if (addCard.isPending) return;
    if (newCardPin.length < 4 || newCardPin.length > 6) { setPinError('PIN must be 4-6 digits'); return; }
    if (!/^\d+$/.test(newCardPin)) { setPinError('PIN must be digits only'); return; }
    if (newCardPin !== newCardPinConfirm) { setPinError('PINs do not match'); return; }
    try {
      await addCard.mutateAsync({ format: newCardFormat, name: newCardName || undefined });
      const { data: latest } = await supabase.from('cards').select('id').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1);
      if (latest && latest[0]) setCardPinHash(latest[0].id, newCardPin);
      setNewCardName(''); setNewCardPin(''); setNewCardPinConfirm(''); setPinError(''); setNewCardDesign(CARD_DESIGNS[0].id); setAddStep('format'); setView('list');
    } catch (e: unknown) {
      setPinError(getErrorMessage(e) || 'Failed to create card. Please try again.');
    }
  };

  if (isLoading) return <Loading />;
  const openDetail = (c: CardData) => { setSelectedId(c.id); setPinInput(''); setPinVerified(false); setPinVerifyError(''); setView('detail'); };
  const openSettings = (c: CardData) => { setSelectedId(c.id); setView('settings'); };
  const copy = async (msg: string) => { if (!selectedCard) return; await Clipboard.setStringAsync(selectedCard.card_number_last4); haptic.tap(); toast.success(msg || 'Last 4 copied'); };
  const leaveDetail = () => { setView('list'); setPinVerified(false); if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current); setVerifiedAt(null); };

  if (view === 'detail' && selectedCard) {
    const hasPin = !!getCardPinHash(selectedCard.id);
    const fails = getFailCount();
    return (
      <Page title={selectedCard.card_name || 'Card'} sub={`•••• ${selectedCard.card_number_last4}`} back={false} right={<Pressable accessibilityLabel="Back" onPress={leaveDetail} hitSlop={10}><Ionicons name="close" size={22} color={C.text} /></Pressable>}>
        <Animated.View entering={FadeIn.duration(250)} style={{ marginBottom: 14 }}><CardVisual c={selectedCard} /></Animated.View>
        {isLocked ? (
          <Box i={1} tint={C.red} style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name="ban" size={28} color={C.red} />
            <Text style={k.h3}>Card Access Locked</Text>
            <Text style={k.muted}>Too many failed verification attempts.</Text>
            <Text style={[k.muted, { marginTop: 6 }]}>Try again in</Text>
            <Text style={[k.h2, k.mono, { color: C.red }]}>{formatTime(lockTimeLeft)}</Text>
          </Box>
        ) : !pinVerified ? (
          <>
            <Box i={1} style={{ alignItems: 'stretch' }}>
              {fails > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontSize: 12 }}>{MAX_ATTEMPTS - fails} attempt{MAX_ATTEMPTS - fails !== 1 ? 's' : ''} remaining</Text>
                </View>
              )}
              <View style={{ alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <Ionicons name="key-outline" size={24} color={C.green} />
                <Text style={k.h3}>{hasPin ? 'Enter Card PIN' : 'Set Card PIN'}</Text>
                <Text style={[k.muted, { textAlign: 'center' }]}>{hasPin ? 'Enter your 4-6 digit PIN to view card details.' : 'Create a 4-6 digit PIN to secure this card.'}</Text>
              </View>
              <PinField value={pinInput} onChange={(v) => { setPinInput(v); setPinVerifyError(''); }} placeholder={hasPin ? 'Enter PIN' : 'Create PIN'} onSubmit={() => pinInput.length >= 4 && handlePinVerify()} />
              {pinVerifyError ? <Text style={{ color: C.red, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{pinVerifyError}</Text> : null}
              <Btn label={hasPin ? 'Verify PIN' : 'Set PIN'} icon="key-outline" onPress={handlePinVerify} disabled={pinInput.length < 4} />
            </Box>
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={12} color={C.muted} />
              <Text style={[k.muted, { fontSize: 12 }]}>Secured by PIN verification</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[k.rowB, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={14} color={C.green} />
                <Text style={{ color: C.green, fontSize: 12, fontWeight: '600' }}>PIN Verified</Text>
              </View>
              {!!verifiedAt && sessionTimeLeft > 0 && <Text style={[k.muted, { fontSize: 12 }]}>⏱ {formatTime(sessionTimeLeft)}</Text>}
            </View>
            <Box i={1}>
              <View style={[k.rowB, { marginBottom: 10 }]}>
                <Text style={k.h3}>Card details</Text>
                <Text style={[k.muted, { fontSize: 11 }]}>Last 4 only</Text>
              </View>
              <View style={k.rowB}>
                <View>
                  <Text style={k.muted}>Card Number</Text>
                  <Text style={[k.text, k.mono, { letterSpacing: 1.5 }]}>{`•••• •••• •••• ${selectedCard.card_number_last4}`}</Text>
                </View>
                <Pressable accessibilityLabel="Copy" onPress={() => copy('Last 4 copied')} hitSlop={8}><Ionicons name="copy-outline" size={16} color={C.muted} /></Pressable>
              </View>
              {[
                [['Expiry', `${String(selectedCard.expiry_month).padStart(2, '0')}/${String(selectedCard.expiry_year).slice(-2)}`], ['CVV', 'Not issued'], ['Network', 'Not a network card']],
                [['Cardholder', selectedCard.card_name || handle], ['Format', selectedCard.card_format]],
                [['Status', selectedCard.is_frozen ? 'Frozen' : selectedCard.is_active ? 'Active' : 'Inactive'], ['Card Type', selectedCard.card_type]],
                ...(selectedCard.card_format === 'physical' && selectedCard.shipping_status ? [[['Shipping', selectedCard.shipping_status]]] : []),
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 12 }}>
                  {row.map(([l, v]) => (
                    <View key={l} style={{ flex: 1 }}>
                      <Text style={k.muted}>{l}</Text>
                      <Text style={[k.text, { fontSize: 14, textTransform: l === 'Format' || l === 'Card Type' ? 'capitalize' : 'none' }]}>{v}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </Box>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {([
                { icon: 'copy-outline', label: 'Copy', on: () => copy('Full number copied') },
                { icon: 'snow-outline', label: selectedCard.is_frozen ? 'Unfreeze' : 'Freeze', on: () => handleFreezeToggle(selectedCard) },
                { icon: 'key-outline', label: 'Reset PIN', on: () => { setShowResetPin(true); setResetPinStep(getCardPinHash(selectedCard.id) ? 'verify' : 'new'); setResetOldPin(''); setResetNewPin(''); setResetConfirmPin(''); setResetPinError(''); } },
                { icon: 'settings-outline', label: 'Settings', on: () => openSettings(selectedCard) },
              ] as { icon: IconName; label: string; on: () => void }[]).map((a) => (
                <Pressable key={a.label} accessibilityRole="button" onPress={a.on} style={({ pressed }) => [k.card, { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, marginBottom: 0 }, pressed && { transform: [{ scale: 0.97 }] }]}>
                  <Ionicons name={a.icon} size={18} color={C.text} />
                  <Text style={[k.muted, { fontSize: 11 }]}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            {([
              { icon: 'trending-up', title: 'Up to 3% Cashback', desc: 'On dining, shopping & travel', color: '#F59E0B' },
              { icon: 'globe-outline', title: 'Zero Foreign Fees', desc: 'Use worldwide', color: C.green },
              { icon: 'lock-closed-outline', title: 'Advanced Security', desc: 'Real-time fraud protection', color: C.green },
            ] as { icon: IconName; title: string; desc: string; color: string }[]).map((b, i) => (
              <Box key={b.title} i={2 + i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12 }}>
                <Ionicons name={b.icon} size={18} color={b.color} />
                <View><Text style={k.h3}>{b.title}</Text><Text style={k.muted}>{b.desc}</Text></View>
              </Box>
            ))}
            <Sheet open={showResetPin} onClose={() => setShowResetPin(false)} title={resetPinStep === 'verify' ? 'Verify Current PIN' : resetPinStep === 'new' ? 'Set New PIN' : 'Confirm New PIN'}>
              <Text style={[k.muted, { marginBottom: 10 }]}>{resetPinStep === 'verify' ? 'Enter your current PIN to continue' : resetPinStep === 'new' ? 'Enter a new 4-6 digit PIN' : 'Re-enter your new PIN to confirm'}</Text>
              <PinField
                key={resetPinStep}
                placeholder="Enter PIN"
                value={resetPinStep === 'verify' ? resetOldPin : resetPinStep === 'new' ? resetNewPin : resetConfirmPin}
                onChange={(v) => { setResetPinError(''); if (resetPinStep === 'verify') setResetOldPin(v); else if (resetPinStep === 'new') setResetNewPin(v); else setResetConfirmPin(v); }}
                onSubmit={handleResetPinStep}
              />
              {resetPinError ? <Text style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{resetPinError}</Text> : null}
              <Btn label={resetPinStep === 'confirm' ? 'Save New PIN' : 'Continue'} onPress={handleResetPinStep} disabled={(resetPinStep === 'verify' && resetOldPin.length < 4) || (resetPinStep === 'new' && resetNewPin.length < 4) || (resetPinStep === 'confirm' && resetConfirmPin.length < 4)} />
            </Sheet>
          </>
        )}
      </Page>
    );
  }

  if (view === 'settings' && selectedCard) {
    const rows: { icon: IconName; label: string; v: boolean; set: (b: boolean) => void }[] = [
      { icon: 'globe-outline', label: 'Online Purchases', v: onlinePurchases, set: setOnlinePurchases },
      { icon: 'location-outline', label: 'International', v: internationalTx, set: setInternationalTx },
      { icon: 'phone-portrait-outline', label: 'Contactless', v: contactless, set: setContactless },
      { icon: 'cash-outline', label: 'ATM Withdrawals', v: atmWithdrawals, set: setAtmWithdrawals },
    ];
    return (
      <Page title="Card Settings" sub={`•••• ${selectedCard.card_number_last4} · ${selectedCard.card_format}`} back={false} right={<Pressable accessibilityLabel="Back" onPress={() => setView('detail')} hitSlop={10}><Ionicons name="close" size={22} color={C.text} /></Pressable>}>
        <Box i={1}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 }}><Ionicons name="shield-checkmark-outline" size={16} color={C.green} /><Text style={k.h3}>Transaction Controls</Text></View>
          {rows.map((r) => (
            <View key={r.label} style={[k.rowB, { paddingVertical: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name={r.icon} size={16} color={C.muted} /><Text style={k.text}>{r.label}</Text></View>
              <Switch value={r.v} onValueChange={(b) => { haptic.tap(); r.set(b); }} trackColor={{ true: C.green, false: '#3f3f46' }} thumbColor="#fff" accessibilityLabel={r.label} />
            </View>
          ))}
        </Box>
        <Box i={2}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 }}><Ionicons name="warning-outline" size={16} color="#F59E0B" /><Text style={k.h3}>Alerts</Text></View>
          <View style={k.rowB}>
            <Text style={k.text}>Transaction Alerts</Text>
            <Switch value={txAlerts} onValueChange={setTxAlerts} trackColor={{ true: C.green, false: '#3f3f46' }} thumbColor="#fff" accessibilityLabel="Transaction Alerts" />
          </View>
        </Box>
        <Btn label="Save Settings" icon="checkmark-circle" onPress={() => { toast.success('Settings saved'); setView('detail'); }} />
        <View style={{ height: 8 }} />
        <Btn variant="outline" icon="snow-outline" label={`${selectedCard.is_frozen ? 'Unfreeze' : 'Freeze'} Card`} onPress={() => handleFreezeToggle(selectedCard)} />
      </Page>
    );
  }

  if (view === 'add') {
    const stepIdx = addStep === 'format' ? 0 : addStep === 'design' ? 1 : 2;
    const back = () => (addStep === 'pin' ? setAddStep('design') : addStep === 'design' ? setAddStep('format') : setView('list'));
    return (
      <Page title={addStep === 'format' ? 'Add Card' : addStep === 'design' ? 'Choose Design' : 'Set PIN'} sub={`Step ${stepIdx + 1} of 3`} back={false} right={<Pressable accessibilityLabel="Back" onPress={back} hitSlop={10}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
          {[0, 1, 2].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= stepIdx ? C.green : C.border }} />)}
        </View>
        {addStep === 'format' && (
          <>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {([
                { f: 'virtual', icon: 'wifi', t: 'Virtual Card', d: 'Instant. Use online & mobile wallets.' },
                { f: 'physical', icon: 'card-outline', t: 'Physical Card', d: 'Premium metal. Ships in 5-7 days.' },
              ] as const).map((o) => (
                <Pressable key={o.f} accessibilityRole="radio" accessibilityState={{ selected: newCardFormat === o.f }} onPress={() => { haptic.tap(); setNewCardFormat(o.f); }} style={[k.card, { flex: 1, gap: 6, marginBottom: 0, borderColor: newCardFormat === o.f ? C.green : C.border, borderWidth: newCardFormat === o.f ? 2 : 1 }]}>
                  <Ionicons name={o.icon} size={20} color={newCardFormat === o.f ? C.green : C.muted} />
                  <Text style={k.h3}>{o.t}</Text>
                  <Text style={[k.muted, { fontSize: 12 }]}>{o.d}</Text>
                </Pressable>
              ))}
            </View>
            <Box i={1}><Field label="Card Name" value={newCardName} onChangeText={setNewCardName} placeholder={newCardFormat === 'virtual' ? 'e.g. Online Shopping' : 'e.g. Main Card'} maxLength={50} /></Box>
            {newCardFormat === 'physical' && (
              <Box i={2} style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="cube-outline" size={16} color={C.muted} />
                <Text style={[k.muted, { flex: 1, fontSize: 12 }]}>Physical cards are shipped via express mail. You&apos;ll receive tracking information once shipped.</Text>
              </Box>
            )}
            <Btn label="Next: Choose Design" icon="color-palette-outline" onPress={() => setAddStep('design')} />
          </>
        )}
        {addStep === 'design' && (
          <>
            <Text style={[k.muted, { marginBottom: 10 }]}>Pick a design for your card</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {CARD_DESIGNS.map((d) => {
                const sel = newCardDesign === d.id;
                return (
                  <Pressable key={d.id} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={d.name} onPress={() => { haptic.tap(); setNewCardDesign(d.id); }} style={{ width: '47%' }}>
                    <View style={{ aspectRatio: 1.586, borderRadius: 12, overflow: 'hidden', borderWidth: sel ? 2 : 1, borderColor: sel ? C.green : d.border, padding: 8 }}>
                      <DesignBg design={d} id={`p-${d.id}`} />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Ξ╳</Text>
                      {sel && <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={12} color={C.bg} /></View>}
                    </View>
                    <Text style={[k.muted, { fontSize: 12, marginTop: 4, textAlign: 'center' }]}>{d.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Btn label="Next: Set PIN" icon="key-outline" onPress={() => setAddStep('pin')} />
          </>
        )}
        {addStep === 'pin' && (
          <>
            <Box i={1}>
              <View style={{ alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <Ionicons name="key-outline" size={24} color={C.green} />
                <Text style={k.h3}>Set Your Card PIN</Text>
                <Text style={k.muted}>This PIN will be required to view your card details.</Text>
              </View>
              <PinField label="Enter PIN (4-6 digits)" placeholder="Enter PIN" value={newCardPin} onChange={(v) => { setNewCardPin(v); setPinError(''); }} />
              <Field label="Confirm PIN" secureTextEntry keyboardType="number-pad" maxLength={6} placeholder="Confirm PIN" value={newCardPinConfirm} onChangeText={(v) => { setNewCardPinConfirm(v.replace(/\D/g, '')); setPinError(''); }} style={{ textAlign: 'center', letterSpacing: 8, fontSize: 18 }} />
              {pinError ? <Text style={{ color: C.red, fontSize: 12 }}>{pinError}</Text> : null}
            </Box>
            <Btn label="Create Card" icon={newCardFormat === 'virtual' ? 'wifi' : 'card-outline'} onPress={handleCreateCard} busy={addCard.isPending} disabled={newCardPin.length < 4 || newCardPinConfirm.length < 4} />
          </>
        )}
      </Page>
    );
  }

  if (view === 'tiers') {
    return (
      <Page title="Account Tiers" back={false} right={<Pressable accessibilityLabel="Back" onPress={() => setView('list')} hitSlop={10}><Ionicons name="close" size={22} color={C.text} /></Pressable>}>
        {(['personal', 'pro', 'business', 'bank'] as AccountTierType[]).map((t, i) => {
          const tc = TIER_CONFIG[t];
          const cur = t === tier;
          return (
            <Box key={t} i={1 + i} tint={cur ? C.green : undefined}>
              <View style={[k.rowB, { marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="ribbon-outline" size={16} color={cur ? C.green : C.muted} /><Text style={k.h3}>{tc.label}</Text></View>
                {cur && <Badge label="Current" />}
              </View>
              <View style={{ flexDirection: 'row' }}>
                {[['Per Tx', `$${tc.single.toLocaleString()}`], ['Daily', `$${tc.daily.toLocaleString()}`], ['Cards', String(tc.maxCards)]].map(([l, v]) => (
                  <View key={l} style={{ flex: 1 }}><Text style={k.muted}>{l}</Text><Text style={[k.text, { fontWeight: '600' }]}>{v}</Text></View>
                ))}
              </View>
            </Box>
          );
        })}
      </Page>
    );
  }

  return (
    <Page
      title="Cards"
      sub="Manage your virtual & physical cards"
      right={
        <Pressable accessibilityRole="button" onPress={() => setView('tiers')} style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: SECONDARY, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Ionicons name="ribbon-outline" size={14} color="#F59E0B" />
          <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{config.label}</Text>
        </Pressable>
      }>
      <Box i={1} style={{ flexDirection: 'row' }}>
        {[['Per Transaction', limits.single], ['Daily Limit', limits.daily], ['Monthly', limits.monthly]].map(([l, v]) => (
          <View key={l as string} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[k.muted, { fontSize: 11 }]}>{l}</Text>
            <Text style={[k.text, { fontWeight: '700' }]}>${(v as number).toLocaleString()}</Text>
          </View>
        ))}
      </Box>
      {cards.map((c, i) => (
        <Animated.View key={c.id} entering={FadeIn.delay(80 * i).duration(250)} style={{ marginBottom: 14 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={c.card_name || 'Card'} onPress={() => openDetail(c)} style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}>
            <CardVisual c={c} compact />
          </Pressable>
          <View style={[k.rowB, { marginTop: 6 }]}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Text style={k.h3}>{c.card_name || 'Card'}</Text>
              {c.is_frozen && <Badge label="Frozen" color="#60A5FA" />}
              {c.card_format === 'physical' && c.shipping_status ? <Badge label={c.shipping_status} icon="car-outline" color={C.muted} /> : null}
            </View>
            <Pressable accessibilityLabel="Settings" onPress={() => openSettings(c)} hitSlop={8}><Ionicons name="settings-outline" size={18} color={C.muted} /></Pressable>
          </View>
        </Animated.View>
      ))}
      {cards.length < limits.maxCards ? (
        <Btn variant="outline" icon="add" label="Add New Card" onPress={() => { setAddStep('format'); setView('add'); }} />
      ) : (
        <Text style={[k.muted, { textAlign: 'center' }]}>
          Max {limits.maxCards} cards on {config.label} tier.{' '}
          <Text style={{ color: C.green }} onPress={() => setView('tiers')}>Upgrade</Text>
        </Text>
      )}
    </Page>
  );
}
