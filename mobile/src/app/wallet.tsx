// Exo Wallet (Hybrid MPC, testnet only, behind EXPO_PUBLIC_MPC_WALLET). Create, back up, view balance, send test ETH.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { SwipeToPay } from '@/components/SwipeToPay';
import { Badge, Box, Btn, Field, k, Page } from '@/components/kit';
import { getErrorMessage } from '@/lib/errors';
import { C } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { BACKUP_LABEL, backupOptions, type BackupMethod, DEFAULT_TESTNET, isAddress, testnetBalances, toWei, useConfirmSheet, walletProvider, type WalletState } from '@/wallet/mpc';
import type { TestnetBalance } from '@/wallet/mpc/balance';


export default function Wallet() {
  const provider = walletProvider();
  const [state, setState] = useState<WalletState | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { provider.state().then(setState).catch(() => setState({ kind: 'signed_out' })); }, [provider]);
  useEffect(refresh, [refresh]);

  const act = (fn: () => Promise<unknown>) => async () => {
    setBusy(true);
    try { await fn(); refresh(); } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Page title="Exo Wallet" sub="Testnet" right={<Badge label="Testnet" />}>
      {!state ? null : state.kind === 'disabled' ? (
        <Box><Text style={k.muted}>{"Exo Wallet isn't available yet."}</Text></Box>
      ) : state.kind === 'not_configured' ? (
        <Box>
          <Text style={k.h2}>Almost ready</Text>
          <Text style={[k.muted, { marginTop: 6 }]}>Exo Wallet needs its wallet provider to be connected before you can create a wallet.</Text>
        </Box>
      ) : state.kind === 'signed_out' ? (
        <Box><Text style={k.muted}>Sign in to ExoSky to use Exo Wallet.</Text></Box>
      ) : state.kind === 'no_wallet' ? (
        <Box>
          <Ionicons name="shield-checkmark-outline" size={28} color={C.green} />
          <Text style={[k.h2, { marginTop: 8 }]}>Create your wallet</Text>
          <Text style={[k.muted, { marginTop: 6, lineHeight: 20 }]}>Your key is split into 3 parts: one on this phone behind Face ID or fingerprint, one with our wallet provider, and an encrypted backup in your own cloud. Any 2 can sign or recover. Nobody, including ExoSky, ever holds the whole key.</Text>
          <Btn label="Create wallet" icon="add-circle-outline" busy={busy} onPress={act(() => provider.createWallet())} style={{ marginTop: 14 }} />
        </Box>
      ) : state.kind === 'needs_recovery' ? (
        <Box>
          <Text style={k.h2}>Restore your wallet</Text>
          <Text style={[k.muted, { marginTop: 6 }]}>This is a new device. Restore with your backup to keep the same wallet.</Text>
          <Btn label="Restore wallet" icon="refresh-outline" onPress={() => router.push('/wallet-recover')} style={{ marginTop: 14 }} />
        </Box>
      ) : (
        <Ready address={state.address} backup={state.backup} busy={busy} onBackup={(m) => act(() => provider.backup(m))()} />
      )}
    </Page>
  );
}

function Ready({ address, backup, busy, onBackup }: { address: string; backup: BackupMethod | null; busy: boolean; onBackup: (m: BackupMethod) => void }) {
  const provider = walletProvider();
  const [balances, setBalances] = useState<TestnetBalance[]>([]);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const { ask, sheet } = useConfirmSheet();
  const load = useCallback(() => { testnetBalances(address).then(setBalances).catch(() => undefined); }, [address]);
  useEffect(load, [load]);

  const send = async () => {
    if (!isAddress(to)) { toast.error('Enter a valid 0x address'); return; }
    let wei: bigint;
    try { wei = toWei(amount); } catch (e) { toast.error(getErrorMessage(e)); return; }
    if (wei <= 0n) return;
    const outcome = await ask({ title: 'Send test ETH', amount: `${amount} ETH`, to, network: DEFAULT_TESTNET.name, testnet: true });
    if (outcome === 'unavailable') { toast.error('Set up Face ID, Touch ID or fingerprint to send.'); return; }
    if (outcome !== 'confirmed') return;
    try {
      const hash = await provider.sendTestnet({ chainId: DEFAULT_TESTNET.chainId, to: to.trim(), valueWei: wei });
      toast.success('Sent on testnet');
      setTo(''); setAmount('');
      void Linking.openURL(`${DEFAULT_TESTNET.explorer}/tx/${hash}`).catch(() => undefined);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <>
      <Box>
        <Text style={k.muted}>Address</Text>
        <Text selectable style={{ color: C.text, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{address}</Text>
        <Btn small variant="secondary" icon="copy-outline" label="Copy" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => { void Clipboard.setStringAsync(address); toast.success('Copied'); }} />
      </Box>
      <Box i={2}>
        <Text style={k.h2}>Testnet balance</Text>
        {balances.map((b) => (
          <View key={b.net.chainId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={k.muted}>{b.net.name}</Text>
            <Text style={{ color: C.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{b.amount == null ? 'Unavailable' : `${b.amount.toFixed(6)} ${b.net.symbol}`}</Text>
          </View>
        ))}
        <Text style={[k.muted, { fontSize: 12, marginTop: 10 }]}>Test ETH has no value. Get some free from a Base Sepolia faucet.</Text>
      </Box>
      <Box i={3}>
        <Text style={k.h2}>Backup</Text>
        {backup ? (
          <Text style={[k.muted, { marginTop: 6 }]}>Backed up to {BACKUP_LABEL[backup]}.</Text>
        ) : (
          <>
            <Text style={[k.muted, { marginTop: 6 }]}>Back up now so you can restore this wallet on a new phone.</Text>
            {backupOptions().map((m) => <Btn key={m} label={`Back up to ${BACKUP_LABEL[m]}`} variant="outline" busy={busy} onPress={() => onBackup(m)} style={{ marginTop: 10 }} />)}
          </>
        )}
      </Box>
      <Box i={4}>
        <Text style={k.h2}>Send test ETH</Text>
        <Field label="To" value={to} onChangeText={setTo} placeholder="0x..." autoCapitalize="none" />
        <Field label={`Amount (${DEFAULT_TESTNET.name} ETH)`} value={amount} onChangeText={setAmount} placeholder="0.01" keyboardType="decimal-pad" />
        <SwipeToPay label="Send" onConfirm={send} disabled={!to || !amount} />
      </Box>
      {sheet}
    </>
  );
}
