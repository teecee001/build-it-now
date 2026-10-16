// Hybrid MPC embedded wallet: Phase 1 is TESTNET ONLY and off by default.
// Turn on with EXPO_PUBLIC_MPC_WALLET=1 (eas.json env or .env). Provider IDs come from the Privy dashboard.

export type Testnet = { chainId: number; name: string; symbol: string; rpc: string; explorer: string };

/** The only networks the wallet may touch in Phase 1. Mainnet chain ids are rejected everywhere. */
export const TESTNETS: Testnet[] = [
  { chainId: 84532, name: 'Base Sepolia', symbol: 'ETH', rpc: 'https://sepolia.base.org', explorer: 'https://sepolia.basescan.org' },
  { chainId: 11155111, name: 'Sepolia', symbol: 'ETH', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.etherscan.io' },
];
export const DEFAULT_TESTNET = TESTNETS[0];

export function isTestnet(chainId: number) {
  return TESTNETS.some((t) => t.chainId === chainId);
}

/** Throws for any chain that is not an allowed testnet. Every send goes through this. */
export function assertTestnet(chainId: number): Testnet {
  const t = TESTNETS.find((n) => n.chainId === chainId);
  if (!t) throw new Error(`Chain ${chainId} is not allowed. Phase 1 is testnet only.`);
  return t;
}

export function mpcConfig(env: Record<string, string | undefined> = process.env) {
  const enabled = env.EXPO_PUBLIC_MPC_WALLET === '1';
  const privyAppId = env.EXPO_PUBLIC_PRIVY_APP_ID?.trim() || null;
  const privyClientId = env.EXPO_PUBLIC_PRIVY_CLIENT_ID?.trim() || null;
  return { enabled, privyAppId, privyClientId, configured: enabled && !!privyAppId && !!privyClientId };
}
