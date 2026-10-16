// Privy adapter. Privy splits the key with Shamir secret sharing into a device share, an auth share
// (held by Privy, released only to an authenticated user) and a recovery share (encrypted to the user's
// iCloud / Google Drive / password). It is key sharding with reconstruction inside a TEE or on device,
// not threshold-signature MPC. See docs/wallet-mpc.md.
//
// The SDK (@privy-io/expo) is wired in PrivyBridge.native.tsx (mobile) and src/wallet/mpc/PrivyBridge.tsx (web).
// This adapter only depends on the small surface below, so it is testable and swappable.
import { assertTestnet } from './config';
import type { BackupMethod, MpcWalletProvider, TestnetTx, WalletState } from './types';

export type PrivyLike = {
  isReady: boolean;
  authenticated: boolean;
  address: string | null;
  needsRecovery: boolean;
  backupMethod: BackupMethod | null;
  recoveryMethods: BackupMethod[];
  create(): Promise<{ address: string }>;
  setRecovery(method: BackupMethod, password?: string): Promise<void>;
  recover(method: BackupMethod, password?: string): Promise<{ address: string }>;
  request(args: { method: string; params: unknown[] }): Promise<unknown>;
  switchChain(chainId: number): Promise<void>;
};

export function privyProvider(p: PrivyLike): MpcWalletProvider {
  return {
    name: 'privy',
    async state(): Promise<WalletState> {
      if (!p.isReady || !p.authenticated) return { kind: 'signed_out' };
      if (p.needsRecovery) return { kind: 'needs_recovery', methods: p.recoveryMethods };
      if (!p.address) return { kind: 'no_wallet' };
      return { kind: 'ready', address: p.address, backup: p.backupMethod };
    },
    createWallet: () => p.create(),
    backup: (m, password) => {
      if (m === 'password' && !(password && password.length >= 8)) return Promise.reject(new Error('Use at least 8 characters.'));
      return p.setRecovery(m, password);
    },
    recover: (m, password) => {
      if (m === 'password' && !password) return Promise.reject(new Error('Enter your recovery password.'));
      return p.recover(m, password);
    },
    async sendTestnet(tx: TestnetTx) {
      assertTestnet(tx.chainId);
      await p.switchChain(tx.chainId);
      // Re-check right before signing: the provider must still be on the allowed testnet.
      const current = Number(await p.request({ method: 'eth_chainId', params: [] }));
      assertTestnet(current);
      const hash = await p.request({ method: 'eth_sendTransaction', params: [{ to: tx.to, value: '0x' + tx.valueWei.toString(16) }] });
      return String(hash);
    },
  };
}
