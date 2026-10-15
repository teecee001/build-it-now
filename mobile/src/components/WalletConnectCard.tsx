// Read-only external wallet view under Crypto. Hidden when no WalletConnect project id is set.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Box, Btn, k } from '@/components/kit';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { getErrorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { CHAINS, connect, currentSession, disconnect, getNativeBalance, sessionAddress, walletConnectEnabled } from '@/lib/walletconnect';

type Bal = { id: string; name: string; symbol: string; amount: number | null };

export function WalletConnectCard() {
  if (!walletConnectEnabled) return null;
  return <WalletConnectInner />;
}

function WalletConnectInner() {
  const { rates } = useExchangeRates();
  const [topic, setTopic] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [balances, setBalances] = useState<Bal[]>([]);

  const loadBalances = useCallback(async (addr: string) => {
    setBalances(CHAINS.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, amount: null })));
    const out = await Promise.all(CHAINS.map(async (c) => ({ id: c.id, name: c.name, symbol: c.symbol, amount: await getNativeBalance(c.rpc, addr).catch(() => null) })));
    setBalances(out);
  }, []);
  useEffect(() => {
    currentSession().then((s) => { if (s) { const a = sessionAddress(s); setTopic(s.topic); setAddress(a); if (a) void loadBalances(a); } }).catch(() => {});
  }, [loadBalances]);


  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { uri: u, approval } = await connect();
      if (u) {
        setUri(u);
        if (Platform.OS !== 'web') Linking.openURL(u).catch(() => {});
      }
      const s = await approval();
      setUri(null);
      setTopic(s.topic);
      const a = sessionAddress(s);
      setAddress(a);
      if (a) void loadBalances(a);
      haptic.success();
    } catch (e: unknown) {
      setUri(null);
      toast.error(getErrorMessage(e) || 'Connection failed');
    } finally {
      setBusy(false);
    }
  };
  const stop = async () => {
    if (topic) await disconnect(topic).catch(() => {});
    setTopic(null); setAddress(null); setBalances([]);
  };

  const usd = (symbol: string, amt: number) => {
    const r = rates[symbol === 'POL' ? 'MATIC' : symbol];
    return r ? amt / r : null;
  };

  return (
    <Box i={2}>
      <View style={[k.rowB, { marginBottom: 8 }]}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="link-outline" size={16} color={C.green} />
          <Text style={k.h3}>WalletConnect</Text>
        </View>
        <Text style={[k.muted, { fontSize: 11 }]}>Read-only</Text>
      </View>
      {address ? (
        <>
          <View style={[k.rowB, { marginBottom: 8 }]}>
            <Text style={[k.text, k.mono, { fontSize: 13 }]}>{address.slice(0, 6)}…{address.slice(-4)}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Btn small variant="secondary" icon="copy-outline" label="Copy" onPress={async () => { await Clipboard.setStringAsync(address); toast.success('Copied'); }} />
              <Btn small variant="outline" icon="refresh" label="Refresh" onPress={() => loadBalances(address)} />
            </View>
          </View>
          {balances.map((b) => (
            <View key={b.id} style={[k.rowB, { paddingVertical: 6 }]}>
              <Text style={k.muted}>{b.name}</Text>
              <Text style={[k.text, k.mono, { fontSize: 13 }]}>
                {b.amount === null ? '—' : `${b.amount.toFixed(5)} ${b.symbol}`}
                {b.amount ? <Text style={k.muted}>{(() => { const v = usd(b.symbol, b.amount); return v === null ? '' : `  ≈ $${v.toFixed(2)}`; })()}</Text> : null}
              </Text>
            </View>
          ))}
          <Btn variant="outline" icon="log-out-outline" label="Disconnect" onPress={stop} style={{ marginTop: 8 }} />
        </>
      ) : uri ? (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 12 }}><QRCode value={uri} size={180} /></View>
          <Text style={[k.muted, { textAlign: 'center', fontSize: 12 }]}>Scan with your wallet app, or open it on this device.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Platform.OS !== 'web' && <Btn small icon="open-outline" label="Open wallet" onPress={() => Linking.openURL(uri).catch(() => toast.error('No wallet app found'))} />}
            <Btn small variant="secondary" icon="copy-outline" label="Copy" onPress={async () => { await Clipboard.setStringAsync(uri); toast.success('Copied'); }} />
          </View>
        </View>
      ) : (
        <>
          <Text style={[k.muted, { fontSize: 12, marginBottom: 10 }]}>View an external wallet&apos;s address and balances. No signing, no transfers.</Text>
          <Btn icon="link-outline" label="Connect wallet" onPress={start} busy={busy} />
        </>
      )}
    </Box>
  );
}
