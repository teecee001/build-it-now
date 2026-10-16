import type { MpcWalletProvider, WalletState } from './types';

/** Used when the flag is off or provider IDs are missing: reports why, and refuses every action. */
export function unconfiguredProvider(state: WalletState): MpcWalletProvider {
  const refuse = async (): Promise<never> => {
    throw new Error(state.kind === 'disabled' ? 'The wallet is turned off.' : 'The wallet is not set up yet.');
  };
  return { name: 'none', state: async () => state, createWallet: refuse, backup: refuse, recover: refuse, sendTestnet: refuse };
}
