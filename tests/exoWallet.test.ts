// Run with: bun test tests/
import { describe, expect, it, mock } from "bun:test";

import { assertTestnet, mpcConfig } from "../src/wallet/mpc/config";
import { isAddress, toWei } from "../src/wallet/mpc/balance";
import { privyProvider, type PrivyLike } from "../src/wallet/mpc/privy";

const ADDR = "0x" + "a".repeat(40);
const fake = (chainHex = "0x14a34"): PrivyLike => ({
  isReady: true, authenticated: true, address: ADDR, needsRecovery: false, backupMethod: null, recoveryMethods: ["google-drive", "password"],
  create: mock(async () => ({ address: ADDR })), setRecovery: mock(async () => undefined), recover: mock(async () => ({ address: ADDR })),
  request: mock(async (a: { method: string }) => (a.method === "eth_chainId" ? chainHex : "0xhash")) as PrivyLike["request"],
  switchChain: mock(async () => undefined),
});

describe("web exo wallet", () => {
  it("is off unless flagged, App ID set and origin allowed", () => {
    expect(mpcConfig({}, "exosky-beta.vercel.app").configured).toBe(false);
    expect(mpcConfig({ VITE_MPC_WALLET: "1", VITE_PRIVY_APP_ID: "x" }, "exosky-beta.vercel.app").configured).toBe(true);
    expect(mpcConfig({ VITE_MPC_WALLET: "1", VITE_PRIVY_APP_ID: "x" }, "exosky-git-x.vercel.app").configured).toBe(false);
  });
  it("rejects mainnets and wrong chains before signing", async () => {
    expect(() => assertTestnet(8453)).toThrow(/testnet only/);
    expect(await privyProvider(fake()).sendTestnet({ chainId: 84532, to: ADDR, valueWei: 1n })).toBe("0xhash");
    await expect(privyProvider(fake("0x2105")).sendTestnet({ chainId: 84532, to: ADDR, valueWei: 1n })).rejects.toThrow(/testnet only/);
  });
  it("parses amounts exactly", () => {
    expect(toWei("0.01")).toBe(10n ** 16n);
    expect(isAddress(ADDR)).toBe(true);
  });
});
