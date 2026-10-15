// Read-only WalletConnect (free WalletConnect v2 Sign SDK). We only ask for the account address:
// no signing methods are requested and nothing is ever sent to the wallet for approval.
// Project id from EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID (eas.json / .env); falls back to ExoSky's
// public Reown client id (not a secret). Set the env var to an empty string to hide the feature.
import type SignClientType from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';

import { WEB_ORIGIN } from '@/lib/web';

const DEFAULT_WC_PROJECT_ID = '8154b4fad376bc9d84b585f171e8a782';
export const WC_PROJECT_ID = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? DEFAULT_WC_PROJECT_ID;
export const walletConnectEnabled = WC_PROJECT_ID.length > 0;

export const CHAINS: { id: string; name: string; symbol: string; rpc: string }[] = [
  { id: 'eip155:1', name: 'Ethereum', symbol: 'ETH', rpc: 'https://ethereum-rpc.publicnode.com' },
  { id: 'eip155:8453', name: 'Base', symbol: 'ETH', rpc: 'https://base-rpc.publicnode.com' },
  { id: 'eip155:42161', name: 'Arbitrum', symbol: 'ETH', rpc: 'https://arbitrum-one-rpc.publicnode.com' },
  { id: 'eip155:10', name: 'Optimism', symbol: 'ETH', rpc: 'https://optimism-rpc.publicnode.com' },
  { id: 'eip155:137', name: 'Polygon', symbol: 'POL', rpc: 'https://polygon-bor-rpc.publicnode.com' },
];

let clientPromise: Promise<SignClientType> | null = null;
export function getClient(): Promise<SignClientType> {
  if (!walletConnectEnabled) return Promise.reject(new Error('WalletConnect is not configured'));
  if (!clientPromise) {
    // Polyfills must load before the SDK; required lazily so the feature costs nothing when hidden.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@walletconnect/react-native-compat');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SignClient = require('@walletconnect/sign-client').default as typeof SignClientType;
    clientPromise = SignClient.init({
      projectId: WC_PROJECT_ID,
      metadata: { name: 'Ξ╳oSky', description: 'Ξ╳oSky', url: WEB_ORIGIN, icons: [`${WEB_ORIGIN}/favicon.ico`] },
    });
  }
  return clientPromise;
}

/** Read-only proposal: account access only, zero RPC methods. */
export const READ_ONLY_NAMESPACES = {
  eip155: { chains: CHAINS.map((c) => c.id), methods: [] as string[], events: ['accountsChanged', 'chainChanged'] },
};

export async function connect() {
  const client = await getClient();
  return client.connect({ optionalNamespaces: READ_ONLY_NAMESPACES });
}
export async function currentSession(): Promise<SessionTypes.Struct | null> {
  const client = await getClient();
  const all = client.session.getAll();
  return all.length ? all[all.length - 1] : null;
}
export async function disconnect(topic: string) {
  const client = await getClient();
  await client.disconnect({ topic, reason: { code: 6000, message: 'User disconnected' } });
}
export function sessionAddress(s: SessionTypes.Struct | null): string | null {
  const acct = s?.namespaces.eip155?.accounts?.[0];
  return acct ? acct.split(':')[2] ?? null : null;
}

/** Native balance via a free public JSON-RPC (eth_getBalance). Returns units, not wei. */
export async function getNativeBalance(rpc: string, address: string): Promise<number> {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (!json.result) throw new Error(json.error?.message || 'RPC error');
  return weiHexToUnits(json.result);
}
export function weiHexToUnits(hex: string): number {
  const wei = BigInt(hex);
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  return Number(whole) + Number(frac) / 1e18;
}
export const isEvmAddress = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a);
