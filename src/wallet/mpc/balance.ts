import { TESTNETS, type Testnet } from "./config";

export type TestnetBalance = { net: Testnet; amount: number | null };

async function rpcBalance(rpc: string, address: string): Promise<number> {
  const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }) });
  const j = (await r.json()) as { result?: string };
  if (!j.result) throw new Error("rpc");
  return Number(BigInt(j.result)) / 1e18;
}

/** Read-only balances on the allowed testnets (public RPCs, no keys involved). */
export function testnetBalances(address: string, get = rpcBalance): Promise<TestnetBalance[]> {
  return Promise.all(TESTNETS.map(async (net) => ({ net, amount: await get(net.rpc, address).catch(() => null) })));
}

export const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a.trim());

/** Parses a decimal ETH amount into wei without floating-point error. */
export function toWei(amount: string): bigint {
  const m = /^(\d+)(?:\.(\d{0,18}))?$/.exec(amount.trim());
  if (!m) throw new Error("Enter an amount like 0.01");
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? "").padEnd(18, "0") || "0");
}
