// Web Exo Wallet (Privy embedded wallet). Phase 1 is TESTNET ONLY and off by default.
// Turn on with VITE_MPC_WALLET=1. Mirrors mobile/src/wallet/mpc/config.ts.

export type Testnet = { chainId: number; name: string; symbol: string; rpc: string; explorer: string };

/** The only networks the wallet may touch in Phase 1. Mainnet chain ids are rejected everywhere. */
export const TESTNETS: Testnet[] = [
  { chainId: 84532, name: "Base Sepolia", symbol: "ETH", rpc: "https://sepolia.base.org", explorer: "https://sepolia.basescan.org" },
  { chainId: 11155111, name: "Sepolia", symbol: "ETH", rpc: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io" },
];
export const DEFAULT_TESTNET = TESTNETS[0];

export const isTestnet = (chainId: number) => TESTNETS.some((t) => t.chainId === chainId);

/** Throws for any chain that is not an allowed testnet. Every send goes through this. */
export function assertTestnet(chainId: number): Testnet {
  const t = TESTNETS.find((n) => n.chainId === chainId);
  if (!t) throw new Error(`Chain ${chainId} is not allowed. Phase 1 is testnet only.`);
  return t;
}

/** Privy only allows origins listed in its dashboard (exosky-beta.vercel.app). Vercel preview URLs are not listed. */
export const PRIVY_ALLOWED_HOSTS = ["exosky-beta.vercel.app", "localhost", "127.0.0.1"];

export function mpcConfig(env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>, host: string = typeof location !== "undefined" ? location.hostname : "") {
  const enabled = env.VITE_MPC_WALLET === "1";
  const privyAppId = env.VITE_PRIVY_APP_ID?.trim() || null;
  const originAllowed = PRIVY_ALLOWED_HOSTS.includes(host);
  return { enabled, privyAppId, originAllowed, configured: enabled && !!privyAppId && originAllowed };
}
