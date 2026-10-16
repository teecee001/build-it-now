// Provider-agnostic contract for an embedded wallet where no single party ever holds the full key.
// Shares: device (Secure Enclave / Android Keystore, behind biometrics), auth/server, and an encrypted
// recovery share backed up to the user's iCloud or Google Drive. Any 2 of the 3 can sign or recover.

export type BackupMethod = 'icloud' | 'google-drive' | 'password';
export type WalletState =
  | { kind: 'disabled' }
  | { kind: 'not_configured'; missing: string[] }
  | { kind: 'signed_out' }
  | { kind: 'no_wallet' }
  | { kind: 'needs_recovery'; methods: BackupMethod[] }
  | { kind: 'ready'; address: string; backup: BackupMethod | null };

export type TestnetTx = { chainId: number; to: string; valueWei: bigint };

export interface MpcWalletProvider {
  readonly name: string;
  state(): Promise<WalletState>;
  /** Creates the wallet; the provider splits the key into shares and never returns it. */
  createWallet(): Promise<{ address: string }>;
  /** Encrypts the recovery share to the user's own cloud account. */
  backup(method: BackupMethod): Promise<void>;
  /** Rebuilds device access on a new phone from the auth share plus the recovery share. */
  recover(method: BackupMethod): Promise<{ address: string }>;
  /** Signs and broadcasts on an allowed testnet only; returns the tx hash. */
  sendTestnet(tx: TestnetTx): Promise<string>;
}
