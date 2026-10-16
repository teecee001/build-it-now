// Restore Exo Wallet on a new device: ExoSky login releases the auth share, the user's cloud backup releases the recovery share.
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Box, Btn, k, Page } from '@/components/kit';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { BACKUP_LABEL, backupOptions, walletProvider } from '@/wallet/mpc';

export default function WalletRecover() {
  const [busy, setBusy] = useState<string | null>(null);
  const restore = async (m: ReturnType<typeof backupOptions>[number]) => {
    setBusy(m);
    try {
      await walletProvider().recover(m);
      toast.success('Wallet restored');
      router.back();
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(null); }
  };
  return (
    <Page title="Restore wallet" sub="Testnet">
      <Box>
        <Text style={[k.muted, { lineHeight: 20 }]}>{"You're signed in to ExoSky, which unlocks one part of your key. Choose where you saved your backup to unlock the second part. Your new phone then stores its own part behind biometrics."}</Text>
        {backupOptions().map((m) => <Btn key={m} label={`Restore from ${BACKUP_LABEL[m]}`} variant="outline" busy={busy === m} disabled={!!busy} onPress={() => restore(m)} style={{ marginTop: 12 }} />)}
      </Box>
    </Page>
  );
}
