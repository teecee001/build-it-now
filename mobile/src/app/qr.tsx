// Port of src/pages/QRPayments.tsx: show my QR (react-native-qrcode-svg), scan with expo-camera,
// and pay with the same wallet-operation "qr_pay" call + idempotency key.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

import { Box, Btn, Field, IconDot, k, Page } from '@/components/kit';
import { SuccessCheck } from '@/components/SuccessCheck';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { invokeWalletOp, useWallet } from '@/hooks/useWallet';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/formatCurrency';
import { haptic } from '@/lib/haptics';
import { enter } from '@/lib/motion';
import { useSingleFlight } from '@/lib/singleFlight';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { WEB_ORIGIN } from '@/lib/web';

type View_ = 'home' | 'receive' | 'scan' | 'confirm' | 'done';

export function buildPayloadUrl(p: { handle: string; amount?: number; note?: string }) {
  const params = new URLSearchParams();
  params.set('to', p.handle);
  if (p.amount) params.set('amount', String(p.amount));
  if (p.note) params.set('note', p.note);
  return `${WEB_ORIGIN}/qr/pay?${params.toString()}`;
}

/** Same parsing rules as the web scanner. */
export function parseScannedData(raw: string): { handle: string; amount?: number; note?: string } | null {
  try {
    if (raw.includes('/qr/pay')) {
      const q = raw.split('?')[1] ?? '';
      const sp = new URLSearchParams(q);
      const to = sp.get('to');
      if (!to) return null;
      return { handle: to, amount: sp.get('amount') ? parseFloat(sp.get('amount')!) : undefined, note: sp.get('note') || undefined };
    }
    const json = JSON.parse(raw);
    if (json.handle) return { handle: json.handle, amount: json.amount, note: json.note };
    return null;
  } catch {
    if (raw.startsWith('@') || raw.includes('@')) return { handle: raw };
    if (raw.length > 3 && raw.length < 200) return { handle: raw };
    return null;
  }
}

export default function QRPayments() {
  const params = useLocalSearchParams<{ to?: string; amount?: string; note?: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { profile } = useProfile();
  const { balance } = useWallet();
  const [view, setView] = useState<View_>(params.to ? 'confirm' : 'home');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [scanRecipient, setScanRecipient] = useState(params.to ?? '');
  const [scanAmount, setScanAmount] = useState(params.amount ?? '');
  const [scanNote, setScanNote] = useState(params.note ?? '');
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const { run, busy: isSending } = useSingleFlight();
  const handle = profile?.handle || '@' + (user?.email?.split('@')[0] || 'user');

  const payUrl = useMemo(
    () => buildPayloadUrl({ handle, amount: receiveAmount ? parseFloat(receiveAmount) : undefined, note: receiveNote || undefined }),
    [handle, receiveAmount, receiveNote],
  );

  useEffect(() => {
    if (view === 'scan') scanned.current = false;
  }, [view]);

  const onScan = ({ data }: { data: string }) => {
    if (scanned.current) return;
    const parsed = parseScannedData(data);
    if (parsed) {
      scanned.current = true;
      setScanRecipient(parsed.handle);
      if (parsed.amount) setScanAmount(String(parsed.amount));
      if (parsed.note) setScanNote(parsed.note);
      setView('confirm');
      toast.success('QR code scanned successfully!');
    } else toast.error('Unrecognized QR code format');
  };

  const handlePay = () =>
    run(async (idempotencyKey) => {
      if (!scanRecipient || !scanAmount) { toast.error('Please fill in all fields'); return; }
      const amt = parseFloat(scanAmount);
      if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
      if (amt > balance) { toast.error('Insufficient balance'); return; }
      try {
        const result = await invokeWalletOp({ operation: 'qr_pay', amount: amt, recipient: scanRecipient, note: scanNote, idempotency_key: idempotencyKey });
        if (!result || result.success !== true || !result.transaction_id) {
          throw new Error('Payment could not be confirmed. Check your activity before trying again.');
        }
        setView('done');
        toast.success(`$${amt.toFixed(2)} sent to ${scanRecipient}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || 'Payment failed');
      } finally {
        for (const key of ['wallet', 'multi-wallets', 'transactions', 'notifications']) qc.invalidateQueries({ queryKey: [key] });
      }
    });

  const resetScan = () => { setScanRecipient(''); setScanAmount(''); setScanNote(''); setView('home'); };
  const amt = parseFloat(scanAmount || '0');

  return (
    <Page title="QR Payments" sub="Send & receive money instantly with QR codes">
      <Animated.View key={view} entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
        {view === 'home' && (
          <>
            <Box i={1} style={{ alignItems: 'center' }}>
              <Text style={k.muted}>Available balance</Text>
              <Text style={[k.title, k.mono]}>{formatMoney(balance)}</Text>
            </Box>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { icon: 'qr-code-outline' as const, t: 'My QR Code', s: 'Receive payments', on: () => setView('receive'), primary: true },
                { icon: 'camera-outline' as const, t: 'Scan & Pay', s: 'Send money', on: () => setView('scan') },
              ].map((b, i) => (
                <Animated.View key={b.t} entering={enter(2 + i)} style={{ flex: 1 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={b.t} onPress={() => { haptic.tap(); b.on(); }} style={({ pressed }) => [k.card, { alignItems: 'center', gap: 6, padding: 18, backgroundColor: b.primary ? C.text : C.card }, pressed && { transform: [{ scale: 0.98 }] }]}>
                    <IconDot name={b.icon} color={C.text} bg={b.primary ? C.bg : undefined} />
                    <Text style={[k.h3, { color: b.primary ? C.bg : C.text }]}>{b.t}</Text>
                    <Text style={[k.muted, b.primary && { color: '#3f3f46' }]}>{b.s}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
            <Box i={4} style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="qr-code-outline" size={18} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={k.h3}>Instant P2P Transfers</Text>
                <Text style={[k.muted, { marginTop: 2 }]}>Share your QR code to receive payments. Scan any Ξ╳oSky QR or external payment QR to send money instantly.</Text>
              </View>
            </Box>
          </>
        )}

        {view === 'receive' && (
          <>
            <Box i={1} style={{ alignItems: 'center' }}>
              <Text style={k.muted}>Your payment QR code</Text>
              <Text style={[k.h2, { marginBottom: 14 }]}>{handle}</Text>
              <View accessibilityLabel="Payment QR Code" style={{ padding: 14, backgroundColor: '#fff', borderRadius: 16 }}>
                <QRCode value={payUrl} size={220} ecl="H" color="#000000" backgroundColor="#ffffff" />
              </View>
              <Text style={[k.muted, { marginTop: 10, fontSize: 12 }]}>Scannable by any QR reader — opens Ξ╳oSky payment</Text>
              <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
                <Field label="Request Amount (optional)" placeholder="0.00" keyboardType="decimal-pad" value={receiveAmount} onChangeText={setReceiveAmount} />
                <Field placeholder="Add a note (optional)" value={receiveNote} onChangeText={setReceiveNote} maxLength={100} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
                <Btn variant="outline" icon="copy-outline" label="Copy Link" style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(payUrl); toast.success('Payment link copied'); }} />
                <Btn variant="outline" icon="share-outline" label="Share" style={{ flex: 1 }} onPress={() => Share.share({ title: 'Pay me on Ξ╳oSky', message: `Pay ${handle} on Ξ╳oSky ${payUrl}`, url: payUrl })} />
              </View>
            </Box>
            <Btn variant="outline" icon="arrow-back" label="Back" onPress={() => { setView('home'); setReceiveAmount(''); setReceiveNote(''); }} />
          </>
        )}

        {view === 'scan' && (
          <>
            <Box i={1} style={{ padding: 0, overflow: 'hidden', minHeight: 300 }}>
              {!permission ? (
                <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ActivityIndicator color={C.green} />
                  <Text style={k.muted}>Starting camera…</Text>
                </View>
              ) : !permission.granted ? (
                <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
                  <Ionicons name="warning-outline" size={28} color={C.red} />
                  <Text style={[k.muted, { textAlign: 'center' }]}>Could not access camera. Please allow camera permissions.</Text>
                  <Btn small variant="outline" label="Try Again" onPress={requestPermission} />
                </View>
              ) : (
                <CameraView
                  style={{ height: 300 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={view === 'scan' ? onScan : undefined}
                />
              )}
            </Box>
            {permission && !permission.granted && Platform.OS !== 'web' && permission.canAskAgain && (
              <AutoAsk request={requestPermission} />
            )}
            <Box i={2}>
              <Text style={[k.h3, { marginBottom: 10 }]}>Or enter manually</Text>
              <Field label="Recipient" placeholder="@username or address" value={scanRecipient} onChangeText={setScanRecipient} maxLength={100} autoCapitalize="none" />
              <Field label="Amount" placeholder="0.00" keyboardType="decimal-pad" value={scanAmount} onChangeText={setScanAmount} />
              <Field placeholder="Add a note (optional)" value={scanNote} onChangeText={setScanNote} maxLength={100} />
              <Btn
                label="Review Payment"
                icon="arrow-forward"
                disabled={!scanRecipient || !scanAmount}
                onPress={() => { if (!scanRecipient || !scanAmount) { toast.error('Enter recipient and amount'); return; } setView('confirm'); }}
              />
            </Box>
            <Btn variant="outline" icon="arrow-back" label="Cancel" onPress={resetScan} />
          </>
        )}

        {view === 'confirm' && (
          <Box i={1}>
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <IconDot name="cash-outline" color={C.green} bg={C.green + '1A'} size={48} />
              <Text style={k.h2}>Confirm Payment</Text>
            </View>
            {[
              ['To', scanRecipient],
              ['Amount', `$${amt.toFixed(2)}`],
              ...(scanNote ? [['Note', scanNote]] : []),
              ['Balance after', formatMoney(balance - amt)],
            ].map(([l, v]) => (
              <View key={l} style={k.row}>
                <Text style={k.muted}>{l}</Text>
                <Text style={[k.text, { fontWeight: '600' }]}>{v}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Btn variant="outline" icon="arrow-back" label="Back" style={{ flex: 1 }} onPress={() => setView('scan')} />
              <Btn label="Send" icon="arrow-forward" style={{ flex: 1 }} onPress={handlePay} busy={isSending} />
            </View>
          </Box>
        )}

        {view === 'done' && (
          <View style={{ alignItems: 'center', gap: 12, marginTop: 40 }}>
            <SuccessCheck />
            <Text style={k.title}>Payment Sent!</Text>
            <Text style={k.muted}>${amt.toFixed(2)} was sent to {scanRecipient}</Text>
            <Btn variant="outline" label="Done" onPress={resetScan} />
          </View>
        )}
      </Animated.View>
    </Page>
  );
}

function AutoAsk({ request }: { request: () => void }) {
  useEffect(() => { request(); }, [request]);
  return null;
}
