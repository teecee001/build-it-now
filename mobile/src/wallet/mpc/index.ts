// Exo Wallet (Hybrid MPC, testnet). Provider-agnostic: screens talk to MpcWalletProvider only.
import { useEffect, useState } from 'react';

import { mpcConfig } from './config';
import type { MpcWalletProvider } from './types';
import { unconfiguredProvider } from './unconfigured';

export * from './config';
export * from './types';
export { testnetBalances, isAddress, toWei } from './balance';
export { confirmWithBiometrics } from './biometric';
export { BACKUP_LABEL, backupOptions } from './labels';
export { privyProvider, type PrivyLike } from './privy';
export { unconfiguredProvider } from './unconfigured';
export { ConfirmSheet, useConfirmSheet } from './ConfirmSheet';

let active: MpcWalletProvider | null = null;
const listeners = new Set<() => void>();
/** The Privy bridge registers itself here once the SDK is loaded and the user is signed in. */
export function registerProvider(p: MpcWalletProvider | null) {
  active = p;
  listeners.forEach((l) => l());
}
/** Re-renders when the provider (or its state) changes. */
export function useWalletProvider(): MpcWalletProvider {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return walletProvider();
}
export function walletProvider(): MpcWalletProvider {
  const cfg = mpcConfig();
  if (!cfg.enabled) return unconfiguredProvider({ kind: 'disabled' });
  if (!cfg.configured || !active) {
    const missing = [!cfg.privyAppId && 'EXPO_PUBLIC_PRIVY_APP_ID', !cfg.privyClientId && 'EXPO_PUBLIC_PRIVY_CLIENT_ID', !active && '@privy-io/expo'].filter(Boolean) as string[];
    return unconfiguredProvider({ kind: 'not_configured', missing });
  }
  return active;
}
