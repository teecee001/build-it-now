// Exo Wallet (Hybrid MPC, testnet). Provider-agnostic: screens talk to MpcWalletProvider only.
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
/** The Privy bridge registers itself here once the SDK is installed and configured. */
export function registerProvider(p: MpcWalletProvider | null) {
  active = p;
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
