import { getNativeBalance } from '@/lib/walletconnect';

import { TESTNETS, type Testnet } from './config';

export type TestnetBalance = { net: Testnet; amount: number | null };

/** Read-only balances on the allowed testnets (public RPCs, no keys involved). */
export async function testnetBalances(address: string, rpcGet = getNativeBalance): Promise<TestnetBalance[]> {
  return Promise.all(TESTNETS.map(async (net) => ({ net, amount: await rpcGet(net.rpc, address).catch(() => null) })));
}

export function isAddress(a: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(a.trim());
}

/** Parses a decimal ETH amount into wei without floating-point error. */
export function toWei(amount: string): bigint {
  const m = /^(\d+)(?:\.(\d{0,18}))?$/.exec(amount.trim());
  if (!m) throw new Error('Enter an amount like 0.01');
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? '').padEnd(18, '0') || '0');
}
